import {
  IsBoolean,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';

import { DiaSemana } from '../../generated/prisma/client.js';

export class UpdateDisponibilidadeDto {
  @IsOptional()
  @IsEnum(DiaSemana)
  diaSemana?: DiaSemana;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFim?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}