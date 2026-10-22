import { UpdateUsuarioDto } from '../../usuario/dto/update-usuario.dto.js';
import { Type } from 'class-transformer';

import {
  IsDateString,
  ValidateIf,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { UpdateEnderecoDto } from '../../responsavel/dto/update-endereco.dto.js';

export class UpdateCuidadorDto {
  @ValidateIf((_object, value) => value !== undefined)
  @ValidateNested()
  @Type(() => UpdateUsuarioDto)
  usuario?: UpdateUsuarioDto;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{10,13}$/)
  telefone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{11}$/)
  cpf?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDateString({ strict: true })
  dataNascimento?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  biografia?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  experienciaProfissional?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  registroProfissional?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @ValidateNested()
  @Type(() => UpdateEnderecoDto)
  endereco?: UpdateEnderecoDto;
}
