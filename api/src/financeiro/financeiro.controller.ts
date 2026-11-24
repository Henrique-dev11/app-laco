import {
  Body,
  Controller,
  Delete,
  Put,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Post,
  Req,
} from '@nestjs/common';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { AdminOnly, type Autenticado } from '../auth/session.guard.js';
import type { MetodoFinanceiro } from '../generated/prisma/client.js';
import { PagamentoNotificacoesService } from './pagamento-notificacoes.service.js';
import { FinanceiroService } from './financeiro.service.js';

class CodigoDto {
  @IsIn(['INICIO', 'FIM']) etapa: 'INICIO' | 'FIM';
}
class ValidarDto extends CodigoDto {
  @Matches(/^[IF]\d{6}$/) codigo: string;
}
class AcaoDto {
  @IsIn(['FINALIZAR', 'CANCELAR', 'CONTESTAR']) acao:
    'FINALIZAR' | 'CANCELAR' | 'CONTESTAR';
  @IsOptional() @IsString() @MaxLength(1000) motivo?: string;
}
class ResolverDto {
  @IsIn(['REEMBOLSAR', 'LIBERAR']) acao: 'REEMBOLSAR' | 'LIBERAR';
  @IsString() @MaxLength(1000) motivo: string;
}
class PagamentoDto {
  @IsOptional() @IsIn(['PIX', 'CARTAO']) metodo?: 'PIX' | 'CARTAO';
}
class SaqueDto {
  @IsOptional() @IsIn(['PIX', 'CARTAO', 'OUTRO']) metodo?: MetodoFinanceiro;
  @Matches(/^\d{1,12}([,.]\d{1,2})?$/) valor: string;
  @IsUUID('4') referencia: string;
}

class DispositivoDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^(ExpoPushToken|ExponentPushToken)\[[a-zA-Z0-9_-]+\]$/)
  token: string;
}

@Controller('financeiro')
export class FinanceiroController {
  constructor(
    private readonly financeiro: FinanceiroService,
    private readonly avisos: PagamentoNotificacoesService,
  ) {}

  @Get('avisos')
  listarAvisos(@Req() r: Autenticado) {
    return this.avisos.listar(r.usuario);
  }

  @Post('avisos/:id/lido')
  lerAviso(@Req() r: Autenticado, @Param('id', ParseIntPipe) id: number) {
    return this.avisos.ler(r.usuario, id);
  }

  @Get('avisos/dispositivo')
  estadoDispositivo(@Req() r: Autenticado) {
    return this.avisos.estadoDispositivo(r.usuario);
  }

  @Put('avisos/dispositivo')
  ativarDispositivo(@Req() r: Autenticado, @Body() dto: DispositivoDto) {
    return this.avisos.ativar(r.usuario, dto.token);
  }

  @Delete('avisos/dispositivo')
  desativarDispositivo(@Req() r: Autenticado) {
    return this.avisos.desativar(r.usuario);
  }

  @Get('visitas/:id') resumo(
    @Param('id', ParseIntPipe) id: number,
    @Req() r: Autenticado,
  ) {
    return this.financeiro.resumo(id, r.usuario);
  }
  @Post('visitas/:id/qr') qr(
    @Param('id', ParseIntPipe) id: number,
    @Req() r: Autenticado,
  ) {
    return this.financeiro.qr(id, r.usuario);
  }
  @Post('visitas/:id/pagar') pagar(
    @Param('id', ParseIntPipe) id: number,
    @Req() r: Autenticado,
    @Body() dto?: PagamentoDto,
  ) {
    return this.financeiro.pagar(id, r.usuario, dto?.metodo ?? undefined);
  }
  @Post('visitas/:id/codigo') gerar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CodigoDto,
    @Req() r: Autenticado,
  ) {
    return this.financeiro.gerar(id, r.usuario, dto.etapa);
  }
  @Post('visitas/:id/validar') validar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidarDto,
    @Req() r: Autenticado,
  ) {
    return this.financeiro.validar(id, r.usuario, dto.etapa, dto.codigo);
  }
  @Post('visitas/:id/acao') acao(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AcaoDto,
    @Req() r: Autenticado,
  ) {
    return this.financeiro.acao(id, r.usuario, dto.acao, dto.motivo);
  }
  @Get('pagamentos') historico(@Req() r: Autenticado) {
    return this.financeiro.historico(r.usuario);
  }
  @Get('carteira') carteira(
    @Req() r: Autenticado,
    @Query('dias') dias?: string,
  ) {
    return this.financeiro.carteira(r.usuario, dias);
  }
  @Post('carteira/referencia') referencia(@Req() r: Autenticado) {
    return this.financeiro.novaReferenciaSaque(r.usuario);
  }
  @Post('carteira/saques') saque(@Req() r: Autenticado, @Body() dto: SaqueDto) {
    return this.financeiro.sacar(
      r.usuario,
      dto.valor,
      dto.referencia,
      dto.metodo ?? undefined,
    );
  }
  @AdminOnly()
  @Get('admin/movimentos')
  movimentos(@Req() r: Autenticado) {
    return this.financeiro.movimentosAdministrativos(r.usuario);
  }
  @AdminOnly()
  @Post('admin/visitas/:id/resolver')
  resolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverDto,
    @Req() r: Autenticado,
  ) {
    return this.financeiro.acao(id, r.usuario, dto.acao, dto.motivo);
  }
}
