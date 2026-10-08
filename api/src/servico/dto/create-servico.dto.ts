import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateServicoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}