import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminService } from './admin.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const environment = {
  NODE_ENV: process.env.NODE_ENV,
  FINANCEIRO_SIMULADO: process.env.FINANCEIRO_SIMULADO,
};
afterEach(() => {
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
function fixture(payments: unknown[] = []) {
  const groupBy = vi.fn().mockResolvedValue(payments);
  const tx = {
    cuidador: { count: vi.fn().mockResolvedValue(4) },
    responsavel: { count: vi.fn().mockResolvedValue(3) },
    idoso: { count: vi.fn().mockResolvedValue(5) },
    contratacao: {
      groupBy: vi
        .fn()
        .mockResolvedValue([{ status: 'CONCLUIDA', _count: { _all: 2 } }]),
    },
    pagamentoSimulado: { groupBy },
  };
  const prisma = { $transaction: (fn: (tx: unknown) => unknown) => fn(tx) };
  return {
    service: new AdminService(prisma as unknown as PrismaService),
    groupBy,
  };
}
describe('resumo financeiro administrativo', () => {
  it('separa o líquido liberado do bruto em contestação sem converter os decimais em float', async () => {
    process.env.NODE_ENV = 'test';
    process.env.FINANCEIRO_SIMULADO = '1';
    const money = (value: string) => ({ toFixed: () => value });
    const { service, groupBy } = fixture([
      {
        status: 'LIBERADO',
        _count: { _all: 2 },
        _sum: { liquido: money('270.00'), bruto: money('300.00') },
      },
      {
        status: 'EM_CONTESTACAO',
        _count: { _all: 1 },
        _sum: { bruto: money('150.00'), liquido: money('135.00') },
      },
    ]);
    const summary = await service.resumo();
    expect(summary.pagamentos).toEqual({
      disponivel: true,
      liberados: { quantidade: 2, liquido: '270.00' },
      emContestacao: { quantidade: 1, bruto: '150.00' },
    });
    expect(summary.contratacoes).toBe(2);
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['LIBERADO', 'EM_CONTESTACAO'] } },
      }),
    );
  });
  it('devolve zeros quando não existem pagamentos', async () => {
    process.env.NODE_ENV = 'test';
    process.env.FINANCEIRO_SIMULADO = '1';
    expect((await fixture().service.resumo()).pagamentos).toEqual({
      disponivel: true,
      liberados: { quantidade: 0, liquido: '0.00' },
      emContestacao: { quantidade: 0, bruto: '0.00' },
    });
  });
  it.each([
    ['test', '0'],
    ['production', '1'],
  ])(
    'não consulta pagamentos quando o financeiro está indisponível (%s)',
    async (nodeEnv, enabled) => {
      process.env.NODE_ENV = nodeEnv;
      process.env.FINANCEIRO_SIMULADO = enabled;
      const { service, groupBy } = fixture();
      expect((await service.resumo()).pagamentos.disponivel).toBe(false);
      expect(groupBy).not.toHaveBeenCalled();
    },
  );
});
