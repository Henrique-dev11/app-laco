import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateCuidadorServicoDto } from './create-cuidador-servico.dto.js';

export class CreatePersonalizadoDto extends CreateCuidadorServicoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;
}
