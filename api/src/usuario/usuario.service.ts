import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';

@Injectable()
export class UsuarioService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        tipoUsuario: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreateUsuarioDto) {
    const email = dto.email.trim().toLowerCase();

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (usuarioExistente) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 12);

    return this.prisma.usuario.create({
      data: {
        nome: dto.nome.trim(),
        email,
        senhaHash,
        tipoUsuario: dto.tipoUsuario,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipoUsuario: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}