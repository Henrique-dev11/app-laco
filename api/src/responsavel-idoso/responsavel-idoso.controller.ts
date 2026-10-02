import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateResponsavelIdosoDto } from './dto/create-responsavel-idoso.dto.js';
import { UpdateResponsavelIdosoDto } from './dto/update-responsavel-idoso.dto.js';
import { ResponsavelIdosoService } from './responsavel-idoso.service.js';

@Controller()
export class ResponsavelIdosoController {
  constructor(
    private readonly responsavelIdosoService: ResponsavelIdosoService,
  ) {}

  @Post('responsaveis/:responsavelId/idosos/:idosoId')
  create(
    @Param('responsavelId', ParseIntPipe)
    responsavelId: number,

    @Param('idosoId', ParseIntPipe)
    idosoId: number,

    @Body()
    dto: CreateResponsavelIdosoDto,
  ) {
    return this.responsavelIdosoService.create(
      responsavelId,
      idosoId,
      dto,
    );
  }

  @Get('responsaveis/:responsavelId/idosos')
  findIdososByResponsavel(
    @Param('responsavelId', ParseIntPipe)
    responsavelId: number,
  ) {
    return this.responsavelIdosoService
      .findIdososByResponsavel(responsavelId);
  }

  @Get('idosos/:idosoId/responsaveis')
  findResponsaveisByIdoso(
    @Param('idosoId', ParseIntPipe)
    idosoId: number,
  ) {
    return this.responsavelIdosoService
      .findResponsaveisByIdoso(idosoId);
  }

  @Patch('responsaveis/:responsavelId/idosos/:idosoId')
  update(
    @Param('responsavelId', ParseIntPipe)
    responsavelId: number,

    @Param('idosoId', ParseIntPipe)
    idosoId: number,

    @Body()
    dto: UpdateResponsavelIdosoDto,
  ) {
    return this.responsavelIdosoService.update(
      responsavelId,
      idosoId,
      dto,
    );
  }
}