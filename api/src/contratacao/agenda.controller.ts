import { AgendaQueryDto } from './dto/agenda-query.dto.js';
import { Controller, Get, Req, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Autenticado } from '../auth/session.guard.js';

@Controller('agendamentos')
export class AgendaController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  listar(@Req() req: Autenticado, @Query() query: AgendaQueryDto) {
    const usuario = req.usuario;
    return this.prisma.agendamento.findMany({
      where: {
        ...(query.idosoId !== undefined && {
          contratacao: { idosoId: query.idosoId },
        }),
        ...(['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario)
          ? {}
          : {
              OR: [
                { cuidadorId: usuario.cuidadorId ?? -1 },
                { contratacao: { responsavelId: usuario.responsavelId ?? -1 } },
              ],
            }),
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
            nomeServico: true,
            idoso: { select: { id: true, nome: true, nomeSocial: true } },
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
