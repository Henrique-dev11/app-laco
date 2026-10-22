import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { Identidade } from '../auth/auth.service.js';
import { MensagemService } from '../mensagem/mensagem.service.js';
import { ContratacaoService } from '../contratacao/contratacao.service.js';
import {
  consultarAgenda,
  validarJanela,
  validarMesAgenda,
} from '../contratacao/agenda-disponivel.js';
import { FUSO, partesLocais } from '../contratacao/horarios.js';
import type { CriarPropostaDto, RespostaPropostaDto } from './proposta.dto.js';

export const propostaInclude = {
  idoso: { select: { id: true, nome: true } },
  cuidador: { select: { usuario: { select: { nome: true } } } },
  itens: {
    orderBy: { id: 'asc' as const },
    include: {
      contratacoes: {
        select: {
          id: true,
          status: true,
          agendamento: { select: { inicio: true, fim: true, ativo: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class PropostaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mensagens: MensagemService,
    private readonly contratacoes: ContratacaoService,
  ) {}

  private async partes(
    outroId: number,
    u: Identidade,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    await this.mensagens.exigirContato(u.id, outroId, db);
    const [cuidador, responsavel] = await Promise.all([
      db.cuidador.findFirst({
        where: { usuarioId: u.cuidadorId ? u.id : outroId },
      }),
      db.responsavel.findFirst({
        where: { usuarioId: u.responsavelId ? u.id : outroId },
      }),
    ]);
    if (
      !cuidador ||
      !responsavel ||
      !['RESPONSAVEL', 'CUIDADOR'].includes(u.tipoUsuario)
    )
      throw new ForbiddenException('Conversa inválida para propostas.');
    return {
      cuidadorId: cuidador.id,
      responsavelId: responsavel.id,
      cuidadorUsuarioId: cuidador.usuarioId,
      responsavelUsuarioId: responsavel.usuarioId,
    };
  }
  async contexto(outroId: number, u: Identidade) {
    const p = await this.partes(outroId, u);
    const [idosos, ofertas, contratacoes] = await Promise.all([
      this.prisma.responsavelIdoso.findMany({
        where: { responsavelId: p.responsavelId },
        select: {
          idoso: { select: { id: true, nome: true, nomeSocial: true } },
        },
      }),
      this.prisma.cuidadorServico.findMany({
        where: {
          cuidadorId: p.cuidadorId,
          ativo: true,
          servico: { ativo: true },
        },
        select: {
          id: true,
          preco: true,
          duracaoMinutos: true,
          servico: { select: { nome: true } },
        },
      }),
      this.prisma.contratacao.findMany({
        where: {
          responsavelId: p.responsavelId,
          cuidadorServico: { cuidadorId: p.cuidadorId },
          status: { in: ['SOLICITADA', 'ACEITA'] },
          agendamento: null,
          itemPropostaId: null,
        },
        select: {
          id: true,
          idosoId: true,
          cuidadorServicoId: true,
          status: true,
        },
      }),
    ]);
    return { idosos: idosos.map((v) => v.idoso), ofertas, contratacoes };
  }
  async listar(outroId: number, u: Identidade) {
    const p = await this.partes(outroId, u);
    return this.prisma.propostaAtendimento.findMany({
      where: { responsavelId: p.responsavelId, cuidadorId: p.cuidadorId },
      orderBy: { id: 'asc' },
      include: propostaInclude,
    });
  }
  async horarios(outroId: number, mes: string, duracao: number, u: Identidade) {
    const p = await this.partes(outroId, u);
    return {
      fuso: FUSO,
      datas: await consultarAgenda(this.prisma, p.cuidadorId, mes, duracao),
    };
  }
  private async vinculo(
    db: Prisma.TransactionClient,
    responsavelId: number,
    idosoId: number,
  ) {
    const vinculo = await db.$queryRaw<
      { id: number }[]
    >`SELECT id FROM "ResponsavelIdoso" WHERE "responsavelId" = ${responsavelId} AND "idosoId" = ${idosoId} FOR KEY SHARE`;
    if (!vinculo.length)
      throw new ForbiddenException(
        'O responsável não está vinculado ao idoso.',
      );
  }

  private async origens(
    db: Prisma.TransactionClient,
    itens: { contratacaoOrigemId?: number | null; cuidadorServicoId: number }[],
    responsavelId: number,
    idosoId: number,
  ) {
    const ids = itens.flatMap((i) =>
      i.contratacaoOrigemId ? [i.contratacaoOrigemId] : [],
    );
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException(
        'A mesma contratação não pode ser vinculada a dois itens.',
      );
    for (const item of itens)
      if (item.contratacaoOrigemId) {
        const contrato = await db.contratacao.findFirst({
          where: {
            id: item.contratacaoOrigemId,
            responsavelId,
            idosoId,
            cuidadorServicoId: item.cuidadorServicoId,
            status: { in: ['SOLICITADA', 'ACEITA'] },
            agendamento: null,
            itemPropostaId: null,
          },
        });
        if (!contrato)
          throw new ConflictException(
            'A contratação vinculada mudou, foi agendada ou não corresponde ao item. Revise a proposta.',
          );
      }
  }
  private async datas(
    db: Prisma.TransactionClient,
    cuidadorId: number,
    itens: { duracaoMinutos: number; inicios: (Date | string)[] }[],
  ) {
    const janelas: { inicio: Date; fim: Date }[] = [];
    for (const item of itens)
      for (const d of item.inicios) {
        const inicio = new Date(d);
        if (!Number.isFinite(inicio.getTime()))
          throw new BadRequestException('Data inválida.');
        validarMesAgenda(partesLocais(inicio).data.slice(0, 7));
        const fim = await validarJanela(
          db,
          cuidadorId,
          inicio,
          item.duracaoMinutos,
        );
        if (janelas.some((j) => inicio < j.fim && fim > j.inicio))
          throw new ConflictException(
            'Há atendimentos sobrepostos na proposta.',
          );
        janelas.push({ inicio, fim });
      }
  }
  private async disponivel(db: Prisma.TransactionClient, cuidadorId: number) {
    if (
      !(await db.cuidador.findFirst({
        where: {
          id: cuidadorId,
          statusVerificacao: 'APROVADO',
          usuario: { status: 'ATIVO' },
        },
      }))
    )
      throw new ConflictException('Cuidador indisponível.');
  }
  async criar(outroId: number, dto: CriarPropostaDto, u: Identidade) {
    if (!u.cuidadorId)
      throw new ForbiddenException('Somente o cuidador pode criar propostas.');
    return this.prisma.$transaction(
      async (tx) => {
        // Serializa emissão de versões e aceite com a disponibilidade do cuidador.
        await tx.$queryRaw`SELECT id FROM "Cuidador" WHERE id = ${u.cuidadorId} FOR UPDATE`;
        const p = await this.partes(outroId, u, tx);
        await this.vinculo(tx, p.responsavelId, dto.idosoId);
        await this.disponivel(tx, p.cuidadorId);
        let anterior: Awaited<
          ReturnType<typeof tx.propostaAtendimento.findFirst>
        > = null;
        if (dto.anteriorId) {
          anterior = await tx.propostaAtendimento.findFirst({
            where: {
              id: dto.anteriorId,
              responsavelId: p.responsavelId,
              cuidadorId: p.cuidadorId,
            },
          });
          if (!anterior)
            throw new NotFoundException('Proposta anterior não encontrada.');
          if (anterior.idosoId !== dto.idosoId)
            throw new BadRequestException(
              'Uma revisão deve manter o mesmo idoso.',
            );
          const ultima = await tx.propostaAtendimento.findFirst({
            where: { negociacaoId: anterior.negociacaoId },
            orderBy: { versao: 'desc' },
          });
          if (ultima?.id !== anterior.id || anterior.status === 'ACEITA')
            throw new ConflictException(
              'Revise a versão mais recente. Propostas aceitas não podem ser alteradas.',
            );
        }
        await this.origens(tx, dto.itens, p.responsavelId, dto.idosoId);
        if (dto.itens.reduce((n, i) => n + i.inicios.length, 0) > 60)
          throw new BadRequestException(
            'Limite de 60 atendimentos por proposta.',
          );
        const itens = await Promise.all(
          dto.itens.map(async (i) => {
            const oferta = await tx.cuidadorServico.findFirst({
              where: {
                id: i.cuidadorServicoId,
                cuidadorId: p.cuidadorId,
                ativo: true,
                servico: { ativo: true },
              },
              include: { servico: true },
            });
            if (!oferta)
              throw new BadRequestException(
                'Serviço indisponível ou não pertence ao cuidador.',
              );
            const preco = new Prisma.Decimal(i.preco);
            if (preco.lte(0))
              throw new BadRequestException('O preço deve ser positivo.');
            return {
              ...i,
              preco,
              precoReferencia: oferta.preco,
              nomeServico: oferta.servico.nome,
              inicios: i.inicios.map((d) => new Date(d)),
            };
          }),
        );
        const total = itens.reduce(
          (n, i) => n.add(i.preco.mul(i.inicios.length)),
          new Prisma.Decimal(0),
        );
        if (!total.equals(dto.total) || total.gt('99999999.99'))
          throw new BadRequestException(
            'O total deve corresponder aos serviços e atendimentos selecionados.',
          );
        await this.datas(tx, p.cuidadorId, itens);
        if (anterior?.status === 'PENDENTE')
          await tx.propostaAtendimento.update({
            where: { id: anterior.id },
            data: { status: 'SUBSTITUIDA' },
          });
        const proposta = await tx.propostaAtendimento.create({
          data: {
            responsavelId: p.responsavelId,
            cuidadorId: p.cuidadorId,
            idosoId: dto.idosoId,
            ...(anterior
              ? {
                  negociacaoId: anterior.negociacaoId,
                  versao: anterior.versao + 1,
                }
              : {}),
            total,
            observacoes: dto.observacoes,
            itens: { create: itens },
          },
          include: propostaInclude,
        });
        await tx.mensagem.create({
          data: {
            remetenteId: u.id,
            destinatarioId: outroId,
            conteudo: `Proposta de atendimento · versão ${proposta.versao}`,
            propostaId: proposta.id,
          },
        });
        return proposta;
      },
      { timeout: 15000 },
    );
  }
  async responder(
    outroId: number,
    id: number,
    dto: RespostaPropostaDto,
    u: Identidade,
  ) {
    if (!u.responsavelId)
      throw new ForbiddenException(
        'Apenas o responsável pode responder à proposta.',
      );
    // Descobre a trava da proposta sem expor dados de terceiros.
    const partes = await this.partes(outroId, u);
    const base = await this.prisma.propostaAtendimento.findFirst({
      where: {
        id,
        cuidadorId: partes.cuidadorId,
        responsavelId: partes.responsavelId,
      },
    });
    if (!base) throw new NotFoundException('Proposta não encontrada.');
    return this.prisma.$transaction(
      async (tx) => {
        // Ordem global: contratos existentes (ordenados) antes de cuidador; mesma ordem do agendamento manual.
        const p = await tx.propostaAtendimento.findUniqueOrThrow({
          where: { id },
          include: { itens: true },
        });
        const origens = p.itens
          .flatMap((i) =>
            i.contratacaoOrigemId ? [i.contratacaoOrigemId] : [],
          )
          .sort((a, b) => a - b);
        for (const origem of origens)
          await tx.$queryRaw`SELECT id FROM "Contratacao" WHERE id = ${origem} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "Cuidador" WHERE id = ${p.cuidadorId} FOR UPDATE`;
        const atual = await tx.propostaAtendimento.findUniqueOrThrow({
          where: { id },
        });
        if (atual.status !== 'PENDENTE')
          throw new ConflictException('Proposta já respondida ou substituída.');
        await this.partes(outroId, u, tx);
        await this.vinculo(tx, p.responsavelId, p.idosoId);
        if (dto.status === 'ALTERACOES_SOLICITADAS' && !dto.resposta?.trim())
          throw new BadRequestException('Informe as alterações desejadas.');
        if (dto.status === 'ACEITA') {
          await this.disponivel(tx, p.cuidadorId);
          await this.origens(tx, p.itens, p.responsavelId, p.idosoId);
          await this.datas(tx, p.cuidadorId, p.itens);
          for (const item of p.itens) {
            if (
              !(await tx.cuidadorServico.findFirst({
                where: {
                  id: item.cuidadorServicoId,
                  cuidadorId: p.cuidadorId,
                  ativo: true,
                  servico: { ativo: true },
                },
              }))
            )
              throw new ConflictException(
                'Um serviço ficou indisponível. Revise a proposta.',
              );
            for (let n = 0; n < item.inicios.length; n++) {
              const data = {
                responsavelId: p.responsavelId,
                idosoId: p.idosoId,
                cuidadorServicoId: item.cuidadorServicoId,
                nomeServico: item.nomeServico,
                precoReferencia: item.precoReferencia,
                valorAcordado: item.preco,
                duracaoMinutos: item.duracaoMinutos,
                observacoes: p.observacoes,
                status: 'ACEITA' as const,
                itemPropostaId: item.id,
                sessaoProposta: n + 1,
              };
              const contrato =
                n === 0 && item.contratacaoOrigemId
                  ? await tx.contratacao.update({
                      where: { id: item.contratacaoOrigemId },
                      data: {
                        ...data,
                        codigoConclusaoHash: null,
                        tentativasCodigo: 0,
                      },
                    })
                  : await tx.contratacao.create({ data });
              await this.contratacoes.agendarEmTransacao(
                tx,
                contrato.id,
                item.inicios[n].toISOString(),
                u,
              );
            }
          }
        }
        const resultado = await tx.propostaAtendimento.update({
          where: { id },
          data: {
            status: dto.status,
            resposta: dto.resposta,
            respondidaEm: new Date(),
          },
          include: propostaInclude,
        });
        const status = {
          ACEITA: 'aceita. Atendimentos confirmados nas duas agendas',
          RECUSADA: 'recusada',
          ALTERACOES_SOLICITADAS: 'com alterações solicitadas',
        }[dto.status];
        await tx.mensagem.create({
          data: {
            remetenteId: u.id,
            destinatarioId: outroId,
            conteudo:
              `Proposta v${p.versao} ${status}.${dto.resposta ? ` ${dto.resposta}` : ''}`.slice(
                0,
                1000,
              ),
          },
        });
        return resultado;
      },
      { timeout: 20000 },
    );
  }
}
