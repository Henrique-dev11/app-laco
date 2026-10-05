import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateCuidadorDto } from './dto/create-cuidador.dto.js';
import { UpdateCuidadorDto } from './dto/update-cuidador.dto.js';
import { CuidadorService } from './cuidador.service.js';

@Controller('cuidadores')
export class CuidadorController {
  constructor(
    private readonly cuidadorService: CuidadorService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateCuidadorDto,
  ) {
    return this.cuidadorService.create(dto);
  }

  @Get()
  findAll() {
    return this.cuidadorService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cuidadorService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCuidadorDto,
  ) {
    return this.cuidadorService.update(
      id,
      dto,
    );
  }
}