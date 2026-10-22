import {
  Matches,
  ValidateIf,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUsuarioDto {
  @IsOptional()
  @Matches(/^\d{10,13}$/)
  telefone2?: string | null;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(150)
  nomeSocial?: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;
}
