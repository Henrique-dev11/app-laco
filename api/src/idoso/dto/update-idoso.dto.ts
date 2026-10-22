import { Type, Transform } from 'class-transformer';

import {
  IsDateString,
  IsNotEmpty,
  ValidateIf,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { UpdateEnderecoDto } from '../../responsavel/dto/update-endereco.dto.js';

export class UpdateIdosoDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  nomeSocial?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString({ strict: true })
  dataNascimento?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(30)
  sexo?: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Matches(/^\d{10,13}$/)
  telefone?: string | null;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @Matches(/^\d{11}$/)
  cpf?: string | null;

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

  @ValidateIf((_object, value) => value !== undefined)
  @ValidateNested()
  @Type(() => UpdateEnderecoDto)
  endereco?: UpdateEnderecoDto;
}
