import { Type } from 'class-transformer';

import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { CreateEnderecoDto } from '../../responsavel/dto/create-endereco.dto.js';

export class CreateIdosoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @IsDateString()
  dataNascimento: string;

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

  @ValidateNested()
  @Type(() => CreateEnderecoDto)
  endereco: CreateEnderecoDto;
}