import { Controller, Get, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Autenticado } from '../auth/session.guard.js';

@Controller('agendamentos')
export class AgendaController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  listar(@Req() req: Autenticado) {
    const usuario = req.usuario;
    return this.prisma.agendamento.findMany({
      where: ['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario)
        ? {}
        : {
            OR: [
              { cuidadorId: usuario.cuidadorId ?? -1 },
              { contratacao: { responsavelId: usuario.responsavelId ?? -1 } },
            ],
          },
      select: {
        id: true,
        inicio: true,
        fim: true,
        ativo: true,
        contratacao: {
          select: {
            id: true,
            status: true,
            idoso: { select: { nome: true } },
            cuidadorServico: {
              select: {
                servico: { select: { nome: true } },
                cuidador: { select: { usuario: { select: { nome: true } } } },
              },
            },
          },
        },
      },
      orderBy: { inicio: 'asc' },
    });
  }
}
