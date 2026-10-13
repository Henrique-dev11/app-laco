import { useEffect, useState } from 'react';
import { api, mensagemErro } from '../services/api';

export function useListaApi<T>(url: string) {
  const [dados, setDados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get<T[]>(url, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setDados(response.data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setErro(mensagemErro(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [url, tentativa]);
  return {
    dados,
    carregando,
    erro,
    atualizar: () => {
      setCarregando(true);
      setErro('');
      setTentativa((value) => value + 1);
    },
  };
}
