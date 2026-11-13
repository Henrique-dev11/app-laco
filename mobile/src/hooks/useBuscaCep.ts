import { useEffect, useRef, useState } from 'react';
import { consultarCep } from '../services/cep';
import { aplicarEnderecoCep } from '../utils/cep';
import { somenteNumeros } from '../utils/validation';

export type StatusCep = 'ocioso' | 'buscando' | 'nao_encontrado' | 'erro';

type Campos = {
  cep: string;
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
};
type Consulta = {
  digitos: string;
  resultado: 'ok' | 'nao_encontrado' | 'erro';
};

const TEMPO_LIMITE_MS = 10000;

/**
 * Quando o CEP chega a 8 dígitos, busca rua, bairro, cidade e UF e preenche o
 * formulário. Não consulta para o CEP que o formulário já tinha ao abrir (não
 * sobrescreve um endereço salvo), nem enquanto o formulário está desativado.
 * Se a busca falhar ou o CEP não existir, o endereço segue editável à mão.
 */
export function useBuscaCep<T extends Campos>(
  value: T,
  onChange: (value: T) => void,
  ativo = true,
): StatusCep {
  const digitos = somenteNumeros(value.cep);
  const [inicial] = useState(digitos);
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const valorRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valorRef.current = value;
    onChangeRef.current = onChange;
  });

  const consultavel = ativo && digitos.length === 8 && digitos !== inicial;
  const concluida = consulta?.digitos === digitos;

  useEffect(() => {
    if (!consultavel || concluida) return;
    let cancelado = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TEMPO_LIMITE_MS);
    consultarCep(digitos, controller.signal)
      .then((encontrado) => {
        if (cancelado) return;
        if (!encontrado) {
          setConsulta({ digitos, resultado: 'nao_encontrado' });
          return;
        }
        onChangeRef.current(aplicarEnderecoCep(valorRef.current, encontrado));
        setConsulta({ digitos, resultado: 'ok' });
      })
      .catch(() => {
        if (!cancelado) setConsulta({ digitos, resultado: 'erro' });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelado = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [consultavel, concluida, digitos]);

  if (!consultavel) return 'ocioso';
  if (!concluida || !consulta) return 'buscando';
  if (consulta.resultado === 'nao_encontrado') return 'nao_encontrado';
  return consulta.resultado === 'erro' ? 'erro' : 'ocioso';
}
