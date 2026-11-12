import { api } from './api';
export type Proposta = {
  id: number;
  negociacaoId: string;
  versao: number;
  status: string;
  idosoId: number;
  total: string;
  observacoes: string | null;
  resposta: string | null;
  idoso: { id: number; nome: string };
  cuidador: { usuario: { nome: string } };
  itens: {
    id: number;
    cuidadorServicoId: number;
    contratacaoOrigemId: number | null;
    nomeServico: string;
    precoReferencia: string;
    preco: string;
    duracaoMinutos: number;
    inicios: string[];
    contratacoes: {
      id: number;
      status: string;
      agendamento: { inicio: string; fim: string; ativo: boolean } | null;
    }[];
  }[];
};
export type ContextoProposta = {
  idosos: { id: number; nome: string; nomeSocial: string | null }[];
  ofertas: {
    id: number;
    preco: string;
    duracaoMinutos: number;
    servico: { nome: string };
  }[];
  contratacoes: {
    id: number;
    idosoId: number;
    cuidadorServicoId: number;
    status: string;
  }[];
};
export const urlPropostas = (contatoId: number) =>
  `/mensagens/conversas/${contatoId}/propostas`;
export const listarPropostas = async (contatoId: number) =>
  (await api.get<Proposta[]>(urlPropostas(contatoId))).data;
export const statusProposta: Record<string, string> = {
  PENDENTE: 'Aguardando confirmação',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  ALTERACOES_SOLICITADAS: 'Alterações solicitadas',
  SUBSTITUIDA: 'Substituída por nova versão',
};
export const valorProposta = (valor: string | number) =>
  Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataProposta = (data: string) =>
  new Date(data).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });
