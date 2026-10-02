import { ConflictException, Injectable, NotFoundException, } from '@nestjs/common';
import bcrypt from 'bcrypt';
// O serviço é injetado no controller de usuários, que é responsável por receber as requisições HTTP e chamar os métodos do serviço correspondente. Ele retorna as respostas para o cliente, incluindo os dados dos usuários e mensagens de erro, quando necessário.
import { BadRequestException } from '@nestjs/common';

// Este serviço é responsável por gerenciar as operações relacionadas aos usuários, como criação, atualização e busca de usuários no banco de dados.
import { PrismaService } from '../prisma/prisma.service.js';

// Ele utiliza o PrismaService para interagir com o banco de dados e realizar as operações necessárias. Ele também realiza validações e tratamento de erros, como verificar se um usuário existe antes de atualizá-lo ou se o e-mail informado já está em uso por outro usuário.
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';

// Ele também utiliza o bcrypt para realizar o hash das senhas dos usuários antes de armazená-las no banco de dados, garantindo a segurança das informações.
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';

// Ele também utiliza o UpdateSenhaDto para validar e atualizar a senha dos usuários, garantindo que a senha atual seja informada corretamente antes de permitir a alteração para uma nova senha.
import { UpdateSenhaDto } from './dto/update-senha.dto.js';



@Injectable()
export class UsuarioService {
  constructor(private readonly prisma: PrismaService) {}

// Este método é responsável por buscar todos os usuários cadastrados no banco de dados. Ele retorna uma lista de usuários com os campos selecionados.
  findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        tipoUsuario: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

// Este método é responsável por buscar um usuário pelo id. Ele recebe o id do usuário, valida se o usuário existe e, caso exista, retorna o usuário encontrado.
  async findOne(id: number) {
  const usuario = await this.prisma.usuario.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      nome: true,
      email: true,
      tipoUsuario: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!usuario) {
    throw new NotFoundException('Usuário não encontrado.');
  }

  return usuario;
}
// Este método é responsável por criar um novo usuário. Ele recebe os dados do usuário, valida se o e-mail informado já está em uso e, caso não esteja, cria o usuário no banco de dados. Em seguida, retorna o usuário criado.
  async create(dto: CreateUsuarioDto) {
    const email = dto.email.trim().toLowerCase();

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (usuarioExistente) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 12);

    return this.prisma.usuario.create({
      data: {
        nome: dto.nome.trim(),
        email,
        senhaHash,
        tipoUsuario: dto.tipoUsuario,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipoUsuario: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Este método é responsável por atualizar um usuário existente. Ele recebe o id do usuário e os dados a serem atualizados, valida se o usuário existe e se o e-mail informado já está em uso por outro usuário. Em seguida, atualiza os dados do usuário no banco de dados e retorna o usuário atualizado.
  async update(id: number, dto: UpdateUsuarioDto) {
  await this.findOne(id);

  let email: string | undefined;

  if (dto.email) {
    email = dto.email.trim().toLowerCase();

    const usuarioComEmail = await this.prisma.usuario.findUnique({
      where: {
        email,
      },
    });

    if (usuarioComEmail && usuarioComEmail.id !== id) {
      throw new ConflictException('E-mail já cadastrado.');
    }
  }

  return this.prisma.usuario.update({
    where: {
      id,
    },
    data: {
      ...(dto.nome !== undefined && {
        nome: dto.nome.trim(),
      }),
      ...(email !== undefined && {
        email,
      }),
    },
    select: {
      id: true,
      nome: true,
      email: true,
      tipoUsuario: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Este método é responsável por atualizar a senha de um usuário existente. Ele recebe o id do usuário e os dados da senha atual e nova, valida se o usuário existe e se a senha atual informada está correta. Em seguida, atualiza a senha do usuário no banco de dados e retorna uma mensagem de sucesso.
async updateSenha(id: number, dto: UpdateSenhaDto) {
  const usuario = await this.prisma.usuario.findUnique({
    where: {
      id,
    },
  });

  if (!usuario) {
    throw new NotFoundException('Usuário não encontrado.');
  }

  const senhaCorreta = await bcrypt.compare(
    dto.senhaAtual,
    usuario.senhaHash,
  );

  if (!senhaCorreta) {
    throw new BadRequestException('Senha atual incorreta.');
  }

  const novaSenhaHash = await bcrypt.hash(
    dto.novaSenha,
    12,
  );

  await this.prisma.usuario.update({
    where: {
      id,
    },
    data: {
      senhaHash: novaSenhaHash,
    },
  });

  return {
    message: 'Senha alterada com sucesso.',
  };
}
}