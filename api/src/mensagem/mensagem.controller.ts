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
import { EnviarMensagemDto } from './dto/enviar-mensagem.dto.js';
import { MensagemService } from './mensagem.service.js';

@Controller('mensagens')
export class MensagemController {
  constructor(private readonly mensagemService: MensagemService) {}

  /** Contatos (quem tem contratação com o usuário) com última mensagem e não lidas. */
  @Get('conversas')
  conversas(@Req() req: Autenticado) {
    return this.mensagemService.conversas(req.usuario);
  }

  /** Mensagens com um contato. `depois` devolve só as mais novas que esse id. */
  @Get('conversas/:usuarioId')
  listar(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Query('depois', new ParseIntPipe({ optional: true }))
    depois: number | undefined,
    @Req() req: Autenticado,
  ) {
    return this.mensagemService.listar(req.usuario, usuarioId, depois);
  }

  @Post('conversas/:usuarioId')
  enviar(
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Body() dto: EnviarMensagemDto,
    @Req() req: Autenticado,
  ) {
    return this.mensagemService.enviar(req.usuario, usuarioId, dto);
  }
}
