import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MensagemController } from './mensagem.controller.js';
import { MensagemService } from './mensagem.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [MensagemController],
  providers: [MensagemService],
})
export class MensagemModule {}
