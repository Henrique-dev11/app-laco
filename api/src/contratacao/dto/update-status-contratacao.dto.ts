import { IsEnum, IsOptional, Matches } from 'class-validator';
import { StatusContratacao } from '../../generated/prisma/client.js';

export class UpdateStatusContratacaoDto {
  @IsEnum(StatusContratacao)
  status!: StatusContratacao;

  @IsOptional()
  @Matches(/^[A-Za-z0-9]{6}$/, {
    message: 'O código de confirmação deve ter 6 letras ou números.',
  })
  codigo?: string;
}
