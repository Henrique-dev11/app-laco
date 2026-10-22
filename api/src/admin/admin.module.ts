import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DashboardAdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
@Module({
  imports: [PrismaModule],
  controllers: [DashboardAdminController],
  providers: [AdminService],
})
export class AdminModule {}
