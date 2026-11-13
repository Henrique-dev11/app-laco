import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { agendadosParaHome, type Atendimento } from '../utils/home';

/** Atendimentos aceitos e agendados que a Home mostra (janela de ~2 dias). */
export function useAgendados() {
  const [agendados, setAgendados] = useState<Atendimento[]>([]);
  const [proximo, setProximo] = useState<Atendimento | null>(null);
  const [erro, setErro] = useState(false);
  const [agora, setAgora] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      api
        .get<Atendimento[]>('/agendamentos', { signal: controller.signal })
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          const instante = Date.now();
          const resultado = agendadosParaHome(data, instante);
          setAgora(instante);
          setErro(false);
          setAgendados(resultado.agendados);
          setProximo(resultado.proximo);
        })
        .catch(() => {
          if (!controller.signal.aborted) setErro(true);
        });
      return () => controller.abort();
    }, []),
  );
  return { agendados, proximo, erro, agora };
}
