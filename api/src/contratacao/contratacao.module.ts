import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ContratacaoController } from './contratacao.controller.js';
import { ContratacaoService } from './contratacao.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ContratacaoController],
  providers: [ContratacaoService],
})
export class ContratacaoModule {}