import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FUSO } from './horarios.js';
import { consultarAgenda, validarJanela } from './agenda-disponivel.js';
import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';
import { StatusContratacao } from '../generated/prisma/client.js';
import type { Prisma } from '../generated/prisma/client.js';

import { CreateContratacaoDto } from './dto/create-contratacao.dto.js';
import { UpdateStatusContratacaoDto } from './dto/update-status-contratacao.dto.js';
import type { Identidade } from '../auth/auth.service.js';

const ALFABETO_CODIGO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TAMANHO_CODIGO = 6;
const MAX_TENTATIVAS_CODIGO = 5;
// Nunca devolver o hash do código nem o contador de tentativas pela API.
const contratacaoOmit = { codigoConclusaoHash: true, tentativasCodigo: true };

const contratacaoInclude = {
  itemProposta: {
    select: { propostaId: true, proposta: { select: { versao: true } } },
  },
  agendamento: true,
  avaliacao: {
    select: { id: true, nota: true, comentario: true, createdAt: true },
  },
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
    },
  },
  cuidadorServico: {
    select: {
      id: true,
      preco: true,
      duracaoMinutos: true,
      servico: {
        select: {
          id: true,
          nome: true,
          ativo: true,
        },
      },
      cuidador: {
        select: {
          id: true,
          disponibilidades: {
            where: { ativo: true },
            select: { diaSemana: true, horaInicio: true, horaFim: true },
          },
          usuario: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class ContratacaoService {
  constructor(private readonly prisma: PrismaService) {}

  async horarios(id: number, mes: string, usuario: Identidade) {
    const contrato = await this.prisma.contratacao.findUnique({
      where: { id },
      include: {
        agendamento: true,
        cuidadorServico: {
          include: { servico: true, cuidador: { include: { usuario: true } } },
        },
      },
    });
    if (!contrato) throw new NotFoundException('Contratação não encontrada.');
    if (
      !['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario) &&
      contrato.responsavelId !== usuario.responsavelId
    )
      throw new ForbiddenException(
        'Apenas o responsável pode consultar horários para agendar.',
      );
    if (contrato.status !== 'ACEITA' || contrato.agendamento)
      throw new BadRequestException(
        'A contratação deve estar aceita e ainda não ter agendamento.',
      );
    const oferta = contrato.cuidadorServico;
    if (
      !oferta.ativo ||
      !oferta.servico.ativo ||
      oferta.cuidador.statusVerificacao !== 'APROVADO' ||
      oferta.cuidador.usuario.status !== 'ATIVO'
    )
      throw new BadRequestException('Cuidador ou serviço indisponível.');
    return {
      mes,
      fuso: FUSO,
      duracaoMinutos: contrato.duracaoMinutos,
      intervaloMinutos: 15,
      datas: await consultarAgenda(
        this.prisma,
        oferta.cuidadorId,
        mes,
        contrato.duracaoMinutos,
      ),
    };
  }

  async agendar(id: number, dataInicio: string, usuario: Identidade) {
    return this.prisma.$transaction((tx) =>
      this.agendarEmTransacao(tx, id, dataInicio, usuario),
    );
  }

  /** Compartilhado pelo agendamento manual e pela confirmação de proposta. */
  async agendarEmTransacao(
    tx: Prisma.TransactionClient,
    id: number,
    dataInicio: string,
    usuario: Identidade,
  ) {
    await tx.$queryRaw`SELECT id FROM "Contratacao" WHERE id = ${id} FOR UPDATE`;
    const contrato = await tx.contratacao.findUnique({
      where: { id },
      include: {
        agendamento: true,
        cuidadorServico: {
          include: { cuidador: { include: { usuario: true } }, servico: true },
        },
      },
    });
    if (!contrato) throw new NotFoundException('Contratação não encontrada.');
    if (
      !['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario) &&
      contrato.responsavelId !== usuario.responsavelId
    )
      throw new ForbiddenException('Apenas o responsável pode agendar.');
    if (contrato.status !== 'ACEITA')
      throw new BadRequestException(
        'O cuidador precisa aceitar a contratação antes do agendamento.',
      );
    if (contrato.agendamento)
      throw new ConflictException('A contratação já possui agendamento.');
    const oferta = contrato.cuidadorServico;
    if (
      !oferta.ativo ||
      !oferta.servico.ativo ||
      oferta.cuidador.statusVerificacao !== 'APROVADO' ||
      oferta.cuidador.usuario.status !== 'ATIVO'
    )
      throw new BadRequestException('Cuidador ou serviço indisponível.');
    await tx.$queryRaw`SELECT id FROM "Cuidador" WHERE id = ${oferta.cuidadorId} FOR UPDATE`;
    const inicio = new Date(dataInicio);
    const fim = await validarJanela(
      tx,
      oferta.cuidadorId,
      inicio,
      contrato.duracaoMinutos,
    );
    return tx.agendamento.create({
      data: { contratacaoId: id, cuidadorId: oferta.cuidadorId, inicio, fim },
    });
  }

  async create(dto: CreateContratacaoDto) {
    const responsavel = await this.prisma.responsavel.findUnique({
      where: { id: dto.responsavelId },
    });

    if (!responsavel) {
      throw new NotFoundException('Responsável não encontrado.');
    }

    const idoso = await this.prisma.idoso.findUnique({
      where: { id: dto.idosoId },
    });

    if (!idoso) {
      throw new NotFoundException('Idoso não encontrado.');
    }

    const vinculo = await this.prisma.responsavelIdoso.findUnique({
      where: {
        responsavelId_idosoId: {
          responsavelId: dto.responsavelId,
          idosoId: dto.idosoId,
        },
      },
    });

    if (!vinculo) {
      throw new BadRequestException(
        'O responsável não está vinculado ao idoso.',
      );
    }

    const oferta = await this.prisma.cuidadorServico.findUnique({
      where: { id: dto.cuidadorServicoId },
      include: { servico: true, cuidador: { include: { usuario: true } } },
    });

    if (!oferta) {
      throw new NotFoundException(
        'Serviço oferecido pelo cuidador não encontrado.',
      );
    }

    if (!oferta.ativo || !oferta.servico.ativo) {
      throw new BadRequestException(
        'Este serviço não está disponível para contratação.',
      );
    }

    if (
      oferta.cuidador.statusVerificacao !== 'APROVADO' ||
      oferta.cuidador.usuario.status !== 'ATIVO'
    ) {
      throw new BadRequestException(
        'Cuidador ainda não está disponível para contratação.',
      );
    }

    if (
      (dto.precoReferenciaEsperado !== undefined &&
        !oferta.preco.equals(dto.precoReferenciaEsperado)) ||
      (dto.duracaoEsperadaMinutos !== undefined &&
        oferta.duracaoMinutos !== dto.duracaoEsperadaMinutos)
    )
      throw new ConflictException(
        'A oferta mudou. Atualize a busca e revise o preço e a duração antes de solicitar.',
      );

    return this.prisma.contratacao.create({
      data: {
        responsavelId: dto.responsavelId,
        idosoId: dto.idosoId,
        cuidadorServicoId: dto.cuidadorServicoId,
        valorAcordado: oferta.preco,
        precoReferencia: oferta.preco,
        duracaoMinutos: oferta.duracaoMinutos,
        nomeServico: oferta.servico.nome,
        ...(dto.observacoes !== undefined
          ? { observacoes: dto.observacoes }
          : {}),
      },
      include: contratacaoInclude,
      omit: contratacaoOmit,
    });
  }

  async findAll(usuario: Identidade) {
    return this.prisma.contratacao.findMany({
      where: ['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario)
        ? {}
        : {
            OR: [
              { responsavelId: usuario.responsavelId ?? -1 },
              { cuidadorServico: { cuidadorId: usuario.cuidadorId ?? -1 } },
            ],
          },
      orderBy: { createdAt: 'desc' },
      include: contratacaoInclude,
      omit: contratacaoOmit,
    });
  }

  async findOne(id: number) {
    const contratacao = await this.prisma.contratacao.findUnique({
      where: { id },
      include: contratacaoInclude,
      omit: contratacaoOmit,
    });

    if (!contratacao) {
      throw new NotFoundException('Contratação não encontrada.');
    }

    return contratacao;
  }

  async updateStatus(
    id: number,
    dto: UpdateStatusContratacaoDto,
    usuario: Identidade,
  ) {
    const contratacao = await this.prisma.contratacao.findUnique({
      where: { id },
    });

    if (!contratacao) {
      throw new NotFoundException('Contratação não encontrada.');
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario)) {
      const oferta = await this.prisma.cuidadorServico.findUniqueOrThrow({
        where: { id: contratacao.cuidadorServicoId },
      });
      const cuidador = oferta.cuidadorId === usuario.cuidadorId;
      const responsavel = contratacao.responsavelId === usuario.responsavelId;
      if (
        (['ACEITA', 'RECUSADA', 'CONCLUIDA'].includes(dto.status) &&
          !cuidador) ||
        (dto.status === 'CANCELADA' && !responsavel && !cuidador)
      )
        throw new ForbiddenException(
          'Seu perfil não pode realizar esta alteração.',
        );
    }

    const transicoesPermitidas: Record<StatusContratacao, StatusContratacao[]> =
      {
        SOLICITADA: [
          StatusContratacao.ACEITA,
          StatusContratacao.RECUSADA,
          StatusContratacao.CANCELADA,
        ],
        ACEITA: [StatusContratacao.CANCELADA, StatusContratacao.CONCLUIDA],
        RECUSADA: [],
        CANCELADA: [],
        CONCLUIDA: [],
      };

    if (!transicoesPermitidas[contratacao.status].includes(dto.status)) {
      throw new BadRequestException(
        `Não é permitido alterar o status de ${contratacao.status} para ${dto.status}.`,
      );
    }

    if (
      dto.status === 'CONCLUIDA' &&
      !['ADMIN', 'SUPER_ADMIN'].includes(usuario.tipoUsuario)
    )
      await this.validarCodigoConclusao(id, dto.codigo);

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.contratacao.updateMany({
        where: { id, status: contratacao.status },
        data: {
          status: dto.status,
          // Concluída ou cancelada: o código deixa de valer.
          ...(['CONCLUIDA', 'CANCELADA'].includes(dto.status)
            ? { codigoConclusaoHash: null, tentativasCodigo: 0 }
            : {}),
        },
      });
      if (!result.count)
        throw new ConflictException(
          'A contratação foi alterada. Atualize os dados e tente novamente.',
        );
      if (dto.status === 'CANCELADA')
        await tx.agendamento.updateMany({
          where: { contratacaoId: id },
          data: { ativo: false },
        });
    });
    return this.findOne(id);
  }
  private novoCodigo() {
    let codigo = '';
    for (let i = 0; i < TAMANHO_CODIGO; i++)
      codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)];
    return codigo;
  }

  /** O responsável gera (ou renova) o código que o cuidador precisa digitar. */
  async gerarCodigoConclusao(id: number, usuario: Identidade) {
    const contratacao = await this.prisma.contratacao.findUnique({
      where: { id },
      select: { responsavelId: true, status: true },
    });
    if (!contratacao)
      throw new NotFoundException('Contratação não encontrada.');
    if (contratacao.responsavelId !== usuario.responsavelId)
      throw new ForbiddenException(
        'Somente o responsável por esta contratação pode gerar o código.',
      );
    if (contratacao.status !== 'ACEITA')
      throw new BadRequestException(
        'O código só pode ser gerado para atendimentos aceitos.',
      );
    const codigo = this.novoCodigo();
    const result = await this.prisma.contratacao.updateMany({
      where: { id, status: 'ACEITA' },
      data: {
        codigoConclusaoHash: await bcrypt.hash(codigo, 10),
        tentativasCodigo: 0,
      },
    });
    if (!result.count)
      throw new ConflictException(
        'A contratação foi alterada. Atualize os dados e tente novamente.',
      );
    return { codigo };
  }

  /** Cada tentativa é contabilizada ANTES da comparação, para não permitir corrida. */
  private async validarCodigoConclusao(id: number, codigo?: string) {
    if (!codigo)
      throw new BadRequestException(
        'Informe o código de confirmação fornecido pelo responsável.',
      );
    const reservada = await this.prisma.contratacao.updateMany({
      where: {
        id,
        codigoConclusaoHash: { not: null },
        tentativasCodigo: { lt: MAX_TENTATIVAS_CODIGO },
      },
      data: { tentativasCodigo: { increment: 1 } },
    });
    const atual = await this.prisma.contratacao.findUnique({
      where: { id },
      select: { codigoConclusaoHash: true, tentativasCodigo: true },
    });
    if (!atual?.codigoConclusaoHash)
      throw new BadRequestException(
        'O responsável ainda não gerou o código de confirmação.',
      );
    if (!reservada.count)
      throw new HttpException(
        'Muitas tentativas incorretas. Peça ao responsável para gerar um novo código.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const correto = await bcrypt.compare(
      codigo.toUpperCase(),
      atual.codigoConclusaoHash,
    );
    if (!correto) {
      const restantes = Math.max(
        MAX_TENTATIVAS_CODIGO - atual.tentativasCodigo,
        0,
      );
      throw new BadRequestException(
        restantes
          ? `Código incorreto. Tentativas restantes: ${restantes}.`
          : 'Código incorreto. Peça ao responsável para gerar um novo código.',
      );
    }
  }
}
