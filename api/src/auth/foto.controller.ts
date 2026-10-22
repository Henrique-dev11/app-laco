import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { Public } from './session.guard.js';

/**
 * Entrega a foto de perfil. A foto de cuidador aprovado é pública (o catálogo
 * também é); as demais exigem sessão e só podem ser vistas pelo próprio dono,
 * por administradores ou por quem tem uma contratação com ele.
 */
@Controller('fotos')
export class FotoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Public()
  @Get(':usuarioId')
  async foto(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const foto = await this.prisma.fotoPerfil.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          select: {
            status: true,
            cuidador: { select: { id: true, statusVerificacao: true } },
          },
        },
      },
    });
    if (!foto) throw new NotFoundException('Foto não encontrada.');
    const cuidador = foto.usuario.cuidador;
    const publica =
      !!cuidador &&
      cuidador.statusVerificacao === 'APROVADO' &&
      foto.usuario.status === 'ATIVO';
    if (!publica) {
      const match = /^Bearer ([a-f0-9]{64})$/.exec(
        req.headers.authorization ?? '',
      );
      if (!match) throw new UnauthorizedException('Faça login para continuar.');
      const quem = await this.auth.autenticar(match[1]);
      const admin = ['ADMIN', 'SUPER_ADMIN'].includes(quem.tipoUsuario);
      const permitido =
        admin ||
        quem.id === usuarioId ||
        !!(await this.prisma.contratacao.findFirst({
          where: {
            OR: [
              {
                responsavelId: quem.responsavelId ?? -1,
                cuidadorServico: { cuidador: { usuarioId } },
              },
              {
                responsavel: { usuarioId },
                cuidadorServico: { cuidadorId: quem.cuidadorId ?? -1 },
              },
            ],
          },
          select: { id: true },
        }));
      if (!permitido)
        throw new ForbiddenException('Você não tem acesso a esta foto.');
    }
    res.set({
      'Content-Type': foto.mime,
      'X-Content-Type-Options': 'nosniff',
      // A URL leva ?v=<atualizadoEm>, então pode ser guardada em cache.
      'Cache-Control': publica
        ? 'public, max-age=86400'
        : 'private, max-age=86400',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.send(Buffer.from(foto.conteudo));
  }
}
