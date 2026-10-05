import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TipoUsuario } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { CreateCuidadorDto } from './dto/create-cuidador.dto.js';
import { UpdateCuidadorDto } from './dto/update-cuidador.dto.js';

@Injectable()
export class CuidadorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCuidadorDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: {
        id: dto.usuarioId,
      },

      include: {
        cuidador: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(
        'Usuário não encontrado.',
      );
    }

    if (usuario.tipoUsuario !== TipoUsuario.CUIDADOR) {
      throw new BadRequestException(
        'O usuário informado não possui o perfil CUIDADOR.',
      );
    }

    if (usuario.cuidador) {
      throw new ConflictException(
        'Este usuário já possui um perfil de cuidador.',
      );
    }

    const cpfExistente =
      await this.prisma.cuidador.findUnique({
        where: {
          cpf: dto.cpf,
        },
      });

    if (cpfExistente) {
      throw new ConflictException(
        'CPF já cadastrado.',
      );
    }

    return this.prisma.cuidador.create({
      data: {
        telefone: dto.telefone,
        cpf: dto.cpf,
        dataNascimento:
          new Date(dto.dataNascimento),

        biografia:
          dto.biografia?.trim(),

        experienciaProfissional:
          dto.experienciaProfissional?.trim(),

        registroProfissional:
          dto.registroProfissional?.trim(),

        usuario: {
          connect: {
            id: dto.usuarioId,
          },
        },

        endereco: {
          create: {
            rua: dto.endereco.rua.trim(),
            numero: dto.endereco.numero.trim(),
            complemento:
              dto.endereco.complemento?.trim(),
            bairro: dto.endereco.bairro.trim(),
            cidade: dto.endereco.cidade.trim(),
            estado:
              dto.endereco.estado
                .trim()
                .toUpperCase(),
            cep: dto.endereco.cep,
          },
        },
      },

      select: {
        id: true,
        telefone: true,
        cpf: true,
        dataNascimento: true,
        biografia: true,
        experienciaProfissional: true,
        registroProfissional: true,
        statusVerificacao: true,
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

  findAll() {
  return this.prisma.cuidador.findMany({
    select: {
      id: true,
      telefone: true,
      cpf: true,
      dataNascimento: true,
      biografia: true,
      experienciaProfissional: true,
      registroProfissional: true,
      statusVerificacao: true,
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

async findOne(id: number) {
  const cuidador = await this.prisma.cuidador.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      telefone: true,
      cpf: true,
      dataNascimento: true,
      biografia: true,
      experienciaProfissional: true,
      registroProfissional: true,
      statusVerificacao: true,
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

  if (!cuidador) {
    throw new NotFoundException(
      'Cuidador não encontrado.',
    );
  }

  return cuidador;
}

async update(
  id: number,
  dto: UpdateCuidadorDto,
) {
  const cuidador = await this.prisma.cuidador.findUnique({
    where: {
      id,
    },
  });

  if (!cuidador) {
    throw new NotFoundException(
      'Cuidador não encontrado.',
    );
  }

  if (dto.cpf) {
    const cpfExistente =
      await this.prisma.cuidador.findUnique({
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

  return this.prisma.cuidador.update({
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
        dataNascimento: new Date(
          dto.dataNascimento,
        ),
      }),

      ...(dto.biografia !== undefined && {
        biografia: dto.biografia.trim(),
      }),

      ...(dto.experienciaProfissional !== undefined && {
        experienciaProfissional:
          dto.experienciaProfissional.trim(),
      }),

      ...(dto.registroProfissional !== undefined && {
        registroProfissional:
          dto.registroProfissional.trim(),
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
      biografia: true,
      experienciaProfissional: true,
      registroProfissional: true,
      statusVerificacao: true,
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