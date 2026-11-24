import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Identidade } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Ordem = {
  id: string;
  external_reference: string;
  total_amount: string;
  status: string;
  status_detail?: string;
  transactions?: {
    payments?: {
      status: string;
      payment_method?: { qr_code?: string; qr_code_base64?: string };
    }[];
  };
};

@Injectable()
export class PixTesteService {
  constructor(private readonly prisma: PrismaService) {}

  async consultar(
    outro: number,
    id: number,
    usuario: Identidade,
    gerar = false,
  ) {
    const proposta = await this.prisma.propostaAtendimento.findFirst({
      where: {
        id,
        status: 'ACEITA',
        OR: [
          {
            responsavel: { usuarioId: usuario.id },
            cuidador: { usuarioId: outro },
          },
          {
            cuidador: { usuarioId: usuario.id },
            responsavel: { usuarioId: outro },
          },
        ],
      },
      select: {
        id: true,
        total: true,
        responsavelId: true,
        pixOrdemId: true,
        pixReferencia: true,
      },
    });
    if (!proposta)
      throw new NotFoundException('Proposta aceita não encontrada.');
    const total = proposta.total.toFixed(2);
    const token = process.env.PIX_MERCADO_PAGO_TEST_TOKEN;
    const pagador = process.env.PIX_MERCADO_PAGO_TEST_EMAIL;
    const habilitado =
      process.env.NODE_ENV !== 'production' && !!token && !!pagador;
    if (!habilitado || (!gerar && !proposta.pixOrdemId))
      return { habilitado, total, status: 'SEM_COBRANCA' as const };
    if (gerar && proposta.responsavelId !== usuario.responsavelId)
      throw new ForbiddenException('Somente o responsável pode gerar o Pix.');

    let ordemId = proposta.pixOrdemId;
    let referencia = proposta.pixReferencia;
    if (!ordemId && !referencia) {
      await this.prisma.propostaAtendimento.updateMany({
        where: { id, pixReferencia: null },
        data: { pixReferencia: randomUUID() },
      });
      const atual = await this.prisma.propostaAtendimento.findUniqueOrThrow({
        where: { id },
        select: { pixReferencia: true, pixOrdemId: true },
      });
      referencia = atual.pixReferencia;
      ordemId = atual.pixOrdemId;
    }
    if (!referencia)
      throw new ServiceUnavailableException('Referência do Pix indisponível.');
    const url = new URL('https://api.mercadopago.com/v1/orders');
    if (ordemId) url.pathname += '/' + encodeURIComponent(ordemId);
    let ordem: Ordem;
    try {
      const resposta = await fetch(url, {
        method: ordemId ? 'GET' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(!ordemId && { 'X-Idempotency-Key': referencia }),
        },
        body: ordemId
          ? undefined
          : JSON.stringify({
              type: 'online',
              processing_mode: 'automatic',
              total_amount: total,
              external_reference: referencia,
              payer: { email: pagador },
              transactions: {
                payments: [
                  {
                    amount: total,
                    payment_method: { id: 'pix', type: 'bank_transfer' },
                  },
                ],
              },
            }),
        signal: AbortSignal.timeout(8000),
      });
      if (!resposta.ok) throw new Error('Falha no provedor.');
      ordem = (await resposta.json()) as Ordem;
      if (
        !ordem.id ||
        ordem.external_reference !== referencia ||
        !/^\d+(?:\.\d{1,2})?$/.test(ordem.total_amount) ||
        !proposta.total.equals(ordem.total_amount) ||
        (ordemId && ordem.id !== ordemId)
      )
        throw new Error('Resposta incompatível.');
    } catch {
      throw new BadGatewayException(
        'O provedor de Pix de teste não confirmou a operação. Tente atualizar.',
      );
    }
    if (!ordemId)
      await this.prisma.propostaAtendimento.updateMany({
        where: { id, pixReferencia: referencia, pixOrdemId: null },
        data: { pixOrdemId: ordem.id },
      });
    const pagamento = ordem.transactions?.payments?.[0];
    const status =
      ordem.status === 'processed' && ordem.status_detail === 'accredited'
        ? 'CONFIRMADO'
        : ['expired', 'canceled', 'cancelled'].includes(ordem.status) ||
            ['expired', 'canceled', 'cancelled'].includes(
              pagamento?.status ?? '',
            )
          ? 'EXPIRADO'
          : 'PENDENTE';
    return {
      habilitado,
      total,
      status,
      codigo:
        status === 'PENDENTE' ? pagamento?.payment_method?.qr_code : undefined,
      imagem:
        status === 'PENDENTE'
          ? pagamento?.payment_method?.qr_code_base64
          : undefined,
    };
  }
}
