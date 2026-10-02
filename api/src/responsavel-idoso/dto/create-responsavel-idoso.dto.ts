import {
  IsBoolean,
  IsEnum,
  IsOptional,
} from 'class-validator';

import { Parentesco } from '../../generated/prisma/client.js';

export class CreateResponsavelIdosoDto {
  @IsEnum(Parentesco)
  parentesco: Parentesco;

  @IsOptional()
  @IsBoolean()
  responsavelPrincipal?: boolean;
}