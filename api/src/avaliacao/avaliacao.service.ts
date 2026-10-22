import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { Identidade } from '../auth/auth.service.js';
import type { CreateAvaliacaoDto } from './dto/create-avaliacao.dto.js';

const LIMITE_LISTAGEM = 50;

/** Média com uma casa decimal (ex.: 4.7), ou null quando ainda não há avaliações. */
export const arredondarMedia = (media: number | null | undefined) =>
  media === null || media === undefined ? null : Math.round(media * 10) / 10;

@Injectable()
export class AvaliacaoService {
  constructor(private readonly prisma: PrismaService) {}

  /** O responsável avalia, uma única vez, um atendimento já concluído. */
  async criar(contratacaoId: number, dto: CreateAvaliacaoDto, usuario: Identidade) {
    const contrato = await this.prisma.contratacao.findUnique({
      where: { id: contratacaoId },
      select: {
        responsavelId: true,
        status: true,
        cuidadorServico: { select: { cuidadorId: true } },
        avaliacao: { select: { id: true } },
      },
    });
    if (!contrato) throw new NotFoundException('Contratação não encontrada.');
    if (contrato.responsavelId !== usuario.responsavelId)
      throw new ForbiddenException(
        'Somente o responsável por esta contratação pode avaliar.',
      );
    if (contrato.status !== 'CONCLUIDA')
      throw new BadRequestException(
        'Só é possível avaliar atendimentos concluídos.',
      );
    if (contrato.avaliacao)
      throw new ConflictException('Este atendimento já foi avaliado.');

    const comentario = dto.comentario?.trim() || null;
    try {
      return await this.prisma.avaliacao.create({
        data: {
          contratacaoId,
          responsavelId: contrato.responsavelId,
          cuidadorId: contrato.cuidadorServico.cuidadorId,
          nota: dto.nota,
          comentario,
        },
        select: { id: true, contratacaoId: true, nota: true, comentario: true, createdAt: true },
      });
    } catch (erro) {
      // Duas requisições simultâneas: a segunda cai no índice único.
      if ((erro as { code?: string }).code === 'P2002')
        throw new ConflictException('Este atendimento já foi avaliado.');
      throw erro;
    }
  }

  /** Lista pública: nota média, total e as avaliações mais recentes (só o primeiro nome do autor). */
  async listarDoCuidador(cuidadorId: number) {
    const cuidador = await this.prisma.cuidador.findFirst({
      where: {
        id: cuidadorId,
        statusVerificacao: 'APROVADO',
        usuario: { status: 'ATIVO' },
      },
      select: { id: true },
    });
    if (!cuidador) throw new NotFoundException('Cuidador não encontrado.');

    const [resumo, avaliacoes] = await Promise.all([
      this.prisma.avaliacao.aggregate({
        where: { cuidadorId },
        _avg: { nota: true },
        _count: { _all: true },
      }),
      this.prisma.avaliacao.findMany({
        where: { cuidadorId },
        orderBy: { createdAt: 'desc' },
        take: LIMITE_LISTAGEM,
        select: {
          id: true,
          nota: true,
          comentario: true,
          createdAt: true,
          responsavel: { select: { usuario: { select: { nome: true } } } },
        },
      }),
    ]);

    return {
      cuidadorId,
      media: arredondarMedia(resumo._avg.nota),
      total: resumo._count._all,
      avaliacoes: avaliacoes.map(({ responsavel, ...a }) => ({
        ...a,
        autor: responsavel.usuario.nome.trim().split(/\s+/)[0],
      })),
    };
  }
}
