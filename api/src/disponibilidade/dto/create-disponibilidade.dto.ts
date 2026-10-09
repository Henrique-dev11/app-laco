import {
  IsEnum,
  Matches,
} from 'class-validator';

import { DiaSemana } from '../../generated/prisma/client.js';

export class CreateDisponibilidadeDto {
  @IsEnum(DiaSemana)
  diaSemana: DiaSemana;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFim: string;
}