import { IsEnum } from 'class-validator';
import { StatusContratacao } from '../../generated/prisma/client.js';

export class UpdateStatusContratacaoDto {
  @IsEnum(StatusContratacao)
  status!: StatusContratacao;
}