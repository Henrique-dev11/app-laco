import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateResponsavelIdosoDto } from './dto/create-responsavel-idoso.dto.js';
import { UpdateResponsavelIdosoDto } from './dto/update-responsavel-idoso.dto.js';

@Injectable()
export class ResponsavelIdosoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    responsavelId: number,
    idosoId: number,
    dto: CreateResponsavelIdosoDto,
  ) {
    const responsavel = await this.prisma.responsavel.findUnique({
      where: {
        id: responsavelId,
      },
    });

    if (!responsavel) {
      throw new NotFoundException(
        'Responsável não encontrado.',
      );
    }

    const idoso = await this.prisma.idoso.findUnique({
      where: {
        id: idosoId,
      },
    });

    if (!idoso) {
      throw new NotFoundException(
        'Idoso não encontrado.',
      );
    }

    const vinculoExistente =
      await this.prisma.responsavelIdoso.findUnique({
        where: {
          responsavelId_idosoId: {
            responsavelId,
            idosoId,
          },
        },
      });

    if (vinculoExistente) {
      throw new ConflictException(
        'Este responsável já está vinculado ao idoso.',
      );
    }

    if (dto.responsavelPrincipal === true) {
      const principalExistente =
        await this.prisma.responsavelIdoso.findFirst({
          where: {
            idosoId,
            responsavelPrincipal: true,
          },
        });

      if (principalExistente) {
        throw new ConflictException(
          'Este idoso já possui um responsável principal.',
        );
      }
    }

    return this.prisma.responsavelIdoso.create({
      data: {
        responsavelId,
        idosoId,
        parentesco: dto.parentesco,
        responsavelPrincipal:
          dto.responsavelPrincipal ?? false,
      },

      select: {
        id: true,
        parentesco: true,
        responsavelPrincipal: true,
        createdAt: true,
        updatedAt: true,

        responsavel: {
          select: {
            id: true,

            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        },

        idoso: {
          select: {
            id: true,
            nome: true,
            dataNascimento: true,
          },
        },
      },
    });
  }

// Este método é responsável por buscar todos os idosos vinculados a um determinado responsável. Ele recebe o id do responsável como parâmetro, valida se o responsável existe e, em seguida, retorna uma lista de vínculos entre o responsável e os idosos, incluindo informações detalhadas sobre cada idoso e seu endereço.
  async findIdososByResponsavel(
  responsavelId: number,
) {
  const responsavel =
    await this.prisma.responsavel.findUnique({
      where: {
        id: responsavelId,
      },
    });

  if (!responsavel) {
    throw new NotFoundException(
      'Responsável não encontrado.',
    );
  }

  return this.prisma.responsavelIdoso.findMany({
    where: {
      responsavelId,
    },

    select: {
      id: true,
      parentesco: true,
      responsavelPrincipal: true,
      createdAt: true,
      updatedAt: true,

      idoso: {
        select: {
          id: true,
          nome: true,
          dataNascimento: true,
          sexo: true,
          telefone: true,
          cpf: true,
          observacoes: true,
          necessidadesEspeciais: true,

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
      },
    },
  });
}

// Este método é responsável por buscar todos os responsáveis vinculados a um determinado idoso. Ele recebe o id do idoso como parâmetro, valida se o idoso existe e, em seguida, retorna uma lista de vínculos entre o idoso e os responsáveis, incluindo informações detalhadas sobre cada responsável e seu usuário associado.
async findResponsaveisByIdoso(
  idosoId: number,
) {
  const idoso = await this.prisma.idoso.findUnique({
    where: {
      id: idosoId,
    },
  });

  if (!idoso) {
    throw new NotFoundException(
      'Idoso não encontrado.',
    );
  }

  return this.prisma.responsavelIdoso.findMany({
    where: {
      idosoId,
    },

    select: {
      id: true,
      parentesco: true,
      responsavelPrincipal: true,
      createdAt: true,
      updatedAt: true,

      responsavel: {
        select: {
          id: true,
          telefone: true,

          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
              status: true,
            },
          },
        },
      },
    },
  });
}

// Este método é responsável por atualizar as informações de um vínculo entre um responsável e um idoso. Ele recebe o id do responsável, o id do idoso e um DTO contendo as informações a serem atualizadas, como parentesco e se o responsável é o principal. O método realiza validações para garantir que o vínculo existe e que não haja conflitos com outros responsáveis principais antes de atualizar o registro no banco de dados.
async update(
  responsavelId: number,
  idosoId: number,
  dto: UpdateResponsavelIdosoDto,
) {
  const vinculo =
    await this.prisma.responsavelIdoso.findUnique({
      where: {
        responsavelId_idosoId: {
          responsavelId,
          idosoId,
        },
      },
    });

  if (!vinculo) {
    throw new NotFoundException(
      'Vínculo entre responsável e idoso não encontrado.',
    );
  }

  if (dto.responsavelPrincipal === true) {
    const outroPrincipal =
      await this.prisma.responsavelIdoso.findFirst({
        where: {
          idosoId,
          responsavelPrincipal: true,

          NOT: {
            id: vinculo.id,
          },
        },
      });

    if (outroPrincipal) {
      throw new ConflictException(
        'Este idoso já possui outro responsável principal.',
      );
    }
  }

  return this.prisma.responsavelIdoso.update({
    where: {
      id: vinculo.id,
    },

    data: {
      ...(dto.parentesco !== undefined && {
        parentesco: dto.parentesco,
      }),

      ...(dto.responsavelPrincipal !== undefined && {
        responsavelPrincipal:
          dto.responsavelPrincipal,
      }),
    },

    select: {
      id: true,
      parentesco: true,
      responsavelPrincipal: true,
      createdAt: true,
      updatedAt: true,

      responsavel: {
        select: {
          id: true,

          usuario: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      },

      idoso: {
        select: {
          id: true,
          nome: true,
          dataNascimento: true,
        },
      },
    },
  });
}
}