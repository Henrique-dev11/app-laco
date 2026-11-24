import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, mensagemErro } from '../services/api';

export function useConsultaApi<T>(
  url: string | null,
  intervalo = 0,
  manterDuranteTroca = false,
) {
  const [resultado, setResultado] = useState<{
    url: string;
    dados: T;
    instante: number;
  }>();
  const [falha, setFalha] = useState<{ url: string; erro: string }>();
  const [pendente, setPendente] = useState(false);
  const requisicao = useRef<AbortController | null>(null);
  const focada = useRef(false);

  const consultar = useCallback(
    async (exibirProgresso: boolean) => {
      if (!focada.current || !url) return;
      requisicao.current?.abort();
      const atual = new AbortController();
      requisicao.current = atual;
      setPendente(exibirProgresso);
      setFalha(undefined);
      try {
        const { data } = await api.get<T>(url, { signal: atual.signal });
        if (!atual.signal.aborted)
          setResultado({ url, dados: data, instante: Date.now() });
      } catch (e) {
        if (!atual.signal.aborted) setFalha({ url, erro: mensagemErro(e) });
      } finally {
        if (requisicao.current === atual) {
          requisicao.current = null;
          setPendente(false);
        }
      }
    },
    [url],
  );

  useFocusEffect(
    useCallback(() => {
      focada.current = true;
      void consultar(false);
      const evento = AppState.addEventListener('change', (estado) => {
        if (estado === 'active') void consultar(false);
      });
      const timer =
        intervalo > 0
          ? setInterval(() => {
              if (!requisicao.current && AppState.currentState === 'active')
                void consultar(false);
            }, intervalo)
          : undefined;
      return () => {
        focada.current = false;
        requisicao.current?.abort();
        requisicao.current = null;
        evento.remove();
        if (timer !== undefined) clearInterval(timer);
      };
    }, [consultar, intervalo]),
  );

  const atualizar = useCallback(() => consultar(true), [consultar]);
  const dados =
    url && (resultado?.url === url || manterDuranteTroca)
      ? resultado?.dados
      : undefined;
  const erro = falha?.url === url ? (falha?.erro ?? '') : '';
  return {
    dados,
    instante: dados === undefined ? 0 : (resultado?.instante ?? 0),
    erro,
    carregando: !!url && (pendente || (dados === undefined && !erro)),
    atualizar,
  };
}
