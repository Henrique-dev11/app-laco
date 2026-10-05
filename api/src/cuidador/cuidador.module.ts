import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { CuidadorController } from './cuidador.controller.js';
import { CuidadorService } from './cuidador.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CuidadorController],
  providers: [CuidadorService],
})
export class CuidadorModule {}