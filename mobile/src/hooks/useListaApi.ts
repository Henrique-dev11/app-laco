import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api, mensagemErro } from '../services/api';

export function useListaApi<T>(url: string | null) {
  const [dados, setDados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setErro('');
      if (!url) {
        setDados([]);
        setCarregando(false);
        return () => controller.abort();
      }
      setCarregando(true);
      api
        .get<T[]>(url, { signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) setDados(data);
        })
        .catch((error) => {
          if (!controller.signal.aborted) setErro(mensagemErro(error));
        })
        .finally(() => {
          if (!controller.signal.aborted) setCarregando(false);
        });
      return () => controller.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- tentativa permite repetir a consulta após erro ou alteração.
    }, [url, tentativa]),
  );
  const atualizar = useCallback(() => setTentativa((value) => value + 1), []);
  return { dados, carregando, erro, atualizar };
}
