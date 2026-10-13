import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Res,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminOnly } from './session.guard.js';
import { VerificacaoCuidadorDto } from '../cuidador/dto/verificacao-cuidador.dto.js';

class StatusContaDto {
  @IsIn(['ATIVO', 'BLOQUEADO', 'INATIVO']) status:
    'ATIVO' | 'BLOQUEADO' | 'INATIVO';
}

@AdminOnly()
@Controller('admin/cuidadores')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.cuidador.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        telefone: true,
        cpf: true,
        dataNascimento: true,
        biografia: true,
        experienciaProfissional: true,
        registroProfissional: true,
        statusVerificacao: true,
        createdAt: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            nomeSocial: true,
            email: true,
            status: true,
          },
        },
        endereco: true,
        curriculo: { select: { id: true, nome: true, createdAt: true } },
        cuidadorServicos: {
          select: {
            id: true,
            preco: true,
            duracaoMinutos: true,
            ativo: true,
            servico: { select: { nome: true } },
          },
        },
      },
    });
  }

  private async encontrar(id: number) {
    const cuidador = await this.prisma.cuidador.findUnique({ where: { id } });
    if (!cuidador) throw new NotFoundException('Cuidador não encontrado.');
    return cuidador;
  }

  @Patch(':id/verificacao')
  async verificar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: VerificacaoCuidadorDto,
  ) {
    const cuidador = await this.encontrar(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.statusVerificacao === 'APROVADO')
        await tx.usuario.update({
          where: { id: cuidador.usuarioId },
          data: { status: 'ATIVO' },
        });
      return tx.cuidador.update({
        where: { id },
        data: { statusVerificacao: dto.statusVerificacao },
        select: {
          id: true,
          statusVerificacao: true,
          usuario: { select: { status: true } },
        },
      });
    });
  }

  @Patch(':id/conta')
  async conta(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatusContaDto,
  ) {
    const cuidador = await this.encontrar(id);
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.update({
        where: { id: cuidador.usuarioId },
        data: { status: dto.status },
        select: { id: true, status: true },
      });
      if (dto.status !== 'ATIVO')
        await tx.sessao.deleteMany({
          where: { usuarioId: cuidador.usuarioId },
        });
      return usuario;
    });
  }

  @Get(':id/curriculo')
  async curriculo(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    await this.encontrar(id);
    const arquivo = await this.prisma.curriculo.findUnique({
      where: { cuidadorId: id },
    });
    if (!arquivo) throw new NotFoundException('Currículo não encontrado.');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="curriculo.pdf"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(Buffer.from(arquivo.conteudo));
  }
}
