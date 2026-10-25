import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { instanteLocal, partesLocais } from '../contratacao/horarios.js';
import {
  CategoriaAdmin,
  type PaginaAdminDto,
  type PeriodoAdminDto,
  type ContratosAdminDto,
} from './admin.dto.js';

const usuario = {
  select: {
    id: true,
    nome: true,
    nomeSocial: true,
    email: true,
    status: true,
    foto: { select: { updatedAt: true } },
  },
} as const;
const idoso = {
  select: {
    id: true,
    nome: true,
    nomeSocial: true,
    dataNascimento: true,
    createdAt: true,
  },
} as const;
const responsaveis = {
  select: {
    parentesco: true,
    responsavelPrincipal: true,
    responsavel: { select: { id: true, dataNascimento: true, usuario } },
  },
} as const;
const semAcessoProprio = {
  responsavelIdosos: { none: { parentesco: 'PROPRIO' } },
} satisfies Prisma.ResponsavelWhereInput;

function classificarIdoso<
  T extends {
    nome: string;
    nomeSocial: string | null;
    dataNascimento: Date;
    responsavelIdosos: {
      parentesco: string;
      responsavel: {
        dataNascimento: Date;
        usuario: { nome: string; nomeSocial: string | null };
      };
    }[];
  },
>(registro: T) {
  const proprio = registro.responsavelIdosos.find(
    (vinculo) => vinculo.parentesco === 'PROPRIO',
  );
  return {
    ...registro,
    perfil: proprio ? 'IDOSO_INDEPENDENTE' : 'IDOSO',
    ...(proprio && {
      nome: proprio.responsavel.usuario.nome,
      nomeSocial: proprio.responsavel.usuario.nomeSocial,
      dataNascimento: proprio.responsavel.dataNascimento,
    }),
  };
}
const cuidadorSelect = {
  id: true,
  telefone: true,
  createdAt: true,
  statusVerificacao: true,
  usuario,
  endereco: { select: { cidade: true, estado: true } },
  cuidadorServicos: {
    select: {
      id: true,
      preco: true,
      duracaoMinutos: true,
      ativo: true,
      servico: { select: { nome: true } },
    },
  },
} as const;
const contratoSelect = {
  id: true,
  nomeServico: true,
  precoReferencia: true,
  valorAcordado: true,
  duracaoMinutos: true,
  status: true,
  observacoes: true,
  createdAt: true,
  updatedAt: true,
  idoso,
  responsavel: { select: { id: true, usuario } },
  cuidadorServico: {
    select: { id: true, cuidador: { select: { id: true, usuario } } },
  },
  agendamento: { select: { inicio: true, fim: true, ativo: true } },
} as const;
function pagina<T>(dados: T[], total: number, q: PaginaAdminDto) {
  return {
    dados,
    total,
    pagina: q.pagina,
    limite: q.limite,
    paginas: Math.ceil(total / q.limite),
  };
}
const buscaPessoa = (busca?: string) =>
  busca
    ? {
        OR: [
          { nome: { contains: busca, mode: 'insensitive' as const } },
          { nomeSocial: { contains: busca, mode: 'insensitive' as const } },
        ],
      }
    : {};
