import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIdosoDto } from './dto/create-idoso.dto.js';
import { UpdateIdosoDto } from './dto/update-idoso.dto.js';
import { validarPessoa } from '../common/pessoas.js';
import { dadosImagemPerfil } from '../common/imagens.js';
import { apresentarIdoso, incluirFotoIdoso } from './idoso-foto.js';
import type { Identidade, Imagem } from '../auth/auth.service.js';

@Injectable()
export class IdosoService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateIdosoDto, usuario: Identidade) {
    validarPessoa(dto);
    const { endereco, parentesco, ...dados } = dto;
    // PROPRIO identifica a conta do próprio idoso e só é criado no cadastro dessa conta.
    if (parentesco === 'PROPRIO')
      throw new BadRequestException(
        'O vínculo próprio é definido no cadastro da conta do idoso.',
      );
    const idoso = await this.prisma.idoso.create({
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
      include: incluirFotoIdoso,
    });
    return apresentarIdoso(idoso);
  }
  async findAll(usuario: Identidade) {
    const idosos = await this.prisma.idoso.findMany({
      where: ['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario)
        ? {}
        : {
            responsavelIdosos: {
              some: { responsavelId: usuario.responsavelId ?? -1 },
            },
          },
      include: incluirFotoIdoso,
      orderBy: { nome: 'asc' },
    });
    return idosos.map(apresentarIdoso);
  }
  async findOne(id: number) {
    const idoso = await this.prisma.idoso.findUnique({
      where: { id },
      include: incluirFotoIdoso,
    });
    if (!idoso) throw new NotFoundException('Idoso não encontrado.');
    return apresentarIdoso(idoso);
  }
  async update(id: number, dto: UpdateIdosoDto) {
    validarPessoa(dto);
    const { endereco, ...dados } = dto;
    const atualizado = await this.prisma.$transaction(async (tx) => {
      const idoso = await tx.idoso.findUnique({
        where: { id },
        select: { id: true, enderecoId: true },
      });
      if (!idoso) throw new NotFoundException('Idoso não encontrado.');
      const proprios = await tx.responsavelIdoso.findMany({
        where: { idosoId: id, parentesco: 'PROPRIO' },
        include: { responsavel: true },
      });
      if (proprios.length && (dto.cpf === null || dto.telefone === null))
        throw new BadRequestException(
          'CPF e telefone são obrigatórios no acesso próprio do idoso.',
        );
      const enderecoId =
        proprios[0]?.responsavel.enderecoId ?? idoso.enderecoId;
      if (endereco)
        await tx.endereco.update({
          where: { id: enderecoId },
          data: {
            ...endereco,
            ...(endereco.estado !== undefined && {
              estado: endereco.estado.toUpperCase(),
            }),
          },
        });
      await tx.idoso.update({
        where: { id },
        data: {
          ...dados,
          ...(dto.dataNascimento !== undefined && {
            dataNascimento: new Date(dto.dataNascimento),
          }),
          ...((endereco || proprios.length) && {
            endereco: { connect: { id: enderecoId } },
          }),
        },
      });
      for (const vinculo of proprios) {
        await tx.responsavel.update({
          where: { id: vinculo.responsavelId },
          data: {
            ...(dto.cpf != null && { cpf: dto.cpf }),
            ...(dto.telefone != null && { telefone: dto.telefone }),
            ...(dto.dataNascimento !== undefined && {
              dataNascimento: new Date(dto.dataNascimento),
            }),
            ...(endereco !== undefined && {
              endereco: { connect: { id: enderecoId } },
            }),
            ...((dto.nome !== undefined || dto.nomeSocial !== undefined) && {
              usuario: {
                update: {
                  ...(dto.nome !== undefined && { nome: dto.nome }),
                  ...(dto.nomeSocial !== undefined && {
                    nomeSocial: dto.nomeSocial,
                  }),
                },
              },
            }),
          },
        });
      }
      return tx.idoso.findUniqueOrThrow({
        where: { id },
        include: incluirFotoIdoso,
      });
    });
    return apresentarIdoso(atualizado);
  }

  private async destinoFoto(id: number) {
    const idoso = await this.prisma.idoso.findUnique({
      where: { id },
      select: {
        responsavelIdosos: {
          where: { parentesco: 'PROPRIO' },
          select: { responsavel: { select: { usuarioId: true } } },
        },
      },
    });
    if (!idoso) throw new NotFoundException('Idoso não encontrado.');
    return idoso.responsavelIdosos[0]?.responsavel.usuarioId;
  }
  async salvarFoto(id: number, imagem?: Imagem) {
    const dados = dadosImagemPerfil(imagem);
    const usuarioId = await this.destinoFoto(id);
    const foto = usuarioId
      ? await this.prisma.fotoPerfil.upsert({
          where: { usuarioId },
          create: { usuarioId, ...dados },
          update: dados,
          select: { updatedAt: true },
        })
      : await this.prisma.fotoIdoso.upsert({
          where: { idosoId: id },
          create: { idosoId: id, ...dados },
          update: dados,
          select: { updatedAt: true },
        });
    return { fotoVersao: foto.updatedAt };
  }
  async foto(id: number) {
    const usuarioId = await this.destinoFoto(id);
    const select = { mime: true, conteudo: true };
    const foto = usuarioId
      ? await this.prisma.fotoPerfil.findUnique({
          where: { usuarioId },
          select,
        })
      : await this.prisma.fotoIdoso.findUnique({
          where: { idosoId: id },
          select,
        });
    if (!foto) throw new NotFoundException('Foto não encontrada.');
    return foto;
  }
  async removerFoto(id: number) {
    const usuarioId = await this.destinoFoto(id);
    return usuarioId
      ? this.prisma.fotoPerfil.deleteMany({ where: { usuarioId } })
      : this.prisma.fotoIdoso.deleteMany({ where: { idosoId: id } });
  }
}
