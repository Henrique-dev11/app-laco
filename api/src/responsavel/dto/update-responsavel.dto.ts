import { Type } from 'class-transformer';

import {
  IsDateString,
  IsOptional,
  Matches,
  ValidateNested,
} from 'class-validator';

import { UpdateEnderecoDto } from './update-endereco.dto.js';

export class UpdateResponsavelDto {
  @IsOptional()
  @Matches(/^\d{10,13}$/)
  telefone?: string;

  @IsOptional()
  @Matches(/^\d{11}$/)
  cpf?: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEnderecoDto)
  endereco?: UpdateEnderecoDto;
}