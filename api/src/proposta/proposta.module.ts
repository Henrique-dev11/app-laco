import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MensagemModule } from '../mensagem/mensagem.module.js';
import { ContratacaoModule } from '../contratacao/contratacao.module.js';
import { PropostaController } from './proposta.controller.js';
import { PropostaService } from './proposta.service.js';
@Module({
  imports: [PrismaModule, MensagemModule, ContratacaoModule],
  controllers: [PropostaController],
  providers: [PropostaService],
})
export class PropostaModule {}
