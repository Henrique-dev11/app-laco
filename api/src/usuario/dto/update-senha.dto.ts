import {
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateSenhaDto {
  @IsString()
  @MinLength(8)
  senhaAtual: string;

  @IsString()
  @MinLength(8)
  novaSenha: string;
}