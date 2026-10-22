import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { listarConversas, nomeDoContato } from '../services/mensagens';
import type { DadosAviso } from '../services/notificacoes';

type Contratacao = {
  id: number;
  status: string;
  updatedAt?: string;
  createdAt?: string;
  responsavel: { usuario: { nome: string } };
  cuidadorServico: {
    cuidador: { usuario: { nome: string } };
    servico: { nome: string };
  };
};

export type ItemNotificacao = {
  id: string;
  tipo: 'mensagem' | 'contratacao';
  titulo: string;
  texto: string;
  data: string;
  /** Conta no número do sino (só o que ainda pede uma ação). */
  pendente: boolean;
  /** Quantidade de mensagens novas, quando for de conversa. */
  quantidade?: number;
  conversa?: DadosAviso;
};

const INTERVALO_MS = 10000;
const JANELA_RESPOSTAS_MS = 7 * 24 * 60 * 60 * 1000;
const RESPOSTAS: Record<string, string> = {
  ACEITA: 'aceitou sua solicitação',
  RECUSADA: 'recusou sua solicitação',
  CONCLUIDA: 'concluiu o atendimento',
  CANCELADA: 'teve a contratação cancelada',
};

/**
 * Reúne os avisos do usuário: mensagens não lidas, solicitações novas (para o
 * cuidador) e respostas às solicitações dos últimos 7 dias (para o responsável).
 */
export function useNotificacoes() {
  const { usuario } = useAuth();
  const souCuidador = !!usuario?.cuidador;
  const [itens, setItens] = useState<ItemNotificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      async function carregar() {
        try {
          const [conversas, contratos] = await Promise.all([
            listarConversas(),
            api.get<Contratacao[]>('/contratacoes').then((r) => r.data),
          ]);
          if (!ativo) return;
          const lista: ItemNotificacao[] = [];
          for (const { contato, ultimaMensagem, naoLidas } of conversas) {
            if (!ultimaMensagem || naoLidas === 0) continue;
            lista.push({
              id: `msg-${contato.id}`,
              tipo: 'mensagem',
              titulo: nomeDoContato(contato),
              texto: ultimaMensagem.conteudo,
              data: ultimaMensagem.createdAt,
              pendente: true,
              quantidade: naoLidas,
              conversa: {
                usuarioId: contato.id,
                nome: nomeDoContato(contato),
                fotoVersao: contato.foto?.updatedAt ?? null,
              },
            });
          }
          const limite = Date.now() - JANELA_RESPOSTAS_MS;
          for (const c of contratos) {
            const data = c.updatedAt ?? c.createdAt ?? new Date().toISOString();
            const servico = c.cuidadorServico.servico.nome;
            if (souCuidador && c.status === 'SOLICITADA')
              lista.push({
                id: `sol-${c.id}`,
                tipo: 'contratacao',
                titulo: 'Nova solicitação',
                texto: `${c.responsavel.usuario.nome} pediu ${servico}.`,
                data,
                pendente: true,
              });
            else if (
              !souCuidador &&
              RESPOSTAS[c.status] &&
              new Date(data).getTime() >= limite
            )
              lista.push({
                id: `res-${c.id}`,
                tipo: 'contratacao',
                titulo: 'Contratação atualizada',
                texto: `${c.cuidadorServico.cuidador.usuario.nome} ${RESPOSTAS[c.status]} (${servico}).`,
                data,
                pendente: false,
              });
          }
          lista.sort(
            (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
          );
          setItens(lista);
          setErro('');
        } catch (error) {
          if (ativo) setErro(mensagemErro(error));
        } finally {
          if (ativo) setCarregando(false);
        }
      }
      void carregar();
      const timer = setInterval(() => void carregar(), INTERVALO_MS);
      return () => {
        ativo = false;
        clearInterval(timer);
      };
    }, [souCuidador]),
  );

  const pendentes = itens.filter((item) => item.pendente).length;
  return { itens, carregando, erro, pendentes };
}
