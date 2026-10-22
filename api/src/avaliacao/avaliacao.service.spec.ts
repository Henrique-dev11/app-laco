import { describe, expect, it } from 'vitest';
import { AvaliacaoService, arredondarMedia } from './avaliacao.service.js';
import type { Identidade } from '../auth/auth.service.js';

// Banco falso em memória: só o necessário para exercitar as regras da avaliação.
function criarServico(status = 'CONCLUIDA') {
  const avaliacoes: any[] = [];
  const contrato = { responsavelId: 10, status, cuidadorServico: { cuidadorId: 20 } };
  const prisma: any = {
    contratacao: {
      findUnique: async ({ where }: any) =>
        where.id === 1
          ? { ...contrato, avaliacao: avaliacoes[0] ? { id: avaliacoes[0].id } : null }
          : null,
    },
    avaliacao: {
      create: async ({ data }: any) => {
        const nova = { id: avaliacoes.length + 1, createdAt: new Date(), ...data };
        avaliacoes.push(nova);
        return nova;
      },
    },
  };
  return { avaliacoes, service: new AvaliacaoService(prisma) };
}

const responsavel = {
  id: 1, tipoUsuario: 'RESPONSAVEL', responsavelId: 10, cuidadorId: null, sessaoId: 's',
} as Identidade;
const outroResponsavel = { ...responsavel, id: 4, responsavelId: 11 } as Identidade;
const cuidador = {
  id: 2, tipoUsuario: 'CUIDADOR', responsavelId: null, cuidadorId: 20, sessaoId: 's',
} as Identidade;
const admin = { ...cuidador, id: 3, tipoUsuario: 'ADMIN' } as Identidade;

describe('avaliação de atendimento', () => {
  it('responsável avalia atendimento concluído e a nota vai para o cuidador do contrato', async () => {
    const { service, avaliacoes } = criarServico();
    await service.criar(1, { nota: 5, comentario: '  Muito atenciosa!  ' }, responsavel);
    expect(avaliacoes[0]).toMatchObject({
      contratacaoId: 1, responsavelId: 10, cuidadorId: 20, nota: 5, comentario: 'Muito atenciosa!',
    });
  });

  it('comentário em branco vira null', async () => {
    const { service, avaliacoes } = criarServico();
    await service.criar(1, { nota: 4, comentario: '   ' }, responsavel);
    expect(avaliacoes[0].comentario).toBeNull();
  });

  it('só avalia atendimento concluído', async () => {
    for (const status of ['SOLICITADA', 'ACEITA', 'RECUSADA', 'CANCELADA']) {
      const { service } = criarServico(status);
      await expect(service.criar(1, { nota: 5 }, responsavel)).rejects.toThrow(/concluídos/);
    }
  });

  it('não permite avaliar duas vezes', async () => {
    const { service } = criarServico();
    await service.criar(1, { nota: 5 }, responsavel);
    await expect(service.criar(1, { nota: 1 }, responsavel)).rejects.toThrow(/já foi avaliado/);
  });

  it('só o responsável da contratação avalia (nem cuidador, nem admin, nem outro responsável)', async () => {
    const { service, avaliacoes } = criarServico();
    for (const quem of [cuidador, admin, outroResponsavel])
      await expect(service.criar(1, { nota: 5 }, quem)).rejects.toThrow(/Somente o responsável/);
    expect(avaliacoes).toHaveLength(0);
  });

  it('contratação inexistente retorna 404', async () => {
    const { service } = criarServico();
    await expect(service.criar(99, { nota: 5 }, responsavel)).rejects.toThrow(/não encontrada/);
  });

  it('corrida: violação do índice único vira 409', async () => {
    const { service } = criarServico();
    (service as any).prisma.avaliacao.create = async () => {
      throw Object.assign(new Error('unique'), { code: 'P2002' });
    };
    await expect(service.criar(1, { nota: 5 }, responsavel)).rejects.toThrow(/já foi avaliado/);
  });
});

describe('média', () => {
  it('arredonda para uma casa e devolve null sem avaliações', () => {
    expect(arredondarMedia(4.666)).toBe(4.7);
    expect(arredondarMedia(5)).toBe(5);
    expect(arredondarMedia(null)).toBeNull();
    expect(arredondarMedia(undefined)).toBeNull();
  });
});
