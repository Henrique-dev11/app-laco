import { IsBoolean, IsEnum, ValidateIf, Matches } from 'class-validator';

import { DiaSemana } from '../../generated/prisma/client.js';

export class UpdateDisponibilidadeDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(DiaSemana)
  diaSemana?: DiaSemana;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFim?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  ativo?: boolean;
}
