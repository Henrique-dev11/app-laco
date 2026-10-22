import { Type } from 'class-transformer';
import { IsInt, Min, ValidateIf } from 'class-validator';
export class AgendaQueryDto {
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idosoId?: number;
}
