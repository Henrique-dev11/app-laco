import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ContratacaoService } from './contratacao.service.js';
import { CreateContratacaoDto } from './dto/create-contratacao.dto.js';
import { UpdateStatusContratacaoDto } from './dto/update-status-contratacao.dto.js';

@Controller('contratacoes')
export class ContratacaoController {
  constructor(
    private readonly contratacaoService: ContratacaoService,
  ) {}

  @Post()
  create(@Body() dto: CreateContratacaoDto) {
    return this.contratacaoService.create(dto);
  }

  @Get()
  findAll() {
    return this.contratacaoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contratacaoService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusContratacaoDto,
  ) {
    return this.contratacaoService.updateStatus(id, dto);
  }
}