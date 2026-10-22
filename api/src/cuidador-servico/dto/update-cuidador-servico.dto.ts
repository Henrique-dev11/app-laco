import {
  ValidateIf,
  IsBoolean,
  IsInt,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateCuidadorServicoDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  @Max(99999999.99)
  preco?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(1440)
  duracaoMinutos?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  ativo?: boolean;
}
