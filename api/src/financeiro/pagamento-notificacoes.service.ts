import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { Identidade } from '../auth/auth.service.js';
import type { PagamentoSimulado, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type EtapaAviso = 'RETENCAO' | 'LIBERACAO';
const segundos = (valor: number) => new Date(Date.now() + valor * 1000);

export async function registrarAvisoPagamento(
  tx: Prisma.TransactionClient,
  pagamento: PagamentoSimulado,
  etapa: EtapaAviso,
) {
  const [contratos, dispositivos] = await Promise.all([
    tx.contratacao.findMany({
      where: {
        OR: [
          { id: pagamento.contratacaoId },
          { visitaId: pagamento.contratacaoId },
        ],
      },
      select: { nomeServico: true },
      orderBy: { id: 'asc' },
    }),
    tx.dispositivoPush.findMany({
      where: {
        sessao: {
          expiraEm: { gt: new Date() },
          usuario: { status: 'ATIVO', cuidador: { id: pagamento.cuidadorId } },
        },
      },
      select: { id: true },
    }),
  ]);
  await tx.avisoPagamento.create({
    data: {
      pagamentoId: pagamento.id,
      etapa,
      servicos: contratos.map(({ nomeServico }) => nomeServico),
      entregas: {
        create: dispositivos.map(({ id }) => ({ dispositivoId: id })),
      },
    },
  });
}

type RespostaExpo = {
  status: 'ok' | 'error';
  id?: string;
  details?: { error?: string };
};
const URL_PUSH = 'https://exp.host/--/api/v2/push';
const LIMITE_TENTATIVAS = 5;

@Injectable()
export class PagamentoNotificacoesService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PagamentoNotificacoesService.name);
  private timer?: ReturnType<typeof setInterval>;
  private emCurso?: Promise<void>;

  constructor(private readonly db: PrismaService) {}

  onModuleInit() {
    if (process.env.EXPO_PUSH_ATIVO !== '1') return;
    this.timer = setInterval(() => {
      if (this.emCurso) return;
      this.emCurso = this.processar()
        .catch(() => {
          this.logger.warn(
            'Falha ao processar a fila de notificações de pagamento.',
          );
        })
        .finally(() => {
          this.emCurso = undefined;
        });
    }, 5000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.emCurso;
  }

  private cuidador(u: Identidade) {
    if (!u.cuidadorId || u.tipoUsuario !== 'CUIDADOR')
      throw new ForbiddenException();
    return u.cuidadorId;
  }

  async listar(u: Identidade) {
    const avisos = await this.db.avisoPagamento.findMany({
      where: { pagamento: { cuidadorId: this.cuidador(u) } },
      orderBy: { id: 'desc' },
      take: 100,
      select: {
        id: true,
        etapa: true,
        servicos: true,
        criadoEm: true,
        lidoEm: true,
        pagamento: { select: { contratacaoId: true } },
      },
    });
    return avisos.map(({ pagamento, ...aviso }) => ({
      ...aviso,
      contratacaoId: pagamento.contratacaoId,
    }));
  }

  async ler(u: Identidade, id: number) {
    const where = { id, pagamento: { cuidadorId: this.cuidador(u) } };
    const aviso = await this.db.avisoPagamento.findFirst({
      where,
      select: { pagamento: { select: { contratacaoId: true } } },
    });
    if (!aviso) throw new NotFoundException('Aviso não encontrado.');
    await this.db.avisoPagamento.updateMany({
      where: { ...where, lidoEm: null },
      data: { lidoEm: new Date() },
    });
    return { contratacaoId: aviso.pagamento.contratacaoId };
  }

  async estadoDispositivo(u: Identidade) {
    this.cuidador(u);
    return {
      ativo: !!(await this.db.dispositivoPush.findFirst({
        where: { sessaoId: u.sessaoId },
        select: { id: true },
      })),
    };
  }

  async ativar(u: Identidade, token: string) {
    this.cuidador(u);
    if (process.env.EXPO_PUSH_ATIVO !== '1') {
      throw new ForbiddenException(
        'As notificações no aparelho ainda não estão disponíveis neste ambiente.',
      );
    }
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${token}))::text`;
      await tx.dispositivoPush.deleteMany({
        where: { token, sessaoId: { not: u.sessaoId } },
      });
      await tx.dispositivoPush.upsert({
        where: { token },
        update: {},
        create: { token, sessaoId: u.sessaoId },
      });
    });
    return { ativo: true };
  }

  async desativar(u: Identidade) {
    this.cuidador(u);
    await this.db.dispositivoPush.deleteMany({
      where: { sessaoId: u.sessaoId },
    });
    return { ativo: false };
  }

  private async pedirExpo<T>(rota: string, dados: object) {
    const token = process.env.EXPO_PUSH_ACCESS_TOKEN;
    const resposta = await fetch(URL_PUSH + rota, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(dados),
      signal: AbortSignal.timeout(6000),
    });
    if (!resposta.ok) throw new Error('Expo indisponível');
    return ((await resposta.json()) as { data?: T }).data;
  }

  private async processar() {
    const candidatas = await this.db.entregaPush.findMany({
      where: { encerrada: false, proximaEm: { lte: new Date() } },
      orderBy: { proximaEm: 'asc' },
      take: 10,
      select: {
        id: true,
        avisoId: true,
        ticket: true,
        tentativas: true,
        proximaEm: true,
        aviso: { select: { criadoEm: true } },
        dispositivo: {
          select: {
            id: true,
            token: true,
            sessao: {
              select: {
                expiraEm: true,
                usuario: { select: { status: true } },
              },
            },
          },
        },
      },
    });
    await Promise.all(
      candidatas.map(async (entrega) => {
        const { id, dispositivo, ticket, avisoId, aviso, tentativas } = entrega;
        const alterar = (data: Prisma.EntregaPushUpdateManyMutationInput) =>
          this.db.entregaPush.updateMany({ where: { id }, data });
        const claim = await this.db.entregaPush.updateMany({
          where: { id, encerrada: false, proximaEm: entrega.proximaEm },
          data: { proximaEm: segundos(120) },
        });
        if (!claim.count) return;
        if (
          dispositivo.sessao.expiraEm <= new Date() ||
          dispositivo.sessao.usuario.status !== 'ATIVO' ||
          Date.now() - aviso.criadoEm.getTime() >= 24 * 3600_000
        ) {
          await alterar({ encerrada: true });
          return;
        }
        let resultado: RespostaExpo | undefined;
        try {
          if (ticket) {
            const recibos = await this.pedirExpo<Record<string, RespostaExpo>>(
              '/getReceipts',
              { ids: [ticket] },
            );
            resultado = recibos?.[ticket];
          } else {
            const tickets = await this.pedirExpo<RespostaExpo[]>('/send', [
              {
                to: dispositivo.token,
                title: 'Laço',
                body: 'Você tem uma atualização de pagamento.',
                channelId: 'pagamentos',
                data: { tipo: 'pagamento', avisoId },
                ttl: 86400,
              },
            ]);
            resultado = tickets?.[0];
          }
        } catch {
          // O aviso continua disponível no sino enquanto o envio é tentado novamente.
        }
        const erro = resultado?.details?.error;
        if (erro === 'DeviceNotRegistered') {
          await this.db.dispositivoPush.deleteMany({
            where: { id: dispositivo.id },
          });
        } else if (resultado?.status === 'ok' && ticket) {
          await alterar({ encerrada: true });
        } else if (resultado?.status === 'ok' && resultado.id) {
          await alterar({
            ticket: resultado.id,
            proximaEm: segundos(900),
            tentativas: 0,
          });
        } else {
          await alterar({
            ticket: erro === 'MessageRateExceeded' ? null : ticket,
            tentativas: tentativas + 1,
            encerrada:
              tentativas + 1 >= LIMITE_TENTATIVAS ||
              !!(erro && erro !== 'MessageRateExceeded'),
            proximaEm: segundos(ticket ? 900 : 30 * 2 ** tentativas),
          });
        }
      }),
    );
  }
}
