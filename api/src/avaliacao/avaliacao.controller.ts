import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';

import { AvaliacaoService } from './avaliacao.service.js';
import { CreateAvaliacaoDto } from './dto/create-avaliacao.dto.js';
import { Public, type Autenticado } from '../auth/session.guard.js';

@Controller()
export class AvaliacaoController {
  constructor(private readonly avaliacaoService: AvaliacaoService) {}

  @Post('contratacoes/:id/avaliacao')
  criar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAvaliacaoDto,
    @Req() req: Autenticado,
  ) {
    return this.avaliacaoService.criar(id, dto, req.usuario);
  }

  @Public()
  @Get('catalogo/cuidadores/:id/avaliacoes')
  listarDoCuidador(@Param('id', ParseIntPipe) id: number) {
    return this.avaliacaoService.listarDoCuidador(id);
  }
}
