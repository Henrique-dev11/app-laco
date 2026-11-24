import { api } from './api';

export type AvisoPagamento = {
  id: number;
  etapa: 'RETENCAO' | 'LIBERACAO';
  servicos: string[];
  criadoEm: string;
  lidoEm: string | null;
  contratacaoId: number;
};

export async function listarAvisosPagamento() {
  return (await api.get<AvisoPagamento[]>('/financeiro/avisos')).data;
}

export async function lerAvisoPagamento(id: number) {
  return (
    await api.post<{ contratacaoId: number }>(`/financeiro/avisos/${id}/lido`)
  ).data;
}

export const urlDispositivoPagamento = '/financeiro/avisos/dispositivo';
