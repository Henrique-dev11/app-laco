import type { Servico } from '../types/servico';

export async function listarServicos(signal: AbortSignal): Promise<Servico[]> {
  // As telas de cadastro não dependem da configuração da API.
  const { api } = await import('./api');
  const response = await api.get<Servico[]>('/servicos', { signal });
  return response.data;
}
