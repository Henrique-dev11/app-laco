import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsuarioModule } from './usuario/usuario.module.js';
import { ResponsavelModule } from './responsavel/responsavel.module.js';
import { IdosoModule } from './idoso/idoso.module.js';
import { ResponsavelIdosoModule } from './responsavel-idoso/responsavel-idoso.module.js';
import { CuidadorModule } from './cuidador/cuidador.module.js';
import { CuidadorServicoModule } from './cuidador-servico/cuidador-servico.module.js';
import { ServicoModule } from './servico/servico.module.js';
import { DisponibilidadeModule } from './disponibilidade/disponibilidade.module.js';
import { ContratacaoModule } from './contratacao/contratacao.module.js';
import { AvaliacaoModule } from './avaliacao/avaliacao.module.js';
import { MensagemModule } from './mensagem/mensagem.module.js';
import { AuthModule } from './auth/auth.module.js';

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
    CuidadorModule,
    CuidadorServicoModule,
    ServicoModule,
    DisponibilidadeModule,
    ContratacaoModule,
    AvaliacaoModule,
    MensagemModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
