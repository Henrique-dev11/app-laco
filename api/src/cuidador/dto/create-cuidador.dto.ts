import { Type } from 'class-transformer';

import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { CreateEnderecoDto } from '../../responsavel/dto/create-endereco.dto.js';

export class CreateCuidadorDto {
  @IsInt()
  @Min(1)
  usuarioId: number;

  @Matches(/^\d{10,13}$/)
  telefone: string;

  @Matches(/^\d{11}$/)
  cpf: string;

  @IsDateString()
  dataNascimento: string;

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

  @ValidateNested()
  @Type(() => CreateEnderecoDto)
  endereco: CreateEnderecoDto;
}