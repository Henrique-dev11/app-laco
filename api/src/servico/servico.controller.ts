import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateServicoDto } from './dto/create-servico.dto.js';
import { UpdateServicoDto } from './dto/update-servico.dto.js';
import { ServicoService } from './servico.service.js';

@Controller('servicos')
export class ServicoController {
  constructor(
    private readonly servicoService: ServicoService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateServicoDto,
  ) {
    return this.servicoService.create(dto);
  }

  @Get()
  findAll() {
    return this.servicoService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.servicoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServicoDto,
  ) {
    return this.servicoService.update(
      id,
      dto,
    );
  }
}