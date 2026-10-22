import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, type Identidade } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const Public = () => SetMetadata('public', true);
export const AdminOnly = () => SetMetadata('adminOnly', true);
export type Autenticado = Request & { usuario: Identidade };

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly tentativas = new Map<
    string,
    { quantidade: number; ate: number }
  >();
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Autenticado>();
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      if (req.method === 'POST') {
        const agora = Date.now();
        for (const [key, value] of this.tentativas)
          if (value.ate < agora) this.tentativas.delete(key);
        const key = req.ip ?? 'local';
        const tentativa = this.tentativas.get(key) ?? {
          quantidade: 0,
          ate: agora + 15 * 60 * 1000,
        };
        tentativa.quantidade++;
        this.tentativas.set(key, tentativa);
        if (tentativa.quantidade > 30)
          throw new HttpException(
            'Muitas tentativas. Aguarde 15 minutos.',
            429,
          );
      }
      return true;
    }
    const match = /^Bearer ([a-f0-9]{64})$/.exec(
      req.headers.authorization ?? '',
    );
    if (!match) throw new UnauthorizedException('Faça login para continuar.');
    req.usuario = await this.auth.autenticar(match[1]);
    const administrador = ['ADMIN', 'SUPER_ADMIN'].includes(
      req.usuario.tipoUsuario,
    );
    if (
      this.reflector.getAllAndOverride<boolean>('adminOnly', [
        context.getHandler(),
        context.getClass(),
      ]) &&
      !administrador
    )
      throw new ForbiddenException('Acesso exclusivo para administradores.');
    if (administrador) return true;
    if (
      await this.autorizado(
        context.getClass().name,
        context.getHandler().name,
        req,
      )
    )
      return true;
    throw new ForbiddenException('Você não tem acesso a estes dados.');
  }

  private async autorizado(
    controller: string,
    handler: string,
    req: Autenticado,
  ) {
    const user = req.usuario;
    const id = Number(req.params.id);
    switch (controller) {
      case 'AuthController':
        return true;
      case 'AgendaController':
        return true; // consulta filtrada pelo participante
      case 'ContratacaoController': {
        if (handler === 'findAll') return true; // consulta filtrada no serviço
        if (handler === 'create')
          return (
            user.responsavelId !== null &&
            Number(req.body?.responsavelId) === user.responsavelId
          );
        const contrato = await this.prisma.contratacao.findUnique({
          where: { id: Number.isInteger(id) ? id : -1 },
          select: {
            responsavelId: true,
            cuidadorServico: { select: { cuidadorId: true } },
          },
        });
        if (!contrato) return true; // controller retorna 404
        return (
          contrato.responsavelId === user.responsavelId ||
          contrato.cuidadorServico.cuidadorId === user.cuidadorId
        );
      }
      case 'AvaliacaoController': {
        // Só criar passa por aqui (a listagem é pública): precisa ser o responsável do contrato.
        const contrato = await this.prisma.contratacao.findUnique({
          where: { id: Number.isInteger(id) ? id : -1 },
          select: { responsavelId: true },
        });
        if (!contrato) return true; // o serviço responde 404
        return contrato.responsavelId === user.responsavelId;
      }
      case 'UsuarioController':
        return handler !== 'findAll' && handler !== 'create' && id === user.id;
      case 'ResponsavelController':
        return handler === 'create'
          ? Number(req.body?.usuarioId) === user.id
          : handler !== 'findAll' && id === user.responsavelId;
      case 'CuidadorController':
        return handler === 'create'
          ? Number(req.body?.usuarioId) === user.id
          : handler !== 'findAll' &&
              handler !== 'verificacao' &&
              id === user.cuidadorId;
      case 'ServicoController':
        return req.method === 'GET';
      case 'CuidadorServicoController':
        return (
          req.method === 'GET' ||
          Number(req.params.cuidadorId) === user.cuidadorId
        );
      case 'DisponibilidadeController': {
        if (req.method === 'GET') return true;
        if (handler === 'create')
          return Number(req.params.cuidadorId) === user.cuidadorId;
        const slot = await this.prisma.disponibilidade.findUnique({
          where: { id: Number.isInteger(id) ? id : -1 },
        });
        return slot?.cuidadorId === user.cuidadorId;
      }
      case 'IdosoController': {
        if (handler === 'create' || handler === 'findAll') return false;
        return !!(await this.prisma.responsavelIdoso.findFirst({
          where: {
            idosoId: Number.isInteger(id) ? id : -1,
            responsavelId: user.responsavelId ?? -1,
          },
        }));
      }
      case 'ResponsavelIdosoController': {
        if (handler === 'findIdososByResponsavel')
          return Number(req.params.responsavelId) === user.responsavelId;
        if (
          handler !== 'findResponsaveisByIdoso' &&
          Number(req.params.responsavelId) !== user.responsavelId
        )
          return false;
        return !!(await this.prisma.responsavelIdoso.findFirst({
          where: {
            idosoId: Number(req.params.idosoId) || -1,
            responsavelId: user.responsavelId ?? -1,
          },
        }));
      }
      default:
        return false;
    }
  }
}
