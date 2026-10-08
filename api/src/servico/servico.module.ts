import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { ServicoController } from './servico.controller.js';
import { ServicoService } from './servico.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ServicoController],
  providers: [ServicoService],
})
export class ServicoModule {}