import { Parentesco } from '../../generated/prisma/client.js';
import { Type, Transform } from 'class-transformer';

import {
  IsDateString,
  IsDefined,
  IsObject,
  IsEnum,
  IsNotEmpty,
  ValidateIf,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { CreateEnderecoDto } from '../../responsavel/dto/create-endereco.dto.js';

export class CreateIdosoDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Parentesco)
  parentesco?: Parentesco;
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  nomeSocial?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @IsDateString({ strict: true })
  dataNascimento: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(30)
  sexo?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{10,13}$/)
  telefone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{11}$/)
  cpf?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  observacoes?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  necessidadesEspeciais?: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateEnderecoDto)
  endereco: CreateEnderecoDto;
}
