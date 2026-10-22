import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIdosoDto } from './dto/create-idoso.dto.js';
import { UpdateIdosoDto } from './dto/update-idoso.dto.js';
import { validarPessoa } from '../common/pessoas.js';
import type { Identidade } from '../auth/auth.service.js';

@Injectable()
export class IdosoService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateIdosoDto, usuario: Identidade) {
    validarPessoa(dto);
    const { endereco, parentesco, ...dados } = dto;
    return this.prisma.idoso.create({
      data: {
        ...dados,
        nome: dto.nome.trim(),
        dataNascimento: new Date(dto.dataNascimento),
        endereco: {
          create: { ...endereco, estado: endereco.estado.toUpperCase() },
        },
        ...(usuario.responsavelId !== null && {
          responsavelIdosos: {
            create: {
              responsavelId: usuario.responsavelId,
              parentesco: parentesco ?? 'OUTRO',
              responsavelPrincipal: true,
            },
          },
        }),
      },
      include: { endereco: true },
    });
  }
  findAll(usuario: Identidade) {
    return this.prisma.idoso.findMany({
      where: ['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario)
        ? {}
        : {
            responsavelIdosos: {
              some: { responsavelId: usuario.responsavelId ?? -1 },
            },
          },
      include: { endereco: true },
      orderBy: { nome: 'asc' },
    });
  }
  async findOne(id: number) {
    const idoso = await this.prisma.idoso.findUnique({
      where: { id },
      include: { endereco: true },
    });
    if (!idoso) throw new NotFoundException('Idoso não encontrado.');
    return idoso;
  }
  async update(id: number, dto: UpdateIdosoDto) {
    validarPessoa(dto);
    await this.findOne(id);
    const { endereco, ...dados } = dto;
    return this.prisma.idoso.update({
      where: { id },
      data: {
        ...dados,
        ...(dto.dataNascimento !== undefined && {
          dataNascimento: new Date(dto.dataNascimento),
        }),
        ...(endereco !== undefined && {
          endereco: {
            update: {
              ...endereco,
              ...(endereco.estado !== undefined && {
                estado: endereco.estado.toUpperCase(),
              }),
            },
          },
        }),
      },
      include: { endereco: true },
    });
  }
}
