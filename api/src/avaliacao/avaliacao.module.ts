import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AvaliacaoController } from './avaliacao.controller.js';
import { AvaliacaoService } from './avaliacao.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AvaliacaoController],
  providers: [AvaliacaoService],
})
export class AvaliacaoModule {}
