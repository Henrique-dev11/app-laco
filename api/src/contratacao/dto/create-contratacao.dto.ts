import {
  ValidateIf,
  IsInt,
  IsNumber,
  Max,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateContratacaoDto {
  @IsInt()
  @Min(1)
  responsavelId!: number;

  @IsInt()
  @Min(1)
  idosoId!: number;

  @IsInt()
  @Min(1)
  cuidadorServicoId!: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  precoReferenciaEsperado?: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(1440)
  duracaoEsperadaMinutos?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
