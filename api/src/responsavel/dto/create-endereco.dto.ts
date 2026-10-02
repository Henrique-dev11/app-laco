import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateEnderecoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  rua: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numero: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  complemento?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bairro: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cidade: string;

  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  estado: string;

  @IsString()
  @Matches(/^\d{8}$/)
  cep: string;
}