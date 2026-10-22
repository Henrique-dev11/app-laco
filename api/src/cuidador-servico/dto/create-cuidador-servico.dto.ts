import {
  ValidateIf,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateCuidadorServicoDto {
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  @Max(99999999.99)
  preco: number;

  @IsInt()
  @Min(1)
  @Max(1440)
  duracaoMinutos: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  ativo?: boolean;
}
