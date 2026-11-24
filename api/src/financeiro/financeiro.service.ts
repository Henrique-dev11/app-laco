import { randomInt, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import QRCode from 'qrcode';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type MetodoFinanceiro,
  type PagamentoSimulado,
} from '../generated/prisma/client.js';
import { registrarAvisoPagamento } from './pagamento-notificacoes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Identidade } from '../auth/auth.service.js';

type Tx = Prisma.TransactionClient;
type Etapa = 'INICIO' | 'FIM';
const dinheiro = (valor: Prisma.Decimal) => valor.toFixed(2);
const zero = new Prisma.Decimal(0);
export function financeiroAtivo() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.FINANCEIRO_SIMULADO === '1'
  );
}
const participantes = (u: Identidade, responsavel: number, cuidador: number) =>
  u.responsavelId === responsavel || u.cuidadorId === cuidador;
const admin = (u: Identidade) =>
  ['ADMIN', 'SUPER_ADMIN'].includes(u.tipoUsuario);
const erroEstado = () =>
  new ConflictException('Esta ação não está disponível na etapa atual.');
const movimentoSelect = {
  id: true,
  tipo: true,
  metodo: true,
  status: true,
  valor: true,
  descricao: true,
  createdAt: true,
  pagamentoId: true,
  adminId: true,
} as const;
const pagamentoSelect = {
  id: true,
  contratacaoId: true,
  metodo: true,
  status: true,
  bruto: true,
  comissao: true,
  liquido: true,
  inicioEm: true,
  validacaoEm: true,
  fimEm: true,
  motivoContestacao: true,
  motivoResolucao: true,
  resolvidoPorId: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class FinanceiroService {
  constructor(private readonly db: PrismaService) {}

  private async visita(tx: Tx, id: number, u: Identidade, travar = false) {
    const base = await tx.contratacao.findUnique({
      where: { id },
      select: { id: true, visitaId: true },
    });
    if (!base) throw new NotFoundException('Atendimento não encontrado.');
    const chave = base.visitaId ?? base.id;
    if (travar)
      await tx.$queryRaw`SELECT id FROM "Contratacao" WHERE id = ${chave} FOR UPDATE`;
    const principal = await tx.contratacao.findUniqueOrThrow({
      where: { id: chave },
      include: { cuidadorServico: { select: { cuidadorId: true } } },
    });
    const cuidadorId = principal.cuidadorServico.cuidadorId;
    if (!participantes(u, principal.responsavelId, cuidadorId) && !admin(u))
      throw new ForbiddenException(
        'Atendimento disponível apenas aos participantes.',
      );
    if (!principal.financeiroSimulado)
      throw new NotFoundException('Atendimento sem pagamento simulado.');
    if (!financeiroAtivo())
      throw new ForbiddenException(
        'Financeiro acadêmico desativado neste ambiente.',
      );
    const escopo = principal.visitaId ? { visitaId: chave } : { id: chave };
    const contratos = await tx.contratacao.findMany({
      where: escopo,
      select: {
        id: true,
        nomeServico: true,
        valorAcordado: true,
        duracaoMinutos: true,
        itemPropostaId: true,
        agendamento: { select: { inicio: true, fim: true, ativo: true } },
      },
      orderBy: { id: 'asc' },
    });
    const bruto = contratos.reduce(
      (total, c) => total.plus(c.valorAcordado),
      zero,
    );
    return { principal, cuidadorId, escopo, contratos, bruto };
  }

  async resumo(id: number, u: Identidade) {
    const v = await this.visita(this.db, id, u);
    const pagamento = await this.db.pagamentoSimulado.findUnique({
      where: { contratacaoId: v.principal.id },
      select: {
        ...pagamentoSelect,
        movimentos: { select: movimentoSelect, orderBy: { createdAt: 'asc' } },
      },
    });
    const agendado = v.contratos.every((c) => c.agendamento?.ativo);
    const status = v.principal.status;
    const podeAvaliar =
      status === 'CONCLUIDA' &&
      participantes(u, v.principal.responsavelId, v.cuidadorId);
    const [avaliacao, avaliado] = podeAvaliar
      ? u.cuidadorId === v.cuidadorId
        ? await Promise.all([
            this.db.avaliacaoResponsavel.findUnique({
              where: { contratacaoId: v.principal.id },
              select: { nota: true },
            }),
            this.db.usuario.findFirst({
              where: { responsavel: { id: v.principal.responsavelId } },
              select: { nome: true, nomeSocial: true },
            }),
          ])
        : await Promise.all([
            this.db.avaliacao.findUnique({
              where: { contratacaoId: v.principal.id },
              select: { nota: true },
            }),
            this.db.usuario.findFirst({
              where: { cuidador: { id: v.cuidadorId } },
              select: { nome: true, nomeSocial: true },
            }),
          ])
      : [null, null];
    const etapa =
      status === 'CONCLUIDA'
        ? 'CONCLUIDO'
        : status === 'RECUSADA'
          ? 'RECUSADO'
          : status === 'CANCELADA'
            ? 'CANCELADO'
            : status === 'SOLICITADA'
              ? 'PENDENTE'
              : pagamento?.status === 'EM_CONTESTACAO'
                ? 'EM_CONTESTACAO'
                : pagamento?.validacaoEm
                  ? 'AGUARDANDO_VALIDACAO'
                  : pagamento?.inicioEm
                    ? 'EM_ANDAMENTO'
                    : pagamento?.status === 'RETIDO' && agendado
                      ? 'AGENDADO'
                      : pagamento?.status === 'RETIDO'
                        ? 'ACEITO'
                        : 'AGUARDANDO_PAGAMENTO';
    return {
      id: v.principal.id,
      etapa,
      agendado,
      origemProposta: v.contratos.some((c) => c.itemPropostaId !== null),
      avaliacao,
      avaliadoNome: avaliado?.nomeSocial || avaliado?.nome || null,
      total: dinheiro(v.bruto),
      pagamento,
      contratos: v.contratos,
    };
  }

  async qr(id: number, u: Identidade) {
    const v = await this.db.$transaction(async (tx) => {
      const visita = await this.visita(tx, id, u, true);
      if (u.responsavelId !== visita.principal.responsavelId)
        throw new ForbiddenException();
      const p = await this.pagamentoPendente(tx, visita);
      if (p.status !== 'PENDENTE') throw erroEstado();
      return visita;
    });
    const payload = `LACO-TCC-SIMULACAO|VISITA:${v.principal.id}|BRL:${dinheiro(v.bruto)}`;
    return { imagem: await QRCode.toDataURL(payload), referencia: payload };
  }

  private async movimento(
    tx: Tx,
    p: PagamentoSimulado,
    tipo: 'RETENCAO' | 'LIBERACAO' | 'REEMBOLSO',
    adminId?: number,
    motivo?: string,
  ) {
    const descricao = {
      RETENCAO: 'Pagamento fictício retido',
      LIBERACAO: 'Crédito fictício liberado na carteira',
      REEMBOLSO: 'Reembolso fictício ao responsável',
    }[tipo];
    await tx.movimentoSimulado.create({
      data: {
        cuidadorId: p.cuidadorId,
        pagamentoId: p.id,
        chave: `${p.id}:${tipo}`,
        tipo,
        metodo: p.metodo,
        valor: tipo === 'LIBERACAO' ? p.liquido : p.bruto,
        descricao: motivo ? `${descricao}. ${motivo}` : descricao,
        adminId,
      },
    });
    if (tipo !== 'REEMBOLSO') await registrarAvisoPagamento(tx, p, tipo);
  }

  private async pagamentoPendente(
    tx: Tx,
    v: Awaited<ReturnType<FinanceiroService['visita']>>,
  ) {
    const existente = await tx.pagamentoSimulado.findUnique({
      where: { contratacaoId: v.principal.id },
    });
    if (existente) return existente;
    if (v.principal.status !== 'ACEITA' || !v.bruto.gt(0)) throw erroEstado();
    const pontos = Number(process.env.FINANCEIRO_COMISSAO_PONTOS ?? '1000');
    if (!Number.isInteger(pontos) || pontos < 0 || pontos > 10000)
      throw new BadRequestException('Comissão do ambiente inválida.');
    const comissao = v.bruto
      .times(pontos)
      .div(10000)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return tx.pagamentoSimulado.create({
      data: {
        contratacaoId: v.principal.id,
        cuidadorId: v.cuidadorId,
        bruto: v.bruto,
        comissao,
        liquido: v.bruto.minus(comissao),
      },
    });
  }

  async pagar(id: number, u: Identidade, metodo: 'PIX' | 'CARTAO' = 'PIX') {
    return this.db.$transaction(async (tx) => {
      const v = await this.visita(tx, id, u, true);
      if (u.responsavelId !== v.principal.responsavelId)
        throw new ForbiddenException();
      const atual = await this.pagamentoPendente(tx, v);
      if (['RETIDO', 'LIBERADO'].includes(atual.status))
        return tx.pagamentoSimulado.findUniqueOrThrow({
          where: { id: atual.id },
          select: pagamentoSelect,
        });
      if (atual.status !== 'PENDENTE' || v.principal.status !== 'ACEITA')
        throw erroEstado();
      const p = await tx.pagamentoSimulado.update({
        where: { id: atual.id },
        data: { status: 'RETIDO', metodo },
      });
      await this.movimento(tx, p, 'RETENCAO');
      return tx.pagamentoSimulado.findUniqueOrThrow({
        where: { id: p.id },
        select: pagamentoSelect,
      });
    });
  }

  private async codigoEstado(
    tx: Tx,
    id: number,
    u: Identidade,
    etapa: Etapa,
    gerar: boolean,
  ) {
    const v = await this.visita(tx, id, u, true);
    if (
      gerar
        ? u.responsavelId !== v.principal.responsavelId
        : u.cuidadorId !== v.cuidadorId
    )
      throw new ForbiddenException('Ação exclusiva do participante indicado.');
    const p = await tx.pagamentoSimulado.findUnique({
      where: { contratacaoId: v.principal.id },
    });
    if (
      v.principal.status !== 'ACEITA' ||
      p?.status !== 'RETIDO' ||
      (etapa === 'INICIO'
        ? p.inicioEm || !v.contratos.every((c) => c.agendamento?.ativo)
        : !p.validacaoEm || p.fimEm)
    )
      throw erroEstado();
    return { p, v };
  }

  async gerar(id: number, u: Identidade, etapa: Etapa) {
    return this.db.$transaction(async (tx) => {
      const { p } = await this.codigoEstado(tx, id, u, etapa, true);
      const chave = { pagamentoId: p.id, etapa };
      const anterior = await tx.codigoAtendimento.findUnique({
        where: { pagamentoId_etapa: chave },
      });
      if (
        anterior &&
        (anterior.usadoEm || Date.now() - anterior.emitidoEm.getTime() < 30000)
      )
        throw new ConflictException(
          'Aguarde 30 segundos para emitir outro código.',
        );
      const codigo =
        (etapa === 'INICIO' ? 'I' : 'F') + String(randomInt(100000, 1000000));
      const data = {
        hash: await bcrypt.hash(codigo, 10),
        emitidoEm: new Date(),
        expiraEm: new Date(Date.now() + 15 * 60000),
        tentativas: 0,
      };
      await tx.codigoAtendimento.upsert({
        where: { pagamentoId_etapa: chave },
        create: { ...chave, ...data },
        update: data,
      });
      return { codigo, expiraEm: data.expiraEm };
    });
  }

  async validar(id: number, u: Identidade, etapa: Etapa, codigo: string) {
    const resultado = await this.db.$transaction(async (tx) => {
      const { p, v } = await this.codigoEstado(tx, id, u, etapa, false);
      const registro = await tx.codigoAtendimento.findUnique({
        where: { pagamentoId_etapa: { pagamentoId: p.id, etapa } },
      });
      if (
        !registro ||
        registro.usadoEm ||
        registro.expiraEm <= new Date() ||
        registro.tentativas >= 5
      )
        return {
          erro: 'Código indisponível, expirado ou bloqueado. Peça um novo código.',
        };
      if (!(await bcrypt.compare(codigo, registro.hash))) {
        await tx.codigoAtendimento.update({
          where: { id: registro.id },
          data: { tentativas: { increment: 1 } },
        });
        return { erro: 'Código incorreto.' };
      }
      const agora = new Date();
      await tx.codigoAtendimento.update({
        where: { id: registro.id },
        data: { usadoEm: agora },
      });
      if (etapa === 'INICIO') {
        await tx.pagamentoSimulado.update({
          where: { id: p.id },
          data: { inicioEm: agora },
        });
      } else {
        await this.liberar(tx, p, v.escopo);
      }
      return { ok: true };
    });
    if (resultado.erro) throw new BadRequestException(resultado.erro);
    return this.resumo(id, u);
  }

  private async travarCarteira(tx: Tx, cuidadorId: number) {
    await tx.$queryRaw`SELECT id FROM "Cuidador" WHERE id = ${cuidadorId} FOR UPDATE`;
  }

  private async liberar(
    tx: Tx,
    p: PagamentoSimulado,
    escopo: Prisma.ContratacaoWhereInput,
    adminId?: number,
    motivo?: string,
  ) {
    await this.travarCarteira(tx, p.cuidadorId);
    await tx.contratacao.updateMany({
      where: { ...escopo, status: 'ACEITA' },
      data: { status: 'CONCLUIDA' },
    });
    await tx.pagamentoSimulado.update({
      where: { id: p.id },
      data: {
        status: 'LIBERADO',
        fimEm: new Date(),
        ...(adminId && { resolvidoPorId: adminId, motivoResolucao: motivo }),
      },
    });
    await this.movimento(tx, p, 'LIBERACAO', adminId, motivo);
  }

  async acao(
    id: number,
    u: Identidade,
    acao: 'FINALIZAR' | 'CANCELAR' | 'CONTESTAR' | 'REEMBOLSAR' | 'LIBERAR',
    motivo?: string,
  ) {
    await this.db.$transaction(async (tx) => {
      const v = await this.visita(tx, id, u, true);
      const p = await tx.pagamentoSimulado.findUnique({
        where: { contratacaoId: v.principal.id },
      });
      const responsavel = u.responsavelId === v.principal.responsavelId;
      const cuidador = u.cuidadorId === v.cuidadorId;
      if (acao === 'LIBERAR' || acao === 'REEMBOLSAR') {
        if (!admin(u)) throw new ForbiddenException();
        if (!motivo?.trim())
          throw new BadRequestException(
            'Informe a justificativa da resolução.',
          );
        if (
          !p ||
          !['RETIDO', 'EM_CONTESTACAO'].includes(p.status) ||
          v.principal.status !== 'ACEITA'
        )
          throw erroEstado();
        if (acao === 'LIBERAR') {
          if (p.status !== 'EM_CONTESTACAO') throw erroEstado();
          await this.liberar(tx, p, v.escopo, u.id, motivo);
          return;
        }
      } else if (!responsavel && !cuidador) throw new ForbiddenException();
      if (acao === 'FINALIZAR') {
        if (!cuidador) throw new ForbiddenException();
        if (p?.status !== 'RETIDO' || !p.inicioEm || p.fimEm)
          throw erroEstado();
        if (!p.validacaoEm)
          await tx.pagamentoSimulado.update({
            where: { id: p.id },
            data: { validacaoEm: new Date() },
          });
        return;
      }
      if (acao === 'CONTESTAR') {
        if (!motivo?.trim())
          throw new BadRequestException('Descreva o motivo da contestação.');
        if (p?.status !== 'RETIDO') throw erroEstado();
        await tx.pagamentoSimulado.update({
          where: { id: p.id },
          data: {
            status: 'EM_CONTESTACAO',
            motivoContestacao: motivo,
            contestadoPorId: u.id,
          },
        });
        return;
      }
      if (acao === 'CANCELAR' && v.principal.status === 'CANCELADA') return;
      if (!['ACEITA', 'SOLICITADA'].includes(v.principal.status))
        throw erroEstado();
      if (
        acao === 'CANCELAR' &&
        p &&
        (!['PENDENTE', 'RETIDO'].includes(p.status) || p.inicioEm)
      )
        throw erroEstado();
      await tx.contratacao.updateMany({
        where: v.escopo,
        data: { status: 'CANCELADA' },
      });
      await tx.agendamento.updateMany({
        where: { contratacao: v.escopo },
        data: { ativo: false },
      });
      if (p?.status === 'PENDENTE') {
        await tx.pagamentoSimulado.update({
          where: { id: p.id },
          data: { status: 'CANCELADO' },
        });
      } else if (p) {
        const administrador = acao === 'REEMBOLSAR' ? u.id : undefined;
        await tx.pagamentoSimulado.update({
          where: { id: p.id },
          data: {
            status: 'REEMBOLSADO',
            motivoResolucao: motivo,
            resolvidoPorId: administrador,
          },
        });
        await this.movimento(tx, p, 'REEMBOLSO', administrador, motivo);
      }
    });
    return this.resumo(id, u);
  }

  private async totaisCarteira(tx: Tx, cuidadorId: number) {
    const grupos = await tx.movimentoSimulado.groupBy({
      by: ['tipo'],
      where: { cuidadorId, tipo: { in: ['SAQUE', 'LIBERACAO'] } },
      _sum: { valor: true },
    });
    const recebido =
      grupos.find((g) => g.tipo === 'LIBERACAO')?._sum.valor ?? zero;
    const sacado = grupos.find((g) => g.tipo === 'SAQUE')?._sum.valor ?? zero;
    return { recebido, sacado, disponivel: recebido.minus(sacado) };
  }

  async carteira(u: Identidade, periodo = '30') {
    if (!['7', '30', '90'].includes(periodo))
      throw new BadRequestException('Use 7, 30 ou 90 dias.');
    const dias = Number(periodo);
    if (!u.cuidadorId || !financeiroAtivo()) throw new ForbiddenException();
    return this.db.$transaction(
      async (tx) => {
        const s = await this.totaisCarteira(tx, u.cuidadorId!);
        const pendente = await tx.pagamentoSimulado.aggregate({
          where: {
            cuidadorId: u.cuidadorId!,
            status: { in: ['RETIDO', 'EM_CONTESTACAO'] },
          },
          _sum: { liquido: true },
        });
        const movimentos = await tx.movimentoSimulado.findMany({
          where: { cuidadorId: u.cuidadorId! },
          select: movimentoSelect,
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
        const liberacoes = await tx.$queryRaw<{ dia: string; valor: string }[]>`
          WITH limite AS (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje),
          dias AS (
            SELECT generate_series(hoje - (${dias}::int - 1), hoje, interval '1 day')::date AS dia FROM limite
          ), totais AS (
            SELECT ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date AS dia, sum(valor) AS valor
            FROM "MovimentoSimulado", limite
            WHERE "cuidadorId" = ${u.cuidadorId} AND tipo = 'LIBERACAO'
              AND "createdAt" >= ((hoje - (${dias}::int - 1))::timestamp AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'UTC'
            GROUP BY 1
          )
          SELECT to_char(dias.dia, 'YYYY-MM-DD') AS dia, coalesce(totais.valor, 0)::numeric(20,2)::text AS valor
          FROM dias LEFT JOIN totais USING (dia) ORDER BY dias.dia`;
        return {
          ...s,
          pendente: pendente._sum.liquido ?? zero,
          movimentos,
          liberacoes,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async sacar(
    u: Identidade,
    valor: string,
    referencia: string,
    metodo: MetodoFinanceiro = 'PIX',
  ) {
    if (!u.cuidadorId || !financeiroAtivo()) throw new ForbiddenException();
    const cuidadorId = u.cuidadorId;
    const quantia = new Prisma.Decimal(valor.replace(',', '.'));
    if (!quantia.gt(0))
      throw new BadRequestException('Informe um valor maior que zero.');
    return this.db.$transaction(async (tx) => {
      await this.travarCarteira(tx, cuidadorId);
      const chave = `saque:${cuidadorId}:${referencia}`;
      const existente = await tx.movimentoSimulado.findUnique({
        where: { chave },
        select: movimentoSelect,
      });
      if (existente) {
        if (!existente.valor.equals(quantia) || existente.metodo !== metodo)
          throw erroEstado();
        return existente;
      }
      const { disponivel } = await this.totaisCarteira(tx, cuidadorId);
      if (disponivel.lt(quantia))
        throw new ConflictException('Saldo disponível insuficiente.');
      return tx.movimentoSimulado.create({
        data: {
          cuidadorId,
          chave,
          tipo: 'SAQUE',
          metodo,
          valor: quantia,
          descricao: 'Saque virtual concluído',
        },
        select: movimentoSelect,
      });
    });
  }

  async historico(u: Identidade) {
    if (!financeiroAtivo()) return [];
    if (!admin(u) && !u.responsavelId && !u.cuidadorId)
      throw new ForbiddenException();
    return this.db.pagamentoSimulado.findMany({
      where: admin(u)
        ? {}
        : u.responsavelId
          ? { contratacao: { responsavelId: u.responsavelId } }
          : { cuidadorId: u.cuidadorId! },
      select: {
        ...pagamentoSelect,
        contratacao: { select: { nomeServico: true } },
        movimentos: { select: movimentoSelect, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async movimentosAdministrativos(u: Identidade) {
    if (!admin(u) || !financeiroAtivo()) throw new ForbiddenException();
    return this.db.movimentoSimulado.findMany({
      select: { ...movimentoSelect, cuidadorId: true },
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  novaReferenciaSaque(u: Identidade) {
    if (!u.cuidadorId || !financeiroAtivo()) throw new ForbiddenException();
    return { referencia: randomUUID() };
  }
}
