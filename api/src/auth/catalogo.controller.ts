import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from './session.guard.js';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly prisma: PrismaService) {}
  @Public()
  @Get('cuidadores')
  cuidadores() {
    return this.prisma.cuidador.findMany({
      where: { statusVerificacao: 'APROVADO', usuario: { status: 'ATIVO' } },
      select: {
        id: true,
        biografia: true,
        experienciaProfissional: true,
        usuario: { select: { nome: true, nomeSocial: true } },
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
  }
}
