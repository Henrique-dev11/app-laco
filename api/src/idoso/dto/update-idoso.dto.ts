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

export class UpdateIdosoDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nome?: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  sexo?: string;

  @IsOptional()
  @Matches(/^\d{10,13}$/)
  telefone?: string;

  @IsOptional()
  @Matches(/^\d{11}$/)
  cpf?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  necessidadesEspeciais?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateEnderecoDto)
  endereco?: UpdateEnderecoDto;
}