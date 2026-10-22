import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  Min,
  Max,
  ValidateIf,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateServicoDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  ativo?: boolean;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  precoSugerido?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(1440)
  duracaoSugeridaMinutos?: number;
}
