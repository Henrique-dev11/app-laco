import { Type, Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateEnderecoDto } from '../responsavel/dto/create-endereco.dto.js';
import { Parentesco } from '../generated/prisma/client.js';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email: string;
  @IsString() @MinLength(8) @MaxLength(72) senha: string;
}

class OfertaDto {
  @IsInt() @Min(1) servicoId: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) preco: number;
  @IsInt() @Min(1) duracaoMinutos: number;
}

class IdosoCadastroDto {
  @IsString() @IsNotEmpty() @MaxLength(150) nome: string;
  @IsOptional() @IsString() @MaxLength(150) nomeSocial?: string;
  @Matches(/^\d{11}$/) cpf: string;
  @IsDateString({ strict: true }) dataNascimento: string;
  @IsIn(Object.values(Parentesco)) parentesco: Parentesco;
  @ValidateNested() @Type(() => CreateEnderecoDto) endereco: CreateEnderecoDto;
}

export class CadastroDto extends LoginDto {
  @IsIn(['responsavel', 'cuidador', 'idoso']) perfil:
    'responsavel' | 'cuidador' | 'idoso';
  @IsString() @IsNotEmpty() @MaxLength(150) nome: string;
  @IsOptional() @IsString() @MaxLength(150) nomeSocial?: string;
  @Matches(/^\d{10,13}$/) telefone: string;
  @IsOptional() @Matches(/^\d{10,13}$/) telefone2?: string;
  @Matches(/^\d{11}$/) cpf: string;
  @IsDateString({ strict: true }) dataNascimento: string;
  @ValidateNested() @Type(() => CreateEnderecoDto) endereco: CreateEnderecoDto;
  @IsBoolean()
  @Equals(true, { message: 'É necessário aceitar os termos.' })
  aceitoTermos: boolean;
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  servicoIds: number[];
  @IsOptional()
  @ValidateNested()
  @Type(() => IdosoCadastroDto)
  idoso?: IdosoCadastroDto;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfertaDto)
  ofertas?: OfertaDto[];
}
