import {
  IsInt,
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

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}