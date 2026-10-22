import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto.js';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto.js';

const horaDate = (hora: string) => new Date(`1970-01-01T${hora}:00.000Z`);
const horaTexto = (hora: Date) => hora.toISOString().slice(11, 16);
const apresentar = <T extends { horaInicio: Date; horaFim: Date }>(
  item: T,
) => ({
  ...item,
  horaInicio: horaTexto(item.horaInicio),
  horaFim: horaTexto(item.horaFim),
});
@Injectable()
export class DisponibilidadeService {
  constructor(private readonly prisma: PrismaService) {}
  async create(cuidadorId: number, dto: CreateDisponibilidadeDto) {
    if (dto.horaFim <= dto.horaInicio)
      throw new BadRequestException(
        'A hora final deve ser maior que a hora inicial.',
      );
    return this.prisma.$transaction(async (tx) => {
      const cuidador = await tx.cuidador.findUnique({
        where: { id: cuidadorId },
      });
      if (!cuidador) throw new NotFoundException('Cuidador não encontrado.');
      await tx.$queryRaw`SELECT id FROM "Cuidador" WHERE id = ${cuidadorId} FOR UPDATE`;
      const horaInicio = horaDate(dto.horaInicio),
        horaFim = horaDate(dto.horaFim);
      const conflito = await tx.disponibilidade.findFirst({
        where: {
          cuidadorId,
          diaSemana: dto.diaSemana,
          ativo: true,
          horaInicio: { lt: horaFim },
          horaFim: { gt: horaInicio },
        },
      });
      if (conflito)
        throw new ConflictException(
          'Este horário entra em conflito com outra disponibilidade.',
        );
      return apresentar(
        await tx.disponibilidade.create({
          data: { cuidadorId, diaSemana: dto.diaSemana, horaInicio, horaFim },
        }),
      );
    });
  }
  async findByCuidador(cuidadorId: number) {
    if (!(await this.prisma.cuidador.findUnique({ where: { id: cuidadorId } })))
      throw new NotFoundException('Cuidador não encontrado.');
    return (
      await this.prisma.disponibilidade.findMany({
        where: { cuidadorId },
        orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
      })
    ).map(apresentar);
  }
  async update(id: number, dto: UpdateDisponibilidadeDto) {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.disponibilidade.findUnique({ where: { id } });
      if (!original)
        throw new NotFoundException('Disponibilidade não encontrada.');
      await tx.$queryRaw`SELECT id FROM "Cuidador" WHERE id = ${original.cuidadorId} FOR UPDATE`;
      const atual = await tx.disponibilidade.findUniqueOrThrow({
        where: { id },
      });
      const diaSemana = dto.diaSemana ?? atual.diaSemana;
      const horaInicio =
        dto.horaInicio === undefined
          ? atual.horaInicio
          : horaDate(dto.horaInicio);
      const horaFim =
        dto.horaFim === undefined ? atual.horaFim : horaDate(dto.horaFim);
      const ativo = dto.ativo ?? atual.ativo;
      if (horaFim <= horaInicio)
        throw new BadRequestException(
          'A hora final deve ser maior que a hora inicial.',
        );
      if (
        ativo &&
        (await tx.disponibilidade.findFirst({
          where: {
            cuidadorId: atual.cuidadorId,
            diaSemana,
            ativo: true,
            id: { not: id },
            horaInicio: { lt: horaFim },
            horaFim: { gt: horaInicio },
          },
        }))
      )
        throw new ConflictException(
          'Este horário entra em conflito com outra disponibilidade.',
        );
      // Alterar recorrência não cancela atendimentos já confirmados.
      return apresentar(
        await tx.disponibilidade.update({
          where: { id },
          data: { diaSemana, horaInicio, horaFim, ativo },
        }),
      );
    });
  }
}
