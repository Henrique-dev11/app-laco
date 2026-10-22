import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EnviarMensagemDto {
  @IsString({ message: 'Escreva a mensagem.' })
  @IsNotEmpty({ message: 'Escreva a mensagem.' })
  @MaxLength(1000, { message: 'A mensagem pode ter até 1000 caracteres.' })
  conteudo!: string;
}
