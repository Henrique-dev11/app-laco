import {
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';

import { Parentesco } from '../../generated/prisma/client.js';

export class UpdateResponsavelIdosoDto {
  @IsOptional()
  @IsEnum(Parentesco)
  parentesco?: Parentesco;

  @IsOptional()
  @IsBoolean()
  responsavelPrincipal?: boolean;
}