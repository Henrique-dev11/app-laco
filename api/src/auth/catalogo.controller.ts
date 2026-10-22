import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from './session.guard.js';
import { arredondarMedia } from '../avaliacao/avaliacao.service.js';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly prisma: PrismaService) {}
  @Public()
  @Get('cuidadores')
  async cuidadores() {
    const cuidadores = await this.prisma.cuidador.findMany({
      where: { statusVerificacao: 'APROVADO', usuario: { status: 'ATIVO' } },
      select: {
        id: true,
        biografia: true,
        experienciaProfissional: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            nomeSocial: true,
            foto: { select: { updatedAt: true } },
          },
        },
        endereco: { select: { cidade: true, estado: true } },
        cuidadorServicos: {
          where: { ativo: true, servico: { ativo: true } },
          select: {
            id: true,
            preco: true,
            duracaoMinutos: true,
            servico: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
      take: 100,
    });
    const resumos = await this.prisma.avaliacao.groupBy({
      by: ['cuidadorId'],
      where: { cuidadorId: { in: cuidadores.map((c) => c.id) } },
      _avg: { nota: true },
      _count: { _all: true },
    });
    const porCuidador = new Map(resumos.map((r) => [r.cuidadorId, r]));
    return cuidadores.map((c) => {
      const resumo = porCuidador.get(c.id);
      return {
        ...c,
        avaliacaoMedia: arredondarMedia(resumo?._avg.nota),
        totalAvaliacoes: resumo?._count._all ?? 0,
      };
    });
  }
}
