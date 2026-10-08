import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { CuidadorServicoController } from './cuidador-servico.controller.js';
import { CuidadorServicoService } from './cuidador-servico.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CuidadorServicoController],
  providers: [CuidadorServicoService],
})
export class CuidadorServicoModule {}