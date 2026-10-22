import { api } from './api';

export type Contato = {
  id: number;
  nome: string;
  nomeSocial: string | null;
  foto: { updatedAt: string } | null;
};

export type Mensagem = {
  id: number;
  remetenteId: number;
  propostaId: number | null;
  conteudo: string;
  lidaEm: string | null;
  createdAt: string;
};

export type Conversa = {
  contato: Contato;
  ultimaMensagem: Mensagem | null;
  naoLidas: number;
};

export const nomeDoContato = (contato: Contato) =>
  contato.nomeSocial || contato.nome;

export async function listarConversas() {
  return (await api.get<Conversa[]>('/mensagens/conversas')).data;
}

/** Sem `depois`: as últimas mensagens. Com `depois`: só as mais novas que esse id. */
export async function listarMensagens(usuarioId: number, depois?: number) {
  return (
    await api.get<Mensagem[]>(`/mensagens/conversas/${usuarioId}`, {
      params: depois === undefined ? undefined : { depois },
    })
  ).data;
}

export async function enviarMensagem(usuarioId: number, conteudo: string) {
  return (
    await api.post<Mensagem>(`/mensagens/conversas/${usuarioId}`, { conteudo })
  ).data;
}

/** Hora (HH:MM) se for de hoje; senão dia/mês. */
export function rotuloData(iso: string) {
  const data = new Date(iso);
  const hoje = new Date();
  if (data.toDateString() === hoje.toDateString())
    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function rotuloHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
