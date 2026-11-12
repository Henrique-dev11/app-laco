import type { Autenticado } from '../auth/session.guard.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Imagem } from '../auth/auth.service.js';

import { CreateIdosoDto } from './dto/create-idoso.dto.js';
import { UpdateIdosoDto } from './dto/update-idoso.dto.js';
import { IdosoService } from './idoso.service.js';

@Controller('idosos')
export class IdosoController {
  constructor(private readonly idosoService: IdosoService) {}

  @Post()
  create(@Body() dto: CreateIdosoDto, @Req() req: Autenticado) {
    return this.idosoService.create(dto, req.usuario);
  }

  @Get()
  findAll(@Req() req: Autenticado) {
    return this.idosoService.findAll(req.usuario);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.idosoService.findOne(id);
  }

  @Get(':id/foto')
  async foto(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const foto = await this.idosoService.foto(id);
    res.set({
      'Content-Type': foto.mime,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(Buffer.from(foto.conteudo));
  }

  @Post(':id/foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0 },
    }),
  )
  salvarFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() imagem?: Imagem,
  ) {
    return this.idosoService.salvarFoto(id, imagem);
  }

  @Delete(':id/foto')
  @HttpCode(204)
  async removerFoto(@Param('id', ParseIntPipe) id: number) {
    await this.idosoService.removerFoto(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIdosoDto) {
    return this.idosoService.update(id, dto);
  }
}
