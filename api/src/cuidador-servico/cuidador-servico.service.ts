import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCuidadorServicoDto } from './dto/create-cuidador-servico.dto.js';
import { UpdateCuidadorServicoDto } from './dto/update-cuidador-servico.dto.js';

@Injectable()
export class CuidadorServicoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    cuidadorId: number,
    servicoId: number,
    dto: CreateCuidadorServicoDto,
  ) {
    const cuidador =
      await this.prisma.cuidador.findUnique({
        where: {
          id: cuidadorId,
        },
      });

    if (!cuidador) {
      throw new NotFoundException(
        'Cuidador não encontrado.',
      );
    }

    const servico =
      await this.prisma.servico.findUnique({
        where: {
          id: servicoId,
        },
      });

    if (!servico) {
      throw new NotFoundException(
        'Serviço não encontrado.',
      );
    }

    if (!servico.ativo) {
      throw new BadRequestException(
        'O serviço informado está inativo.',
      );
    }

    const vinculoExistente =
      await this.prisma.cuidadorServico.findUnique({
        where: {
          cuidadorId_servicoId: {
            cuidadorId,
            servicoId,
          },
        },
      });

    if (vinculoExistente) {
      throw new ConflictException(
        'O cuidador já oferece este serviço.',
      );
    }

    return this.prisma.cuidadorServico.create({
      data: {
        cuidadorId,
        servicoId,
        preco: dto.preco,
        duracaoMinutos: dto.duracaoMinutos,
        ativo: dto.ativo ?? true,
      },

      select: {
        id: true,
        preco: true,
        duracaoMinutos: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,

        cuidador: {
          select: {
            id: true,

            usuario: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },

        servico: {
          select: {
            id: true,
            nome: true,
            descricao: true,
            ativo: true,
          },
        },
      },
    });
  }

  async findByCuidador(cuidadorId: number) {
  const cuidador =
    await this.prisma.cuidador.findUnique({
      where: {
        id: cuidadorId,
      },
    });

  if (!cuidador) {
    throw new NotFoundException(
      'Cuidador não encontrado.',
    );
  }

  return this.prisma.cuidadorServico.findMany({
    where: {
      cuidadorId,
    },

    select: {
      id: true,
      preco: true,
      duracaoMinutos: true,
      ativo: true,
      createdAt: true,
      updatedAt: true,

      servico: {
        select: {
          id: true,
          nome: true,
          descricao: true,
          ativo: true,
        },
      },
    },

    orderBy: {
      servico: {
        nome: 'asc',
      },
    },
  });
}

async update(
  cuidadorId: number,
  servicoId: number,
  dto: UpdateCuidadorServicoDto,
) {
  const cuidadorServico =
    await this.prisma.cuidadorServico.findUnique({
      where: {
        cuidadorId_servicoId: {
          cuidadorId,
          servicoId,
        },
      },
    });

  if (!cuidadorServico) {
    throw new NotFoundException(
      'Serviço do cuidador não encontrado.',
    );
  }

  return this.prisma.cuidadorServico.update({
    where: {
      cuidadorId_servicoId: {
        cuidadorId,
        servicoId,
      },
    },

    data: {
      ...(dto.preco !== undefined && {
        preco: dto.preco,
      }),

      ...(dto.duracaoMinutos !== undefined && {
        duracaoMinutos: dto.duracaoMinutos,
      }),

      ...(dto.ativo !== undefined && {
        ativo: dto.ativo,
      }),
    },

    select: {
      id: true,
      preco: true,
      duracaoMinutos: true,
      ativo: true,
      createdAt: true,
      updatedAt: true,

      servico: {
        select: {
          id: true,
          nome: true,
          descricao: true,
          ativo: true,
        },
      },
    },
  });
}

}