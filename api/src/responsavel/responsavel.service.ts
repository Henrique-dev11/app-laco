import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TipoUsuario } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { CreateResponsavelDto } from './dto/create-responsavel.dto.js';
import { UpdateResponsavelDto } from './dto/update-responsavel.dto.js';

@Injectable()
export class ResponsavelService {
  constructor(private readonly prisma: PrismaService) {}

  // Este método é responsável por criar um novo responsável no banco de dados. Ele recebe um DTO (Data Transfer Object) contendo as informações necessárias para a criação do responsável, como telefone, CPF, data de nascimento, ID do usuário associado e endereço. O método realiza validações para garantir que o usuário existe, possui o perfil correto e que o CPF não está duplicado antes de criar o registro no banco de dados.
  async create(dto: CreateResponsavelDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: {
        id: dto.usuarioId,
      },
      include: {
        responsavel: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    if (usuario.tipoUsuario !== TipoUsuario.RESPONSAVEL) {
      throw new BadRequestException(
        'O usuário informado não possui o perfil RESPONSAVEL.',
      );
    }

    if (usuario.responsavel) {
      throw new ConflictException(
        'Este usuário já possui um perfil de responsável.',
      );
    }

    const cpfExistente = await this.prisma.responsavel.findUnique({
      where: {
        cpf: dto.cpf,
      },
    });

    if (cpfExistente) {
      throw new ConflictException('CPF já cadastrado.');
    }

    return this.prisma.responsavel.create({
      data: {
        telefone: dto.telefone,
        cpf: dto.cpf,
        dataNascimento: new Date(dto.dataNascimento),

        usuario: {
          connect: {
            id: dto.usuarioId,
          },
        },

        endereco: {
          create: {
            rua: dto.endereco.rua.trim(),
            numero: dto.endereco.numero.trim(),
            complemento: dto.endereco.complemento?.trim(),
            bairro: dto.endereco.bairro.trim(),
            cidade: dto.endereco.cidade.trim(),
            estado: dto.endereco.estado.trim().toUpperCase(),
            cep: dto.endereco.cep,
          },
        },
      },

      select: {
        id: true,
        usuarioId: true,
        telefone: true,
        cpf: true,
        dataNascimento: true,
        createdAt: true,
        updatedAt: true,

        endereco: {
          select: {
            id: true,
            rua: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            estado: true,
            cep: true,
          },
        },
      },
    });
  }

// Este método é responsável por buscar todos os responsáveis cadastrados no banco de dados. Ele retorna uma lista de responsáveis, incluindo informações do usuário associado e do endereço.
  findAll() {
  return this.prisma.responsavel.findMany({
    select: {
      id: true,
      telefone: true,
      cpf: true,
      dataNascimento: true,
      createdAt: true,
      updatedAt: true,

      usuario: {
        select: {
          id: true,
          nome: true,
          email: true,
          tipoUsuario: true,
          status: true,
        },
      },

      endereco: {
        select: {
          id: true,
          rua: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          estado: true,
          cep: true,
        },
      },
    },
  });
}

// Este método é responsável por buscar um responsável pelo id. Ele recebe o id do responsável, valida se o responsável existe e, caso exista, retorna o responsável encontrado, incluindo informações do usuário associado e do endereço.
async findOne(id: number) {
  const responsavel =
    await this.prisma.responsavel.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        telefone: true,
        cpf: true,
        dataNascimento: true,
        createdAt: true,
        updatedAt: true,

        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipoUsuario: true,
            status: true,
          },
        },

        endereco: {
          select: {
            id: true,
            rua: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            estado: true,
            cep: true,
          },
        },
      },
    });

  if (!responsavel) {
    throw new NotFoundException(
      'Responsável não encontrado.',
    );
  }

  return responsavel;
}

// Este método é responsável por atualizar as informações de um responsável no banco de dados. Ele recebe o id do responsável e um DTO contendo as informações a serem atualizadas, como telefone, CPF, data de nascimento e endereço. O método realiza validações para garantir que o responsável existe e que o CPF não está duplicado antes de atualizar o registro no banco de dados.
async update(
  id: number,
  dto: UpdateResponsavelDto,
) {
  const responsavel = await this.prisma.responsavel.findUnique({
    where: {
      id,
    },
  });

  if (!responsavel) {
    throw new NotFoundException(
      'Responsável não encontrado.',
    );
  }

  if (dto.cpf) {
    const cpfExistente =
      await this.prisma.responsavel.findUnique({
        where: {
          cpf: dto.cpf,
        },
      });

    if (
      cpfExistente &&
      cpfExistente.id !== id
    ) {
      throw new ConflictException(
        'CPF já cadastrado.',
      );
    }
  }

  return this.prisma.responsavel.update({
    where: {
      id,
    },

    data: {
      ...(dto.telefone !== undefined && {
        telefone: dto.telefone,
      }),

      ...(dto.cpf !== undefined && {
        cpf: dto.cpf,
      }),

      ...(dto.dataNascimento !== undefined && {
        dataNascimento:
          new Date(dto.dataNascimento),
      }),

      ...(dto.endereco !== undefined && {
        endereco: {
          update: {
            ...(dto.endereco.rua !== undefined && {
              rua: dto.endereco.rua.trim(),
            }),

            ...(dto.endereco.numero !== undefined && {
              numero:
                dto.endereco.numero.trim(),
            }),

            ...(dto.endereco.complemento !== undefined && {
              complemento:
                dto.endereco.complemento.trim(),
            }),

            ...(dto.endereco.bairro !== undefined && {
              bairro:
                dto.endereco.bairro.trim(),
            }),

            ...(dto.endereco.cidade !== undefined && {
              cidade:
                dto.endereco.cidade.trim(),
            }),

            ...(dto.endereco.estado !== undefined && {
              estado:
                dto.endereco.estado
                  .trim()
                  .toUpperCase(),
            }),

            ...(dto.endereco.cep !== undefined && {
              cep: dto.endereco.cep,
            }),
          },
        },
      }),
    },

    select: {
      id: true,
      telefone: true,
      cpf: true,
      dataNascimento: true,
      createdAt: true,
      updatedAt: true,

      usuario: {
        select: {
          id: true,
          nome: true,
          email: true,
          tipoUsuario: true,
          status: true,
        },
      },

      endereco: {
        select: {
          id: true,
          rua: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          estado: true,
          cep: true,
        },
      },
    },
  });
}

}