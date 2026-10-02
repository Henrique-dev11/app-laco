import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { ResponsavelController } from './responsavel.controller.js';
import { ResponsavelService } from './responsavel.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ResponsavelController],
  providers: [ResponsavelService],
})
export class ResponsavelModule {}