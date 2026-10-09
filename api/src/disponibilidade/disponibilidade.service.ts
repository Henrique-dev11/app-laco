import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto.js';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto.js';

@Injectable()
export class DisponibilidadeService {
  constructor(private readonly prisma: PrismaService) {}

  private horaParaMinutos(hora: string) {
    const [horas, minutos] = hora
      .split(':')
      .map(Number);

    return horas * 60 + minutos;
  }

  private horaParaDate(hora: string) {
    return new Date(
      `1970-01-01T${hora}:00.000Z`,
    );
  }

  private formatarHora(data: Date) {
    const horas = String(
      data.getUTCHours(),
    ).padStart(2, '0');

    const minutos = String(
      data.getUTCMinutes(),
    ).padStart(2, '0');

    return `${horas}:${minutos}`;
  }

  async create(
    cuidadorId: number,
    dto: CreateDisponibilidadeDto,
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

    const inicioMinutos =
      this.horaParaMinutos(dto.horaInicio);

    const fimMinutos =
      this.horaParaMinutos(dto.horaFim);

    if (fimMinutos <= inicioMinutos) {
      throw new BadRequestException(
        'A hora final deve ser maior que a hora inicial.',
      );
    }

    const horaInicio =
      this.horaParaDate(dto.horaInicio);

    const horaFim =
      this.horaParaDate(dto.horaFim);

    const horarioSobreposto =
      await this.prisma.disponibilidade.findFirst({
        where: {
          cuidadorId,
          diaSemana: dto.diaSemana,
          ativo: true,

          horaInicio: {
            lt: horaFim,
          },

          horaFim: {
            gt: horaInicio,
          },
        },
      });

    if (horarioSobreposto) {
      throw new ConflictException(
        'Este horário entra em conflito com outra disponibilidade.',
      );
    }

    const disponibilidade =
      await this.prisma.disponibilidade.create({
        data: {
          cuidadorId,
          diaSemana: dto.diaSemana,
          horaInicio,
          horaFim,
        },
      });

    return {
      ...disponibilidade,

      horaInicio: this.formatarHora(
        disponibilidade.horaInicio,
      ),

      horaFim: this.formatarHora(
        disponibilidade.horaFim,
      ),
    };
  }

  async findByCuidador(
    cuidadorId: number,
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

    const disponibilidades =
      await this.prisma.disponibilidade.findMany({
        where: {
          cuidadorId,
        },

        orderBy: [
          {
            diaSemana: 'asc',
          },
          {
            horaInicio: 'asc',
          },
        ],
      });

    return disponibilidades.map(
      (disponibilidade) => ({
        ...disponibilidade,

        horaInicio: this.formatarHora(
          disponibilidade.horaInicio,
        ),

        horaFim: this.formatarHora(
          disponibilidade.horaFim,
        ),
      }),
    );
  }

  async update(
  id: number,
  dto: UpdateDisponibilidadeDto,
) {
  const disponibilidade =
    await this.prisma.disponibilidade.findUnique({
      where: {
        id,
      },
    });

  if (!disponibilidade) {
    throw new NotFoundException(
      'Disponibilidade não encontrada.',
    );
  }

  const diaSemana =
    dto.diaSemana ?? disponibilidade.diaSemana;

  const horaInicioTexto =
    dto.horaInicio ??
    this.formatarHora(disponibilidade.horaInicio);

  const horaFimTexto =
    dto.horaFim ??
    this.formatarHora(disponibilidade.horaFim);

  const ativo =
    dto.ativo ?? disponibilidade.ativo;

  const inicioMinutos =
    this.horaParaMinutos(horaInicioTexto);

  const fimMinutos =
    this.horaParaMinutos(horaFimTexto);

  if (fimMinutos <= inicioMinutos) {
    throw new BadRequestException(
      'A hora final deve ser maior que a hora inicial.',
    );
  }

  const horaInicio =
    this.horaParaDate(horaInicioTexto);

  const horaFim =
    this.horaParaDate(horaFimTexto);

  if (ativo) {
    const horarioSobreposto =
      await this.prisma.disponibilidade.findFirst({
        where: {
          cuidadorId: disponibilidade.cuidadorId,
          diaSemana,
          ativo: true,

          id: {
            not: id,
          },

          horaInicio: {
            lt: horaFim,
          },

          horaFim: {
            gt: horaInicio,
          },
        },
      });

    if (horarioSobreposto) {
      throw new ConflictException(
        'Este horário entra em conflito com outra disponibilidade.',
      );
    }
  }

  const atualizado =
    await this.prisma.disponibilidade.update({
      where: {
        id,
      },

      data: {
        diaSemana,
        horaInicio,
        horaFim,
        ativo,
      },
    });

  return {
    ...atualizado,

    horaInicio: this.formatarHora(
      atualizado.horaInicio,
    ),

    horaFim: this.formatarHora(
      atualizado.horaFim,
    ),
  };
}
}