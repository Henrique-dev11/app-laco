import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { TipoUsuario } from '../../generated/prisma/client.js';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;

  @IsIn([
    TipoUsuario.RESPONSAVEL,
    TipoUsuario.CUIDADOR,
  ])
  tipoUsuario: TipoUsuario;
}