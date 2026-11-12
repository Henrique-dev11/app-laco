import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { calcularHorarios, DIAS, partesLocais } from './horarios.js';

export function validarMesAgenda(mes: string) {
  const atual = partesLocais(new Date()).data.slice(0, 7);
  if (mes < atual || mes > `${Number(atual.slice(0, 4)) + 1}${atual.slice(4)}`)
    throw new BadRequestException(
      'Consulte do mês atual até os próximos 12 meses.',
    );
}
export async function consultarAgenda(
  db: Prisma.TransactionClient,
  cuidadorId: number,
  mes: string,
  duracao: number,
) {
  validarMesAgenda(mes);
  const inicio = new Date(`${mes}-01T00:00:00Z`);
  const fim = new Date(inicio);
  fim.setUTCMonth(fim.getUTCMonth() + 1);
  fim.setUTCDate(2);
  const [disponibilidade, ocupados] = await Promise.all([
    db.disponibilidade.findMany({ where: { cuidadorId, ativo: true } }),
    db.agendamento.findMany({
      where: {
        cuidadorId,
        ativo: true,
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
      select: { inicio: true, fim: true },
    }),
  ]);
  return calcularHorarios(mes, duracao, disponibilidade, ocupados);
}
/** O chamador mantém a trava do cuidador até confirmar a reserva. */
export async function validarJanela(
  db: Prisma.TransactionClient,
  cuidadorId: number,
  inicio: Date,
  duracao: number,
) {
  if (
    !Number.isFinite(inicio.getTime()) ||
    inicio <= new Date() ||
    inicio.getUTCSeconds() !== 0 ||
    inicio.getUTCMilliseconds() !== 0
  )
    throw new BadRequestException(
      'Informe uma data futura com precisão de minutos.',
    );
  const fim = new Date(inicio.getTime() + duracao * 60000);
  const local = partesLocais(inicio),
    final = partesLocais(fim);
  if (local.data !== final.data)
    throw new BadRequestException('O atendimento deve terminar no mesmo dia.');
  const semana = DIAS[new Date(`${local.data}T12:00:00Z`).getUTCDay()];
  const hora = (v: string) => new Date(`1970-01-01T${v}:00Z`);
  const disponivel = await db.disponibilidade.findFirst({
    where: {
      cuidadorId,
      ativo: true,
      diaSemana: semana,
      horaInicio: { lte: hora(local.hora) },
      horaFim: { gte: hora(final.hora) },
    },
  });
  if (!disponivel)
    throw new BadRequestException(
      'O horário não está dentro da disponibilidade do cuidador (horário de São Paulo). Revise a proposta ou o agendamento.',
    );
  if (
    await db.agendamento.findFirst({
      where: {
        cuidadorId,
        ativo: true,
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
      select: { id: true },
    })
  )
    throw new ConflictException(
      'O cuidador já tem um atendimento neste horário. Revise os horários.',
    );
  return fim;
}
