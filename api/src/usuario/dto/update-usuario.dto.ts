import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nomeSocial?: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
