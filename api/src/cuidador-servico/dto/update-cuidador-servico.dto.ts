import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateCuidadorServicoDto {
  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  preco?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  duracaoMinutos?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}