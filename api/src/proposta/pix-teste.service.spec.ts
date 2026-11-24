import { afterEach, expect, it, vi } from 'vitest';
import { PixTesteService } from './pix-teste.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('reutiliza a cobrança e consulta o provedor para mostrar o estado do Pix', async () => {
  vi.stubEnv('PIX_MERCADO_PAGO_TEST_TOKEN', 'token-de-teste-falso');
  vi.stubEnv('PIX_MERCADO_PAGO_TEST_EMAIL', 'pagador@exemplo.test');
  const proposta = {
    id: 1,
    total: new Prisma.Decimal('35.00'),
    responsavelId: 3,
    pixOrdemId: null as string | null,
    pixReferencia: null as string | null,
  };
  const db = {
    propostaAtendimento: {
      findFirst: async () => ({ ...proposta }),
      findUniqueOrThrow: async () => ({ ...proposta }),
      updateMany: async ({ data }: { data: Partial<typeof proposta> }) =>
        Object.assign(proposta, data),
    },
  } as unknown as PrismaService;
  const usuario = {
    id: 31,
    tipoUsuario: 'RESPONSAVEL',
    responsavelId: 3,
    cuidadorId: null,
    sessaoId: 'teste',
  };
  let status = 'action_required';
  let statusDetail = 'waiting_payment';
  const provedor = vi.fn(async (_url: URL, _opcoes: RequestInit) =>
    Response.json({
      id: 'order-teste',
      external_reference: proposta.pixReferencia,
      total_amount: '35.00',
      status,
      status_detail: statusDetail,
      transactions: {
        payments: [{ status, payment_method: { qr_code: 'pix-teste' } }],
      },
    }),
  );
  vi.stubGlobal('fetch', provedor);
  const pix = new PixTesteService(db);
  expect((await pix.consultar(21, 1, usuario)).status).toBe('SEM_COBRANCA');
  expect(await pix.consultar(21, 1, usuario, true)).toMatchObject({
    status: 'PENDENTE',
    codigo: 'pix-teste',
  });
  expect(provedor.mock.calls[0][1]).toMatchObject({
    method: 'POST',
    headers: { 'X-Idempotency-Key': proposta.pixReferencia },
  });
  expect(JSON.parse(String(provedor.mock.calls[0][1].body)).total_amount).toBe(
    '35.00',
  );
  await pix.consultar(21, 1, usuario, true);
  expect(provedor.mock.calls[1][1].method).toBe('GET');
  status = 'processed';
  statusDetail = 'accredited';
  expect((await pix.consultar(21, 1, usuario)).status).toBe('CONFIRMADO');
  status = 'canceled';
  statusDetail = 'expired';
  expect((await pix.consultar(21, 1, usuario)).status).toBe('EXPIRADO');
});
