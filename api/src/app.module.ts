import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsuarioModule } from './usuario/usuario.module.js';
import { ResponsavelModule } from './responsavel/responsavel.module.js';
import { IdosoModule } from './idoso/idoso.module.js';
import { ResponsavelIdosoModule } from './responsavel-idoso/responsavel-idoso.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsuarioModule,
    ResponsavelModule,
    IdosoModule,
    ResponsavelIdosoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}