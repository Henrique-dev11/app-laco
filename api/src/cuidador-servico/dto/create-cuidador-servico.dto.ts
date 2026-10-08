import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateCuidadorServicoDto {
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  preco: number;

  @IsInt()
  @Min(1)
  duracaoMinutos: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}