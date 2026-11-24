import { api } from './api';
import { dadosAvaliacao, normalizarMedia } from '../utils/avaliacoes';

/**
 * Avaliações de cuidadores.
 *
 * Contrato esperado da API (a avaliação nasce de uma contratação concluída, o
 * que garante que só quem foi atendido avalia e que cada atendimento gera no
 * máximo uma avaliação):
 *
 * - `POST /contratacoes/:id/avaliacao` `{ nota: 1..5, comentario?: string }`
 *   → somente o responsável contratante (inclui o idoso independente) de uma
 *   contratação CONCLUIDA; 409 se ela já foi avaliada.
 * - `GET /catalogo/cuidadores/:cuidadorId/avaliacoes`
 *   → `{ media, total, avaliacoes: Avaliacao[] }`, mais recentes primeiro.
 * - `GET /contratacoes` e `GET /catalogo/cuidadores` passam a trazer
 *   `avaliacao` (da contratação) e `avaliacaoMedia`/`totalAvaliacoes` (do cuidador).
 */
export type Avaliacao = {
  id: number;
  nota: number;
  comentario: string | null;
  criadoEm: string;
  autor: { nome: string; nomeSocial?: string | null };
};

export type ResumoAvaliacoes = {
  media: number | null;
  total: number;
  avaliacoes: Avaliacao[];
};

export const urlAvaliacoesCuidador = (cuidadorId: number) =>
  `/catalogo/cuidadores/${cuidadorId}/avaliacoes`;

export async function listarAvaliacoes(
  cuidadorId: number,
  signal?: AbortSignal,
): Promise<ResumoAvaliacoes> {
  const { data } = await api.get<
    Omit<ResumoAvaliacoes, 'avaliacoes'> & {
      avaliacoes: (Omit<Avaliacao, 'autor' | 'criadoEm'> & {
        autor: string;
        createdAt: string;
      })[];
    }
  >(urlAvaliacoesCuidador(cuidadorId), { signal });
  return {
    media: normalizarMedia(data.media),
    total: Number(data.total) || 0,
    avaliacoes: (data.avaliacoes ?? []).map(
      ({ autor, createdAt, ...item }) => ({
        ...item,
        autor: { nome: autor },
        criadoEm: createdAt,
      }),
    ),
  };
}

export const enviarAvaliacao = async (
  contratacaoId: number,
  nota: number,
  comentario: string,
) =>
  (
    await api.post<Avaliacao>(
      `/contratacoes/${contratacaoId}/avaliacao`,
      dadosAvaliacao(nota, comentario),
    )
  ).data;

export const dataAvaliacao = (data: string) =>
  new Date(data).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'medium',
  });
