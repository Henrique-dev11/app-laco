import { Type } from 'class-transformer';

import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { UpdateEnderecoDto } from '../../responsavel/dto/update-endereco.dto.js';

export class UpdateCuidadorDto {
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
  @IsString()
  biografia?: string;

  @IsOptional()
  @IsString()
  experienciaProfissional?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registroProfissional?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEnderecoDto)
  endereco?: UpdateEnderecoDto;
}