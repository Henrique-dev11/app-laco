import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { ResponsavelIdosoController } from './responsavel-idoso.controller.js';
import { ResponsavelIdosoService } from './responsavel-idoso.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ResponsavelIdosoController],
  providers: [ResponsavelIdosoService],
})
export class ResponsavelIdosoModule {}