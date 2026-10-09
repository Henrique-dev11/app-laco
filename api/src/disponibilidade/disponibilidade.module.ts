import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { DisponibilidadeController } from './disponibilidade.controller.js';
import { DisponibilidadeService } from './disponibilidade.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [DisponibilidadeController],
  providers: [DisponibilidadeService],
})
export class DisponibilidadeModule {}