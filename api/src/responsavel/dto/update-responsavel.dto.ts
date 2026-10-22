import { UpdateUsuarioDto } from '../../usuario/dto/update-usuario.dto.js';
import { Type } from 'class-transformer';

import {
  IsDateString,
  ValidateIf,
  Matches,
  ValidateNested,
} from 'class-validator';

import { UpdateEnderecoDto } from './update-endereco.dto.js';

export class UpdateResponsavelDto {
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
  @ValidateNested()
  @Type(() => UpdateEnderecoDto)
  endereco?: UpdateEnderecoDto;
}
