import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';
import { CatalogoController } from './catalogo.controller.js';
import { PrismaExceptionFilter } from '../prisma/prisma-exception.filter.js';
import { AdminController } from './admin.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController, CatalogoController, AdminController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AuthModule {}
