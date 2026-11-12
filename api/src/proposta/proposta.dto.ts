import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
export class ItemPropostaDto {
  @IsInt() @Min(1) cuidadorServicoId!: number;
  @IsOptional() @IsInt() @Min(1) contratacaoOrigemId?: number;
  @IsString() @Matches(/^\d{1,7}(\.\d{1,2})?$/) preco!: string;
  @IsInt() @Min(1) @Max(720) duracaoMinutos!: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsISO8601({ strict: true }, { each: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/, { each: true })
  inicios!: string[];
}
export class CriarPropostaDto {
  @IsInt() @Min(1) idosoId!: number;
  @IsOptional() @IsInt() @Min(1) anteriorId?: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ItemPropostaDto)
  itens!: ItemPropostaDto[];
  @IsString() @Matches(/^\d{1,8}(\.\d{1,2})?$/) total!: string;
  @IsOptional() @IsString() @MaxLength(2000) observacoes?: string;
}
export class RespostaPropostaDto {
  @IsIn(['ACEITA', 'RECUSADA', 'ALTERACOES_SOLICITADAS']) status!:
    'ACEITA' | 'RECUSADA' | 'ALTERACOES_SOLICITADAS';
  @IsOptional() @IsString() @MaxLength(2000) resposta?: string;
}
export class AgendaPropostaDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) mes!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(720) duracaoMinutos!: number;
}
