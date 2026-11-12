import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import type { Identidade } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { EnviarMensagemDto } from './dto/enviar-mensagem.dto.js';

const LIMITE_MENSAGENS = 100;
const LIMITE_CONTATOS = 100;

const contatoSelect = {
  id: true,
  nome: true,
  nomeSocial: true,
  foto: { select: { updatedAt: true } },
} as const;

const mensagemSelect = {
  id: true,
  propostaId: true,
  remetenteId: true,
  conteudo: true,
  lidaEm: true,
  createdAt: true,
} as const;

/**
 * Conversas diretas entre responsável e cuidador. Por privacidade, o acesso é
 * sempre restrito aos dois participantes (nem administradores leem mensagens)
 * e só existe quando há uma contratação entre eles.
 */
@Injectable()
export class MensagemService {
  constructor(private readonly prisma: PrismaService) {}

  /** Usuários que têm contratação com o usuário logado (o outro lado de cada uma). */
  private async contatos(usuario: Identidade) {
    const filtros = [
      ...(usuario.responsavelId
        ? [{ responsavelId: usuario.responsavelId }]
        : []),
      ...(usuario.cuidadorId
        ? [{ cuidadorServico: { cuidadorId: usuario.cuidadorId } }]
        : []),
    ];
    if (!filtros.length) return [];
    const contratos = await this.prisma.contratacao.findMany({
      where: { OR: filtros },
      select: {
        responsavel: { select: { usuario: { select: contatoSelect } } },
        cuidadorServico: {
          select: {
            cuidador: { select: { usuario: { select: contatoSelect } } },
          },
        },
      },
      orderBy: { id: 'desc' },
    });
    const contatos = new Map<
      number,
      (typeof contratos)[number]['responsavel']['usuario']
    >();
    for (const contrato of contratos)
      for (const outro of [
        contrato.responsavel.usuario,
        contrato.cuidadorServico.cuidador.usuario,
      ])
        if (outro.id !== usuario.id) contatos.set(outro.id, outro);
    return [...contatos.values()].slice(0, LIMITE_CONTATOS);
  }

  async exigirContato(
    meuId: number,
    outroId: number,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    if (meuId === outroId)
      throw new BadRequestException('Escolha outra pessoa para conversar.');
    const contrato = await db.contratacao.findFirst({
      where: {
        OR: [
          {
            responsavel: { usuarioId: meuId },
            cuidadorServico: { cuidador: { usuarioId: outroId } },
          },
          {
            responsavel: { usuarioId: outroId },
            cuidadorServico: { cuidador: { usuarioId: meuId } },
          },
        ],
      },
      select: { id: true },
    });
    if (!contrato)
      throw new ForbiddenException(
        'Você só pode conversar com quem tem uma contratação com você.',
      );
  }

  async conversas(usuario: Identidade) {
    const contatos = await this.contatos(usuario);
    const conversas = await Promise.all(
      contatos.map(async (contato) => {
        const [ultima, naoLidas] = await Promise.all([
          this.prisma.mensagem.findFirst({
            where: {
              OR: [
                { remetenteId: usuario.id, destinatarioId: contato.id },
                { remetenteId: contato.id, destinatarioId: usuario.id },
              ],
            },
            orderBy: { id: 'desc' },
            select: mensagemSelect,
          }),
          this.prisma.mensagem.count({
            where: {
              remetenteId: contato.id,
              destinatarioId: usuario.id,
              lidaEm: null,
            },
          }),
        ]);
        return { contato, ultimaMensagem: ultima, naoLidas };
      }),
    );
    return conversas.sort((a, b) => {
      const ta = a.ultimaMensagem?.createdAt.getTime() ?? 0;
      const tb = b.ultimaMensagem?.createdAt.getTime() ?? 0;
      return tb - ta || a.contato.nome.localeCompare(b.contato.nome, 'pt-BR');
    });
  }

  async listar(usuario: Identidade, outroId: number, depois?: number) {
    await this.exigirContato(usuario.id, outroId);
    const entreOsDois = [
      { remetenteId: usuario.id, destinatarioId: outroId },
      { remetenteId: outroId, destinatarioId: usuario.id },
    ];
    const mensagens =
      depois === undefined
        ? (
            await this.prisma.mensagem.findMany({
              where: { OR: entreOsDois },
              orderBy: { id: 'desc' },
              take: LIMITE_MENSAGENS,
              select: mensagemSelect,
            })
          ).reverse()
        : await this.prisma.mensagem.findMany({
            where: { OR: entreOsDois, id: { gt: depois } },
            orderBy: { id: 'asc' },
            take: LIMITE_MENSAGENS,
            select: mensagemSelect,
          });
    await this.prisma.mensagem.updateMany({
      where: { remetenteId: outroId, destinatarioId: usuario.id, lidaEm: null },
      data: { lidaEm: new Date() },
    });
    return mensagens;
  }

  async enviar(usuario: Identidade, outroId: number, dto: EnviarMensagemDto) {
    await this.exigirContato(usuario.id, outroId);
    const conteudo = dto.conteudo.trim();
    if (!conteudo) throw new BadRequestException('Escreva a mensagem.');
    return this.prisma.mensagem.create({
      data: { remetenteId: usuario.id, destinatarioId: outroId, conteudo },
      select: mensagemSelect,
    });
  }
}
