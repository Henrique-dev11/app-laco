import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FinanceiroController } from './financeiro.controller.js';
import { PagamentoNotificacoesService } from './pagamento-notificacoes.service.js';
import { FinanceiroService } from './financeiro.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceiroController],
  providers: [FinanceiroService, PagamentoNotificacoesService],
})
export class FinanceiroModule {}
