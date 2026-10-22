import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AdminOnly } from '../auth/session.guard.js';
import { AdminService } from './admin.service.js';
import {
  CategoriaAdmin,
  PaginaAdminDto,
  PeriodoAdminDto,
  ContratosAdminDto,
} from './admin.dto.js';
@AdminOnly()
@Controller('admin')
export class DashboardAdminController {
  constructor(private readonly service: AdminService) {}
  @Get('resumo') resumo() {
    return this.service.resumo();
  }
  @Get('usuarios/:categoria') usuarios(
    @Param('categoria', new ParseEnumPipe(CategoriaAdmin))
    categoria: CategoriaAdmin,
    @Query() q: PaginaAdminDto,
  ) {
    return this.service.usuarios(categoria, q);
  }
  @Get('usuarios/:categoria/:id') detalhe(
    @Param('categoria', new ParseEnumPipe(CategoriaAdmin))
    categoria: CategoriaAdmin,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.detalhe(categoria, id);
  }
  @Get('contratacoes') contratos(@Query() q: ContratosAdminDto) {
    return this.service.contratos(q);
  }
  @Get('contratacoes/:id') contrato(@Param('id', ParseIntPipe) id: number) {
    return this.service.contrato(id);
  }
  @Get('relatorios') relatorios(@Query() q: PeriodoAdminDto) {
    return this.service.relatorios(q);
  }
}
