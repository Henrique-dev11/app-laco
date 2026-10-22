import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateAvaliacaoDto {
  @IsInt({ message: 'A nota deve ser um número inteiro de 1 a 5.' })
  @Min(1, { message: 'A nota deve ser de 1 a 5.' })
  @Max(5, { message: 'A nota deve ser de 1 a 5.' })
  nota!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
