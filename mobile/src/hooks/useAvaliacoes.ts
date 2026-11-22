import { useCallback, useEffect, useState } from 'react';
import { mensagemErro } from '../services/api';
import {
  listarAvaliacoes,
  type ResumoAvaliacoes,
} from '../services/avaliacoes';

type Resultado = { chave: string; resumo: ResumoAvaliacoes | null; erro: string };

/**
 * Avaliações de um cuidador. Com `cuidadorId` nulo não consulta nada, o que
 * permite chamar o hook antes de a pessoa escolher o cuidador (e consultar de
 * novo a cada vez que um cuidador é aberto). Mudar `versao` força nova consulta
 * mesmo para o mesmo cuidador (ex.: ao reabrir os detalhes dele).
 */
export function useAvaliacoes(cuidadorId: number | null, versao = 0) {
  const [tentativa, setTentativa] = useState(0);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  // O resultado só vale para o cuidador/tentativa que o gerou; qualquer outro
  // caso é "carregando", sem precisar zerar o estado dentro do efeito.
  const chave = `${cuidadorId}:${versao}:${tentativa}`;
  useEffect(() => {
    if (cuidadorId === null) return;
    const controller = new AbortController();
    listarAvaliacoes(cuidadorId, controller.signal)
      .then((resumo) => {
        if (!controller.signal.aborted)
          setResultado({ chave, resumo, erro: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResultado({ chave, resumo: null, erro: mensagemErro(error) });
      });
    return () => controller.abort();
  }, [cuidadorId, chave]);
  const atual = resultado?.chave === chave ? resultado : null;
  const atualizar = useCallback(() => setTentativa((n) => n + 1), []);
  return {
    resumo: atual?.resumo ?? null,
    carregando: cuidadorId !== null && !atual,
    erro: atual?.erro ?? '',
    atualizar,
  };
}
