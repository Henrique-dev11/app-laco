import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { IdosoController } from './idoso.controller.js';
import { IdosoService } from './idoso.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [IdosoController],
  providers: [IdosoService],
})
export class IdosoModule {}