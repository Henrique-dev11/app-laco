import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Get,
  Patch,
} from '@nestjs/common';

import { CreateCuidadorServicoDto } from './dto/create-cuidador-servico.dto.js';
import { CuidadorServicoService } from './cuidador-servico.service.js';
import { UpdateCuidadorServicoDto } from './dto/update-cuidador-servico.dto.js';

@Controller()
export class CuidadorServicoController {
  constructor(
    private readonly cuidadorServicoService:
      CuidadorServicoService,
  ) {}

  @Post(
    'cuidadores/:cuidadorId/servicos/:servicoId',
  )
  create(
    @Param('cuidadorId', ParseIntPipe)
    cuidadorId: number,

    @Param('servicoId', ParseIntPipe)
    servicoId: number,

    @Body()
    dto: CreateCuidadorServicoDto,
  ) {
    return this.cuidadorServicoService.create(
      cuidadorId,
      servicoId,
      dto,
    );
  }

  @Get('cuidadores/:cuidadorId/servicos')
findByCuidador(
  @Param('cuidadorId', ParseIntPipe)
  cuidadorId: number,
) {
  return this.cuidadorServicoService
    .findByCuidador(cuidadorId);
}



@Patch(
  'cuidadores/:cuidadorId/servicos/:servicoId',
)
update(
  @Param('cuidadorId', ParseIntPipe)
  cuidadorId: number,

  @Param('servicoId', ParseIntPipe)
  servicoId: number,

  @Body()
  dto: UpdateCuidadorServicoDto,
) {
  return this.cuidadorServicoService.update(
    cuidadorId,
    servicoId,
    dto,
  );
}
}