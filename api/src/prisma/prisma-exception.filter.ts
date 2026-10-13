import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    error:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientUnknownRequestError,
    host: ArgumentsHost,
  ) {
    let status = 500;
    let message = 'Não foi possível concluir a operação.';
    if (error.message.includes('disponibilidade_sem_sobreposicao')) {
      status = 409;
      message = 'Este horário entra em conflito com outra disponibilidade.';
    } else if (error.message.includes('agendamento_sem_sobreposicao')) {
      status = 409;
      message = 'O cuidador já tem um atendimento neste horário.';
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        status = 409;
        message = 'Já existe um cadastro com estes dados.';
      }
      if (error.code === 'P2003') {
        status = 400;
        message = 'O registro relacionado não existe ou está em uso.';
      }
      if (error.code === 'P2025') {
        status = 404;
        message = 'Registro não encontrado.';
      }
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(status)
      .json({ statusCode: status, message });
  }
}