export function periodoAdmin(q: Pick<PeriodoAdminDto, 'inicio' | 'fim'>) {
  const hoje = partesLocais(new Date()).data;
  const padrao = new Date(`${hoje}T12:00:00Z`);
  padrao.setUTCDate(padrao.getUTCDate() - 29);
  const inicio = q.inicio ?? padrao.toISOString().slice(0, 10),
    fim = q.fim ?? hoje;
  if (
    inicio > fim ||
    Date.parse(`${fim}T00:00Z`) - Date.parse(`${inicio}T00:00Z`) >
      730 * 86400000
  )
    throw new BadRequestException(
      'Informe um período ordenado de até 731 dias.',
    );
  const proximo = new Date(`${fim}T12:00Z`);
  proximo.setUTCDate(proximo.getUTCDate() + 1);
  const de = instanteLocal(inicio, 0),
    ate = instanteLocal(proximo.toISOString().slice(0, 10), 0);
  if (!de || !ate) throw new BadRequestException('Período inválido.');
  return { inicio, fim, de, ate };
}
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  async resumo() {
    return this.prisma.$transaction(
      async (tx) => {
        const [
          cuidadores,
          responsaveis,
          idosos,
          independentes,
          status,
          pendentesVerificacao,
        ] = await Promise.all([
          tx.cuidador.count(),
          tx.responsavel.count({ where: semAcessoProprio }),
          tx.idoso.count(),
          tx.idoso.count({
            where: { responsavelIdosos: { some: { parentesco: 'PROPRIO' } } },
          }),
          tx.contratacao.groupBy({ by: ['status'], _count: { _all: true } }),
          tx.cuidador.count({ where: { statusVerificacao: 'PENDENTE' } }),
        ]);
        const porStatus = Object.fromEntries(
          ['SOLICITADA', 'ACEITA', 'RECUSADA', 'CANCELADA', 'CONCLUIDA'].map(
            (s) => [s, status.find((v) => v.status === s)?._count._all ?? 0],
          ),
        );
        return {
          cuidadores,
          responsaveis,
          idosos,
          independentes,
          pendentesVerificacao,
          contratacoes: status.reduce((n, v) => n + v._count._all, 0),
          porStatus,
          atualizadoEm: new Date(),
          classificacaoIndependentes:
            'Idosos que gerenciam o próprio cuidado; incluídos no total de idosos e separados dos responsáveis.',
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async usuarios(categoria: CategoriaAdmin, q: PaginaAdminDto) {
    const skip = (q.pagina - 1) * q.limite,
      take = q.limite;
    return this.prisma.$transaction(
      async (tx) => {
        if (categoria === CategoriaAdmin.CUIDADORES) {
          const where: Prisma.CuidadorWhereInput = {
            usuario: {
              ...buscaPessoa(q.busca),
              ...(q.situacao ? { status: q.situacao } : {}),
            },
            ...(q.verificacao ? { statusVerificacao: q.verificacao } : {}),
          };
          const [dados, total] = await Promise.all([
            tx.cuidador.findMany({
              where,
              skip,
              take,
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              select: cuidadorSelect,
            }),
            tx.cuidador.count({ where }),
          ]);
          return pagina(dados, total, q);
        }
        if (categoria === CategoriaAdmin.RESPONSAVEIS) {
          const where: Prisma.ResponsavelWhereInput = {
            AND: [semAcessoProprio],
            usuario: {
              ...buscaPessoa(q.busca),
              ...(q.situacao ? { status: q.situacao } : {}),
            },
            ...(q.vinculo
              ? {
                  responsavelIdosos:
                    q.vinculo === 'COM_VINCULO' ? { some: {} } : { none: {} },
                }
              : {}),
          };
          const [dados, total] = await Promise.all([
            tx.responsavel.findMany({
              where,
              skip,
              take,
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              select: {
                id: true,
                telefone: true,
                createdAt: true,
                usuario,
                _count: { select: { responsavelIdosos: true } },
              },
            }),
            tx.responsavel.count({ where }),
          ]);
          return pagina(dados, total, q);
        }
        const where: Prisma.IdosoWhereInput = {
          ...(q.busca && {
            OR: [
              buscaPessoa(q.busca),
              {
                responsavelIdosos: {
                  some: {
                    parentesco: 'PROPRIO',
                    responsavel: { usuario: buscaPessoa(q.busca) },
                  },
                },
              },
            ],
          }),
          ...(categoria === CategoriaAdmin.INDEPENDENTES
            ? {
                responsavelIdosos: {
                  some: {
                    parentesco: 'PROPRIO',
                    ...(q.situacao
                      ? { responsavel: { usuario: { status: q.situacao } } }
                      : {}),
                  },
                },
              }
            : q.vinculo
              ? {
                  responsavelIdosos:
                    q.vinculo === 'COM_VINCULO' ? { some: {} } : { none: {} },
                }
              : {}),
        };
        const [dados, total] = await Promise.all([
          tx.idoso.findMany({
            where,
            skip,
            take,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: { ...idoso.select, responsavelIdosos: responsaveis },
          }),
          tx.idoso.count({ where }),
        ]);
        return pagina(dados.map(classificarIdoso), total, q);
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async detalhe(categoria: CategoriaAdmin, id: number) {
    let registro: unknown;
    if (categoria === CategoriaAdmin.CUIDADORES)
      registro = await this.prisma.cuidador.findUnique({
        where: { id },
        select: {
          ...cuidadorSelect,
          cpf: true,
          dataNascimento: true,
          biografia: true,
          experienciaProfissional: true,
          registroProfissional: true,
          endereco: true,
          curriculo: { select: { id: true, nome: true, createdAt: true } },
        },
      });
    else if (categoria === CategoriaAdmin.RESPONSAVEIS)
      registro = await this.prisma.responsavel.findFirst({
        where: { id, ...semAcessoProprio },
        select: {
          id: true,
          telefone: true,
          dataNascimento: true,
          createdAt: true,
          usuario,
          endereco: { select: { cidade: true, estado: true } },
          responsavelIdosos: {
            select: { parentesco: true, responsavelPrincipal: true, idoso },
          },
        },
      });
    else {
      const cadastro = await this.prisma.idoso.findFirst({
        where: {
          id,
          ...(categoria === CategoriaAdmin.INDEPENDENTES
            ? {
                responsavelIdosos: { some: { parentesco: 'PROPRIO' as const } },
              }
            : {}),
        },
        select: {
          ...idoso.select,
          telefone: true,
          endereco: { select: { cidade: true, estado: true } },
          responsavelIdosos: responsaveis,
        },
      });
      registro = cadastro ? classificarIdoso(cadastro) : null;
    }
    if (!registro) throw new NotFoundException('Cadastro não encontrado.');
    return registro;
  }
  async contratos(q: ContratosAdminDto) {
    const p = q.inicio || q.fim ? periodoAdmin(q) : null;
    const where: Prisma.ContratacaoWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(p ? { createdAt: { gte: p.de, lt: p.ate } } : {}),
      ...(q.busca
        ? {
            OR: [
              { nomeServico: { contains: q.busca, mode: 'insensitive' } },
              { idoso: buscaPessoa(q.busca) },
              { responsavel: { usuario: buscaPessoa(q.busca) } },
              {
                cuidadorServico: {
                  cuidador: { usuario: buscaPessoa(q.busca) },
                },
              },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const [dados, total] = await Promise.all([
          tx.contratacao.findMany({
            where,
            skip: (q.pagina - 1) * q.limite,
            take: q.limite,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: contratoSelect,
          }),
          tx.contratacao.count({ where }),
        ]);
        return pagina(dados, total, q);
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
  async contrato(id: number) {
    const c = await this.prisma.contratacao.findUnique({
      where: { id },
      select: contratoSelect,
    });
    if (!c) throw new NotFoundException('Contratação não encontrada.');
    return c;
  }
  async relatorios(q: PeriodoAdminDto) {
    const p = periodoAdmin(q),
      unidades = { dia: 'day', semana: 'week', mes: 'month', ano: 'year' },
      unidade = unidades[q.agrupamento];
    return this.prisma.$transaction(
      async (tx) => {
        const where = { createdAt: { gte: p.de, lt: p.ate } };
        const [status, serie, mensal, servicos, crescimento] =
          await Promise.all([
            tx.contratacao.groupBy({
              by: ['status'],
              where,
              _count: { _all: true },
              _sum: { valorAcordado: true },
              _avg: { valorAcordado: true },
            }),
            tx.$queryRaw<
              {
                periodo: string;
                quantidade: number;
                valor: string;
                concluido: string;
                aceito: string;
              }[]
            >(Prisma.sql`
          WITH periodos AS (SELECT generate_series(date_trunc(${unidade}, ${p.inicio}::date::timestamp),date_trunc(${unidade}, ${p.fim}::date::timestamp),('1 ' || ${unidade})::interval) AS periodo),
          contratos AS (SELECT date_trunc(${unidade}, "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') AS periodo,
            count(*)::int AS quantidade, COALESCE(sum("valorAcordado") FILTER(WHERE status IN ('ACEITA','CONCLUIDA')),0)::text AS valor,
            COALESCE(sum("valorAcordado") FILTER(WHERE status='CONCLUIDA'),0)::text AS concluido, COALESCE(sum("valorAcordado") FILTER(WHERE status='ACEITA'),0)::text AS aceito
            FROM "Contratacao" WHERE "createdAt">=${p.de} AND "createdAt"<${p.ate} GROUP BY 1)
          SELECT to_char(p.periodo,'YYYY-MM-DD') AS periodo,COALESCE(c.quantidade,0)::int AS quantidade,COALESCE(c.valor,'0') AS valor,COALESCE(c.concluido,'0') AS concluido,COALESCE(c.aceito,'0') AS aceito
          FROM periodos p LEFT JOIN contratos c USING(periodo) ORDER BY p.periodo`),
            tx.$queryRaw<{ periodo: string; quantidade: number }[]>(Prisma.sql`
          WITH periodos AS (SELECT generate_series(date_trunc('month',${p.inicio}::date::timestamp),date_trunc('month',${p.fim}::date::timestamp),'1 month'::interval) AS periodo),
          contratos AS (SELECT date_trunc('month',"createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') AS periodo,count(*)::int AS quantidade FROM "Contratacao" WHERE "createdAt">=${p.de} AND "createdAt"<${p.ate} GROUP BY 1)
          SELECT to_char(p.periodo,'YYYY-MM-DD') AS periodo,COALESCE(c.quantidade,0)::int AS quantidade FROM periodos p LEFT JOIN contratos c USING(periodo) ORDER BY p.periodo`),
            tx.$queryRaw<
              {
                servicoId: number;
                nome: string;
                quantidade: number;
                solicitacoes: number;
                valor: string;
              }[]
            >(Prisma.sql`
          SELECT cs."servicoId", max(c."nomeServico") AS nome,count(*) FILTER(WHERE c.status IN ('ACEITA','CONCLUIDA'))::int AS quantidade,count(*)::int AS solicitacoes,COALESCE(sum(c."valorAcordado") FILTER(WHERE c.status IN ('ACEITA','CONCLUIDA')),0)::text AS valor
          FROM "Contratacao" c JOIN "CuidadorServico" cs ON cs.id=c."cuidadorServicoId" WHERE c."createdAt">=${p.de} AND c."createdAt"<${p.ate} GROUP BY cs."servicoId" ORDER BY quantidade DESC, solicitacoes DESC, cs."servicoId" LIMIT 10`),
            tx.$queryRaw<
              {
                periodo: string;
                cuidadores: number;
                responsaveis: number;
                independentes: number;
              }[]
            >(Prisma.sql`
          WITH periodos AS (SELECT generate_series(date_trunc(${unidade},${p.inicio}::date::timestamp),date_trunc(${unidade},${p.fim}::date::timestamp),('1 ' || ${unidade})::interval) AS periodo),
          pessoas AS (SELECT date_trunc(${unidade},"createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') AS periodo,'CUIDADOR' AS tipo FROM "Cuidador" WHERE "createdAt">=${p.de} AND "createdAt"<${p.ate}
            UNION ALL SELECT date_trunc(${unidade},r."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'),CASE WHEN EXISTS(SELECT 1 FROM "ResponsavelIdoso" v WHERE v."responsavelId"=r.id AND v.parentesco='PROPRIO') THEN 'INDEPENDENTE' ELSE 'RESPONSAVEL' END FROM "Responsavel" r WHERE r."createdAt">=${p.de} AND r."createdAt"<${p.ate})
          SELECT to_char(p.periodo,'YYYY-MM-DD') AS periodo,count(*) FILTER(WHERE u.tipo='CUIDADOR')::int AS cuidadores,count(*) FILTER(WHERE u.tipo='RESPONSAVEL')::int AS responsaveis,count(*) FILTER(WHERE u.tipo='INDEPENDENTE')::int AS independentes FROM periodos p LEFT JOIN pessoas u USING(periodo) GROUP BY p.periodo ORDER BY p.periodo`),
          ]);
        const soma = (estados: string[]) =>
          status
            .filter((s) => estados.includes(s.status))
            .reduce(
              (n, s) => n.add(s._sum.valorAcordado ?? 0),
              new Prisma.Decimal(0),
            );
        const concluidas = status.find((s) => s.status === 'CONCLUIDA');
        return {
          inicio: p.inicio,
          fim: p.fim,
          agrupamento: q.agrupamento,
          fuso: 'America/Sao_Paulo',
          baseTemporal:
            'Data de criação da contratação; situação atual do registro. Sem confirmação de pagamento.',
          indicadores: {
            valorTotalRegistrado: soma([
              'SOLICITADA',
              'ACEITA',
              'RECUSADA',
              'CANCELADA',
              'CONCLUIDA',
            ]).toFixed(2),
            valorContratado: soma(['ACEITA', 'CONCLUIDA']).toFixed(2),
            valorConcluido: soma(['CONCLUIDA']).toFixed(2),
            valorAceito: soma(['ACEITA']).toFixed(2),
            quantidade: status.reduce((n, s) => n + s._count._all, 0),
            ticketMedioConcluido: (
              concluidas?._avg.valorAcordado ?? new Prisma.Decimal(0)
            ).toFixed(2),
          },
          porStatus: [
            'SOLICITADA',
            'ACEITA',
            'RECUSADA',
            'CANCELADA',
            'CONCLUIDA',
          ].map((s) => ({
            status: s,
            quantidade: status.find((v) => v.status === s)?._count._all ?? 0,
            valor: (
              status.find((v) => v.status === s)?._sum.valorAcordado ??
              new Prisma.Decimal(0)
            ).toFixed(2),
          })),
          serie,
          mensal,
          servicos,
          crescimento,
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 15000 },
    );
  }
}
