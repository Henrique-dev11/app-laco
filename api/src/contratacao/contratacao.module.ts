import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ContratacaoController } from './contratacao.controller.js';
import { AgendaController } from './agenda.controller.js';
import { ContratacaoService } from './contratacao.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ContratacaoController, AgendaController],
  providers: [ContratacaoService],
  exports: [ContratacaoService],
})
export class ContratacaoModule {}
