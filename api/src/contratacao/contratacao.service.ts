import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { StatusContratacao } from '../generated/prisma/client.js';

import { CreateContratacaoDto } from './dto/create-contratacao.dto.js';
import { UpdateStatusContratacaoDto } from './dto/update-status-contratacao.dto.js';

const contratacaoInclude = {
  responsavel: {
    select: {
      id: true,
      usuario: {
        select: {
          id: true,
          nome: true,
          email: true,
        },
      },
    },
  },
  idoso: {
    select: {
      id: true,
      nome: true,
    },
  },
  cuidadorServico: {
    select: {
      id: true,
      preco: true,
      duracaoMinutos: true,
      servico: {
        select: {
          id: true,
          nome: true,
          ativo: true,
        },
      },
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
    },
  },
} as const;

@Injectable()
export class ContratacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContratacaoDto) {
    const responsavel = await this.prisma.responsavel.findUnique({
      where: { id: dto.responsavelId },
    });

    if (!responsavel) {
      throw new NotFoundException('Responsável não encontrado.');
    }

    const idoso = await this.prisma.idoso.findUnique({
      where: { id: dto.idosoId },
    });

    if (!idoso) {
      throw new NotFoundException('Idoso não encontrado.');
    }

    const vinculo = await this.prisma.responsavelIdoso.findUnique({
      where: {
        responsavelId_idosoId: {
          responsavelId: dto.responsavelId,
          idosoId: dto.idosoId,
        },
      },
    });

    if (!vinculo) {
      throw new BadRequestException(
        'O responsável não está vinculado ao idoso.',
      );
    }

    const oferta = await this.prisma.cuidadorServico.findUnique({
      where: { id: dto.cuidadorServicoId },
      include: { servico: true },
    });

    if (!oferta) {
      throw new NotFoundException(
        'Serviço oferecido pelo cuidador não encontrado.',
      );
    }

    if (!oferta.ativo || !oferta.servico.ativo) {
      throw new BadRequestException(
        'Este serviço não está disponível para contratação.',
      );
    }

    return this.prisma.contratacao.create({
      data: {
        responsavelId: dto.responsavelId,
        idosoId: dto.idosoId,
        cuidadorServicoId: dto.cuidadorServicoId,
        valorAcordado: oferta.preco,
        ...(dto.observacoes !== undefined
          ? { observacoes: dto.observacoes }
          : {}),
      },
      include: contratacaoInclude,
    });
  }

  async findAll() {
    return this.prisma.contratacao.findMany({
      orderBy: { createdAt: 'desc' },
      include: contratacaoInclude,
    });
  }

  async findOne(id: number) {
    const contratacao = await this.prisma.contratacao.findUnique({
      where: { id },
      include: contratacaoInclude,
    });

    if (!contratacao) {
      throw new NotFoundException('Contratação não encontrada.');
    }

    return contratacao;
  }

  async updateStatus(
    id: number,
    dto: UpdateStatusContratacaoDto,
  ) {
    const contratacao = await this.prisma.contratacao.findUnique({
      where: { id },
    });

    if (!contratacao) {
      throw new NotFoundException('Contratação não encontrada.');
    }

    const transicoesPermitidas: Record<
      StatusContratacao,
      StatusContratacao[]
    > = {
      SOLICITADA: [
        StatusContratacao.ACEITA,
        StatusContratacao.RECUSADA,
        StatusContratacao.CANCELADA,
      ],
      ACEITA: [
        StatusContratacao.CANCELADA,
        StatusContratacao.CONCLUIDA,
      ],
      RECUSADA: [],
      CANCELADA: [],
      CONCLUIDA: [],
    };

    if (
      !transicoesPermitidas[contratacao.status].includes(dto.status)
    ) {
      throw new BadRequestException(
        `Não é permitido alterar o status de ${contratacao.status} para ${dto.status}.`,
      );
    }

    return this.prisma.contratacao.update({
      where: { id },
      data: { status: dto.status },
      include: contratacaoInclude,
    });
  }
}