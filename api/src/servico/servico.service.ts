import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateServicoDto } from './dto/create-servico.dto.js';
import { UpdateServicoDto } from './dto/update-servico.dto.js';

@Injectable()
export class ServicoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServicoDto) {
    const nome = dto.nome.trim();

    const servicoExistente =
      await this.prisma.servico.findFirst({
        where: {
          nome: {
            equals: nome,
            mode: 'insensitive',
          },
        },
      });

    if (servicoExistente) {
      throw new ConflictException(
        'Serviço já cadastrado.',
      );
    }

    return this.prisma.servico.create({
      data: {
        nome,
        descricao: dto.descricao?.trim(),
      },
    });
  }

  findAll() {
    return this.prisma.servico.findMany({
      orderBy: {
        nome: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const servico =
      await this.prisma.servico.findUnique({
        where: {
          id,
        },
      });

    if (!servico) {
      throw new NotFoundException(
        'Serviço não encontrado.',
      );
    }

    return servico;
  }

  async update(
    id: number,
    dto: UpdateServicoDto,
  ) {
    await this.findOne(id);

    let nome: string | undefined;

    if (dto.nome !== undefined) {
      nome = dto.nome.trim();

      const servicoComMesmoNome =
        await this.prisma.servico.findFirst({
          where: {
            nome: {
              equals: nome,
              mode: 'insensitive',
            },

            NOT: {
              id,
            },
          },
        });

      if (servicoComMesmoNome) {
        throw new ConflictException(
          'Serviço já cadastrado.',
        );
      }
    }

    return this.prisma.servico.update({
      where: {
        id,
      },

      data: {
        ...(nome !== undefined && {
          nome,
        }),

        ...(dto.descricao !== undefined && {
          descricao: dto.descricao.trim(),
        }),

        ...(dto.ativo !== undefined && {
          ativo: dto.ativo,
        }),
      },
    });
  }
}