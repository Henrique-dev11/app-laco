import { Type, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export enum CategoriaAdmin {
  CUIDADORES = 'cuidadores',
  RESPONSAVEIS = 'responsaveis',
  IDOSOS = 'idosos',
  INDEPENDENTES = 'independentes',
}
export class PaginaAdminDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) pagina = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite = 20;
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  busca?: string;
  @IsOptional() @IsIn(['ATIVO', 'BLOQUEADO', 'INATIVO']) situacao?:
    'ATIVO' | 'BLOQUEADO' | 'INATIVO';
  @IsOptional() @IsIn(['PENDENTE', 'APROVADO', 'REJEITADO']) verificacao?:
    'PENDENTE' | 'APROVADO' | 'REJEITADO';
  @IsOptional() @IsIn(['COM_VINCULO', 'SEM_VINCULO']) vinculo?:
    'COM_VINCULO' | 'SEM_VINCULO';
  @IsOptional()
  @IsIn(['SOLICITADA', 'ACEITA', 'RECUSADA', 'CANCELADA', 'CONCLUIDA'])
  status?: 'SOLICITADA' | 'ACEITA' | 'RECUSADA' | 'CANCELADA' | 'CONCLUIDA';
}
export class PeriodoAdminDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  inicio?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  fim?: string;
  @IsOptional() @IsIn(['dia', 'semana', 'mes', 'ano']) agrupamento:
    'dia' | 'semana' | 'mes' | 'ano' = 'dia';
}
export class ContratosAdminDto extends PaginaAdminDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  inicio?: string;
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  fim?: string;
}
