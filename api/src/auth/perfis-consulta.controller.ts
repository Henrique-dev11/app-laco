import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AvaliacaoService,
  arredondarMedia,
} from '../avaliacao/avaliacao.service.js';
import { Public, type Autenticado } from './session.guard.js';

const perfilUsuario = {
  id: true,
  nome: true,
  nomeSocial: true,
  foto: { select: { updatedAt: true } },
} as const;

@Controller('perfis')
export class PerfisConsultaController {
  constructor(
    private readonly db: PrismaService,
    private readonly avaliacoes: AvaliacaoService,
  ) {}

  @Public()
  @Get('cuidadores/:usuarioId')
  async cuidador(@Param('usuarioId', ParseIntPipe) usuarioId: number) {
    return this.consultaCuidador(usuarioId, false);
  }

  @Get('me')
  meuPerfil(@Req() req: Autenticado) {
    if (req.usuario.cuidadorId)
      return this.consultaCuidador(req.usuario.id, true);
    if (req.usuario.responsavelId)
      return this.consultaResponsavel(req.usuario.id, null);
    throw new ForbiddenException();
  }

  private async consultaCuidador(usuarioId: number, proprio: boolean) {
    const cuidador = await this.db.cuidador.findFirst({
      where: {
        usuarioId,
        ...(proprio ? {} : { statusVerificacao: 'APROVADO' }),
        usuario: { status: 'ATIVO' },
      },
      select: {
        id: true,
        usuario: { select: perfilUsuario },
        statusVerificacao: true,
        biografia: true,
        experienciaProfissional: true,
        cuidadorServicos: {
          where: { ativo: true, servico: { ativo: true } },
          orderBy: { id: 'asc' },
          select: {
            id: true,
            preco: true,
            duracaoMinutos: true,
            servico: { select: { nome: true } },
          },
        },
      },
    });
    if (!cuidador) throw new NotFoundException('Cuidador indisponível.');
    const [avaliacoes, desempenho] = await Promise.all([
      this.avaliacoes.resumoDoCuidador(cuidador.id),
      this.db.$queryRaw<{ mes: string; total: number }[]>`
        WITH meses AS (
          SELECT generate_series(date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - interval '5 months',
            date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo'), interval '1 month') AS mes
        ), visitas AS (
          SELECT date_trunc('month', max(coalesce(p."fimEm", c."updatedAt")) AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') AS mes
          FROM "Contratacao" c JOIN "CuidadorServico" cs ON cs.id = c."cuidadorServicoId"
          LEFT JOIN "PagamentoSimulado" p ON p."contratacaoId" = coalesce(c."visitaId", c.id)
          WHERE cs."cuidadorId" = ${cuidador.id} AND c.status = 'CONCLUIDA'
          GROUP BY coalesce(c."visitaId", c.id)
        )
        SELECT to_char(meses.mes, 'YYYY-MM') AS mes, count(visitas.mes)::int AS total
        FROM meses LEFT JOIN visitas USING (mes) GROUP BY meses.mes ORDER BY meses.mes`,
    ]);
    return { ...cuidador, avaliacoes, desempenho };
  }

  @Get('responsaveis/:usuarioId')
  async responsavel(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Req() req: Autenticado,
  ) {
    const cuidadorId = req.usuario.cuidadorId;
    if (req.usuario.tipoUsuario !== 'CUIDADOR' || !cuidadorId)
      throw new ForbiddenException();
    return this.consultaResponsavel(usuarioId, cuidadorId);
  }

  /** A conta titular vê os próprios vínculos; a consulta de terceiros depende da contratação. */
  private consultaResponsavel(usuarioId: number, cuidadorId: number | null) {
    return this.db.$transaction(
      async (tx) => {
        const responsavel = await tx.responsavel.findFirst({
          where: {
            usuarioId,
            usuario: { status: 'ATIVO' },
            ...(cuidadorId === null
              ? {}
              : {
                  contratacoes: {
                    some: {
                      status: { in: ['SOLICITADA', 'ACEITA', 'CONCLUIDA'] },
                      cuidadorServico: { cuidadorId },
                    },
                  },
                }),
          },
          select: { id: true, usuario: { select: perfilUsuario } },
        });
        if (!responsavel)
          throw new NotFoundException('Perfil indisponível para esta conta.');
        const [idosos, resumo, desempenho] = await Promise.all([
          tx.$queryRaw<{ primeiroNome: string; faixaEtaria: string }[]>`
          SELECT split_part(trim(coalesce(nullif(i."nomeSocial", ''), i.nome)), ' ', 1) AS "primeiroNome",
            CASE
              WHEN age((now() AT TIME ZONE 'America/Sao_Paulo')::date, i."dataNascimento"::date) < interval '60 years' THEN 'Até 59 anos'
              WHEN age((now() AT TIME ZONE 'America/Sao_Paulo')::date, i."dataNascimento"::date) < interval '70 years' THEN '60 a 69 anos'
              WHEN age((now() AT TIME ZONE 'America/Sao_Paulo')::date, i."dataNascimento"::date) < interval '80 years' THEN '70 a 79 anos'
              ELSE '80 anos ou mais'
            END AS "faixaEtaria"
          FROM "Idoso" i JOIN "ResponsavelIdoso" v ON v."idosoId" = i.id
          WHERE v."responsavelId" = ${responsavel.id} AND (${cuidadorId}::int IS NULL OR EXISTS (
            SELECT 1 FROM "Contratacao" c JOIN "CuidadorServico" cs ON cs.id = c."cuidadorServicoId"
            WHERE c."idosoId" = i.id AND c."responsavelId" = v."responsavelId" AND cs."cuidadorId" = ${cuidadorId}
              AND c.status IN ('SOLICITADA', 'ACEITA', 'CONCLUIDA')
          )) ORDER BY i.id`,
          tx.avaliacaoResponsavel.aggregate({
            where: { contratacao: { responsavelId: responsavel.id } },
            _avg: { nota: true },
            _count: { _all: true },
          }),
          tx.$queryRaw<{ mes: string; media: number | null; total: number }[]>`
          WITH meses AS (
            SELECT generate_series(date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') - interval '5 months',
              date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo'), interval '1 month') AS mes
          ), notas AS (
            SELECT date_trunc('month', a."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') AS mes, a.nota
            FROM "AvaliacaoResponsavel" a JOIN "Contratacao" c ON c.id = a."contratacaoId"
            WHERE c."responsavelId" = ${responsavel.id}
          )
          SELECT to_char(meses.mes, 'YYYY-MM') AS mes, round(avg(notas.nota), 1)::float AS media, count(notas.nota)::int AS total
          FROM meses LEFT JOIN notas USING (mes) GROUP BY meses.mes ORDER BY meses.mes`,
        ]);
        return {
          usuario: responsavel.usuario,
          idosos,
          desempenho,
          avaliacoes: {
            media: arredondarMedia(resumo._avg.nota),
            total: resumo._count._all,
          },
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }
}
