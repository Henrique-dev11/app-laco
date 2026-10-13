import { IsIn } from 'class-validator';
export class VerificacaoCuidadorDto {
  @IsIn(['PENDENTE', 'APROVADO', 'REJEITADO'])
  statusVerificacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
}
