import { Type } from 'class-transformer';

import {
  IsDateString,
  IsInt,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

import { CreateEnderecoDto } from './create-endereco.dto.js';

export class CreateResponsavelDto {
  @IsInt()
  @Min(1)
  usuarioId: number;

  @Matches(/^\d{10,13}$/)
  telefone: string;

  @Matches(/^\d{11}$/)
  cpf: string;

  @IsDateString()
  dataNascimento: string;

  @ValidateNested()
  @Type(() => CreateEnderecoDto)
  endereco: CreateEnderecoDto;
}