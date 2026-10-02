import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateResponsavelDto } from './dto/create-responsavel.dto.js';
import { UpdateResponsavelDto } from './dto/update-responsavel.dto.js';
import { ResponsavelService } from './responsavel.service.js';

@Controller('responsaveis')
export class ResponsavelController {
  constructor(
    private readonly responsavelService: ResponsavelService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateResponsavelDto,
  ) {
    return this.responsavelService.create(dto);
  }

  @Get()
  findAll() {
    return this.responsavelService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.responsavelService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResponsavelDto,
  ) {
    return this.responsavelService.update(
      id,
      dto,
    );
  }
}