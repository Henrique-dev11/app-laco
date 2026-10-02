import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UsuarioService } from './usuario.service.js';

@Controller('usuarios')
export class UsuarioController {
  constructor(
    private readonly usuarioService: UsuarioService,
  ) {}

  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuarioService.create(dto);
  }
}