import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { ContratacaoService } from './contratacao.service.js';
import { CreateContratacaoDto } from './dto/create-contratacao.dto.js';
import { UpdateStatusContratacaoDto } from './dto/update-status-contratacao.dto.js';
import type { Autenticado } from '../auth/session.guard.js';
import { AgendarDto } from './dto/agendar.dto.js';

@Controller('contratacoes')
export class ContratacaoController {
  constructor(private readonly contratacaoService: ContratacaoService) {}

  @Post()
  create(@Body() dto: CreateContratacaoDto) {
    return this.contratacaoService.create(dto);
  }

  @Get()
  findAll(@Req() req: Autenticado) {
    return this.contratacaoService.findAll(req.usuario);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contratacaoService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusContratacaoDto,
    @Req() req: Autenticado,
  ) {
    return this.contratacaoService.updateStatus(id, dto, req.usuario);
  }

  @Post(':id/codigo-conclusao')
  codigoConclusao(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Autenticado,
  ) {
    return this.contratacaoService.gerarCodigoConclusao(id, req.usuario);
  }

  @Post(':id/agendamento')
  agendar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AgendarDto,
    @Req() req: Autenticado,
  ) {
    return this.contratacaoService.agendar(id, dto.inicio, req.usuario);
  }
}
