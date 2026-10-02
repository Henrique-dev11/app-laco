import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateIdosoDto } from './dto/create-idoso.dto.js';
import { UpdateIdosoDto } from './dto/update-idoso.dto.js';
import { IdosoService } from './idoso.service.js';

@Controller('idosos')
export class IdosoController {
  constructor(
    private readonly idosoService: IdosoService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateIdosoDto,
  ) {
    return this.idosoService.create(dto);
  }

  @Get()
  findAll() {
    return this.idosoService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.idosoService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIdosoDto,
  ) {
    return this.idosoService.update(
      id,
      dto,
    );
  }
}