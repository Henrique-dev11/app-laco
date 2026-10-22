import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Autenticado } from '../auth/session.guard.js';
import { PropostaService } from './proposta.service.js';
import {
  AgendaPropostaDto,
  CriarPropostaDto,
  RespostaPropostaDto,
} from './proposta.dto.js';
@Controller('mensagens/conversas/:usuarioId/propostas')
export class PropostaController {
  constructor(private readonly service: PropostaService) {}
  @Get('contexto') contexto(
    @Param('usuarioId', ParseIntPipe) outro: number,
    @Req() r: Autenticado,
  ) {
    return this.service.contexto(outro, r.usuario);
  }
  @Get('horarios') horarios(
    @Param('usuarioId', ParseIntPipe) outro: number,
    @Query() q: AgendaPropostaDto,
    @Req() r: Autenticado,
  ) {
    return this.service.horarios(outro, q.mes, q.duracaoMinutos, r.usuario);
  }
  @Get() listar(
    @Param('usuarioId', ParseIntPipe) outro: number,
    @Req() r: Autenticado,
  ) {
    return this.service.listar(outro, r.usuario);
  }
  @Post() criar(
    @Param('usuarioId', ParseIntPipe) outro: number,
    @Body() dto: CriarPropostaDto,
    @Req() r: Autenticado,
  ) {
    return this.service.criar(outro, dto, r.usuario);
  }
  @Post(':id/resposta') responder(
    @Param('usuarioId', ParseIntPipe) outro: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespostaPropostaDto,
    @Req() r: Autenticado,
  ) {
    return this.service.responder(outro, id, dto, r.usuario);
  }
}
