import { describe, expect, it } from 'vitest';
import { ContratacaoService } from './contratacao.service.js';
import type { Identidade } from '../auth/auth.service.js';

type Linha = {
  id: number;
  responsavelId: number;
  cuidadorServicoId: number;
  status: string;
  codigoConclusaoHash: string | null;
  tentativasCodigo: number;
};

// Banco falso em memória: só o necessário para exercitar as regras do código.
function criarServico(status = 'ACEITA') {
  const linha: Linha = {
    id: 1,
    responsavelId: 10,
    cuidadorServicoId: 5,
    status,
    codigoConclusaoHash: null,
    tentativasCodigo: 0,
  };
  const combina = (where: any) =>
    (where.id === undefined || where.id === linha.id) &&
    (where.status === undefined || where.status === linha.status) &&
    (where.codigoConclusaoHash?.not === undefined ||
      linha.codigoConclusaoHash !== null) &&
    (where.tentativasCodigo?.lt === undefined ||
      linha.tentativasCodigo < where.tentativasCodigo.lt);
  const aplicar = (data: any) => {
    for (const [k, v] of Object.entries<any>(data))
      (linha as any)[k] = v?.increment ? (linha as any)[k] + v.increment : v;
  };
  const contratacao = {
    findUnique: async () => ({ ...linha }),
    updateMany: async ({ where, data }: any) => {
      if (!combina(where)) return { count: 0 };
      aplicar(data);
      return { count: 1 };
    },
  };
  const prisma: any = {
    contratacao,
    cuidadorServico: { findUniqueOrThrow: async () => ({ cuidadorId: 20 }) },
    agendamento: { updateMany: async () => ({ count: 0 }) },
    $transaction: async (cb: any) =>
      cb({ contratacao, agendamento: prisma.agendamento }),
  };
  return { linha, service: new ContratacaoService(prisma) };
}

const responsavel = {
  id: 1,
  tipoUsuario: 'RESPONSAVEL',
  responsavelId: 10,
  cuidadorId: null,
  sessaoId: 's',
} as Identidade;
const cuidador = {
  id: 2,
  tipoUsuario: 'CUIDADOR',
  responsavelId: null,
  cuidadorId: 20,
  sessaoId: 's',
} as Identidade;
const admin = { ...cuidador, id: 3, tipoUsuario: 'ADMIN' } as Identidade;
const concluir = { status: 'CONCLUIDA' } as const;

describe('código de conclusão', () => {
  it('gera 6 caracteres de A-Z e 0-9 e guarda só o hash', async () => {
    const { service, linha } = criarServico();
    const { codigo } = await service.gerarCodigoConclusao(1, responsavel);
    expect(codigo).toMatch(/^[A-Z0-9]{6}$/);
    expect(linha.codigoConclusaoHash).toBeTruthy();
    expect(linha.codigoConclusaoHash).not.toContain(codigo);
  });

  it('só o responsável da contratação gera o código', async () => {
    const { service } = criarServico();
    await expect(service.gerarCodigoConclusao(1, cuidador)).rejects.toThrow(
      /Somente o responsável/,
    );
  });

  it('cuidador sem código não conclui', async () => {
    const { service } = criarServico();
    await service.gerarCodigoConclusao(1, responsavel);
    await expect(
      service.updateStatus(1, concluir, cuidador),
    ).rejects.toThrow(/Informe o código/);
  });

  it('não conclui se o responsável ainda não gerou o código', async () => {
    const { service } = criarServico();
    await expect(
      service.updateStatus(1, { ...concluir, codigo: 'ABC123' }, cuidador),
    ).rejects.toThrow(/ainda não gerou/);
  });

  it('código errado consome tentativa; correto (minúsculo) conclui', async () => {
    const { service, linha } = criarServico();
    const { codigo } = await service.gerarCodigoConclusao(1, responsavel);
    const errado = codigo === 'AAAAAA' ? 'BBBBBB' : 'AAAAAA';
    await expect(
      service.updateStatus(1, { ...concluir, codigo: errado }, cuidador),
    ).rejects.toThrow(/Tentativas restantes: 4/);
    await service.updateStatus(
      1,
      { ...concluir, codigo: codigo.toLowerCase() },
      cuidador,
    );
    expect(linha.status).toBe('CONCLUIDA');
    expect(linha.codigoConclusaoHash).toBeNull();
  });

  it('bloqueia após 5 erros, mesmo com o código certo, até gerar outro', async () => {
    const { service, linha } = criarServico();
    const { codigo } = await service.gerarCodigoConclusao(1, responsavel);
    const errado = codigo === 'AAAAAA' ? 'BBBBBB' : 'AAAAAA';
    for (let i = 0; i < 5; i++)
      await expect(
        service.updateStatus(1, { ...concluir, codigo: errado }, cuidador),
      ).rejects.toThrow(/Código incorreto/);
    await expect(
      service.updateStatus(1, { ...concluir, codigo }, cuidador),
    ).rejects.toThrow(/Muitas tentativas/);
    expect(linha.status).toBe('ACEITA');
    const novo = await service.gerarCodigoConclusao(1, responsavel);
    await service.updateStatus(
      1,
      { ...concluir, codigo: novo.codigo },
      cuidador,
    );
    expect(linha.status).toBe('CONCLUIDA');
  });

  it('administrador conclui sem código', async () => {
    const { service, linha } = criarServico();
    await service.updateStatus(1, concluir, admin);
    expect(linha.status).toBe('CONCLUIDA');
  });
});
