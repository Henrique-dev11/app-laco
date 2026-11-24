import { PerfisConsultaController } from '../auth/perfis-consulta.controller.js';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AvaliacaoController } from './avaliacao.controller.js';
import { AvaliacaoService } from './avaliacao.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AvaliacaoController, PerfisConsultaController],
  providers: [AvaliacaoService],
})
export class AvaliacaoModule {}
