import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateIdosoDto } from './dto/create-idoso.dto.js';
import { UpdateIdosoDto } from './dto/update-idoso.dto.js';

@Injectable()
export class IdosoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIdosoDto) {
    if (dto.cpf) {
      const cpfExistente = await this.prisma.idoso.findUnique({
        where: {
          cpf: dto.cpf,
        },
      });

      if (cpfExistente) {
        throw new ConflictException(
          'CPF já cadastrado.',
        );
      }
    }

    return this.prisma.idoso.create({
      data: {
        nome: dto.nome.trim(),
        dataNascimento: new Date(dto.dataNascimento),
        sexo: dto.sexo?.trim(),
        telefone: dto.telefone,
        cpf: dto.cpf,
        observacoes: dto.observacoes?.trim(),
        necessidadesEspeciais:
          dto.necessidadesEspeciais?.trim(),

        endereco: {
          create: {
            rua: dto.endereco.rua.trim(),
            numero: dto.endereco.numero.trim(),
            complemento:
              dto.endereco.complemento?.trim(),
            bairro: dto.endereco.bairro.trim(),
            cidade: dto.endereco.cidade.trim(),
            estado:
              dto.endereco.estado.trim().toUpperCase(),
            cep: dto.endereco.cep,
          },
        },
      },

      select: {
        id: true,
        nome: true,
        dataNascimento: true,
        sexo: true,
        telefone: true,
        cpf: true,
        observacoes: true,
        necessidadesEspeciais: true,
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

// Este método é responsável por buscar todos os idosos cadastrados no banco de dados. Ele utiliza o serviço Prisma para realizar a consulta e retorna uma lista de objetos contendo as informações dos idosos, incluindo seus endereços.
  findAll() {
  return this.prisma.idoso.findMany({
    select: {
      id: true,
      nome: true,
      dataNascimento: true,
      sexo: true,
      telefone: true,
      cpf: true,
      observacoes: true,
      necessidadesEspeciais: true,
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

// Este método é responsável por buscar um idoso específico no banco de dados com base no seu ID. Ele utiliza o serviço Prisma para realizar a consulta e retorna um objeto contendo as informações do idoso, incluindo seu endereço. Caso o idoso não seja encontrado, uma exceção NotFoundException é lançada.
async findOne(id: number) {
  const idoso = await this.prisma.idoso.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      nome: true,
      dataNascimento: true,
      sexo: true,
      telefone: true,
      cpf: true,
      observacoes: true,
      necessidadesEspeciais: true,
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

  if (!idoso) {
    throw new NotFoundException(
      'Idoso não encontrado.',
    );
  }

  return idoso;
}

async update(
  id: number,
  dto: UpdateIdosoDto,
) {
  const idoso = await this.prisma.idoso.findUnique({
    where: {
      id,
    },
  });

  if (!idoso) {
    throw new NotFoundException(
      'Idoso não encontrado.',
    );
  }

  if (dto.cpf) {
    const cpfExistente =
      await this.prisma.idoso.findUnique({
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

  // Este método é responsável por atualizar as informações de um idoso existente no banco de dados. Ele recebe o id do idoso e um DTO contendo as informações a serem atualizadas, como nome, data de nascimento, sexo, telefone, CPF, observações, necessidades especiais e endereço. O método realiza validações para garantir que o idoso existe e que o CPF não está duplicado antes de atualizar o registro no banco de dados.
  return this.prisma.idoso.update({
    where: {
      id,
    },

    data: {
      ...(dto.nome !== undefined && {
        nome: dto.nome.trim(),
      }),

      ...(dto.dataNascimento !== undefined && {
        dataNascimento: new Date(
          dto.dataNascimento,
        ),
      }),

      ...(dto.sexo !== undefined && {
        sexo: dto.sexo.trim(),
      }),

      ...(dto.telefone !== undefined && {
        telefone: dto.telefone,
      }),

      ...(dto.cpf !== undefined && {
        cpf: dto.cpf,
      }),

      ...(dto.observacoes !== undefined && {
        observacoes: dto.observacoes.trim(),
      }),

      ...(dto.necessidadesEspeciais !== undefined && {
        necessidadesEspeciais:
          dto.necessidadesEspeciais.trim(),
      }),

      ...(dto.endereco !== undefined && {
        endereco: {
          update: {
            ...(dto.endereco.rua !== undefined && {
              rua: dto.endereco.rua.trim(),
            }),

            ...(dto.endereco.numero !== undefined && {
              numero: dto.endereco.numero.trim(),
            }),

            ...(dto.endereco.complemento !== undefined && {
              complemento:
                dto.endereco.complemento.trim(),
            }),

            ...(dto.endereco.bairro !== undefined && {
              bairro: dto.endereco.bairro.trim(),
            }),

            ...(dto.endereco.cidade !== undefined && {
              cidade: dto.endereco.cidade.trim(),
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
      nome: true,
      dataNascimento: true,
      sexo: true,
      telefone: true,
      cpf: true,
      observacoes: true,
      necessidadesEspeciais: true,
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
}