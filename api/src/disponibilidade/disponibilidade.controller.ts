import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateDisponibilidadeDto } from './dto/create-disponibilidade.dto.js';
import { UpdateDisponibilidadeDto } from './dto/update-disponibilidade.dto.js';
import { DisponibilidadeService } from './disponibilidade.service.js';

@Controller()
export class DisponibilidadeController {
  constructor(
    private readonly disponibilidadeService:
      DisponibilidadeService,
  ) {}

  @Post('cuidadores/:cuidadorId/disponibilidades')
  create(
    @Param('cuidadorId', ParseIntPipe)
    cuidadorId: number,

    @Body()
    dto: CreateDisponibilidadeDto,
  ) {
    return this.disponibilidadeService.create(
      cuidadorId,
      dto,
    );
  }

  @Get('cuidadores/:cuidadorId/disponibilidades')
  findByCuidador(
    @Param('cuidadorId', ParseIntPipe)
    cuidadorId: number,
  ) {
    return this.disponibilidadeService
      .findByCuidador(cuidadorId);
  }

  @Patch('disponibilidades/:id')
  update(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    dto: UpdateDisponibilidadeDto,
  ) {
    return this.disponibilidadeService.update(
      id,
      dto,
    );
  }
}