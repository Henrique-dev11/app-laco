import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
} from '@nestjs/common';

import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UsuarioService } from './usuario.service.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { UpdateSenhaDto } from './dto/update-senha.dto.js';

//Este é o controller do usuário, ele é responsável por receber as requisições e chamar o serviço correspondente. Ele é responsável por receber os dados da requisição, validar e chamar o serviço correspondente. Ele é responsável por retornar a resposta para o cliente.
@Controller('usuarios')
export class UsuarioController {
  constructor(
    private readonly usuarioService: UsuarioService,
  ) {}

//Este método é responsável por receber a requisição GET /usuarios e chamar o serviço correspondente para buscar todos os usuários. Ele retorna a resposta para o cliente.
  @Get()
  findAll() {
    return this.usuarioService.findAll();
  }
//Este método é responsável por receber a requisição POST /usuarios e chamar o serviço correspondente para criar um novo usuário. Ele recebe os dados da requisição, valida e chama o serviço correspondente. Ele retorna a resposta para o cliente.
  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuarioService.create(dto);
  }
//Este método é responsável por receber a requisição GET /usuarios/:id e chamar o serviço correspondente para buscar um usuário pelo id. Ele recebe o id da requisição, valida e chama o serviço correspondente. Ele retorna a resposta para o cliente.
  @Get(':id')
    findOne(
  @Param('id', ParseIntPipe) id: number,
    )  
    {
  return this.usuarioService.findOne(id);
}

//Este método é responsável por receber a requisição PATCH /usuarios/:id e chamar o serviço correspondente para atualizar um usuário pelo id. Ele recebe o id da requisição, valida e chama o serviço correspondente. Ele retorna a resposta para o cliente.
@Patch(':id')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateUsuarioDto,
) {
  return this.usuarioService.update(id, dto);
}

//Este método é responsável por receber a requisição PATCH /usuarios/:id/senha e chamar o serviço correspondente para atualizar a senha de um usuário pelo id. Ele recebe o id da requisição, valida e chama o serviço correspondente. Ele retorna a resposta para o cliente.
@Patch(':id/senha')
updateSenha(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateSenhaDto,
) {
  return this.usuarioService.updateSenha(id, dto);
}
}