import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsuarioController } from './usuario.controller.js';
import { UsuarioService } from './usuario.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [UsuarioController],
  providers: [UsuarioService],
})
export class UsuarioModule {}