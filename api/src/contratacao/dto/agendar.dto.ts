import { IsDateString, Matches } from 'class-validator';
export class AgendarDto {
  @IsDateString({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/)
  inicio: string;
}
