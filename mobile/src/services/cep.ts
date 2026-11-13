import { enderecoDaRespostaViaCep, type EnderecoCep } from '../utils/cep';

/**
 * Consulta o ViaCEP. É uma chamada pública, feita com `fetch` de propósito:
 * a instância `api` leva o token de login e só deve falar com a API do Laço.
 * Devolve `null` se o CEP não existe; lança erro se a consulta falhar.
 */
export async function consultarCep(
  cep: string,
  signal?: AbortSignal,
): Promise<EnderecoCep | null> {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    signal,
  });
  if (resposta.status === 400) return null;
  if (!resposta.ok) throw new Error(`ViaCEP respondeu ${resposta.status}`);
  return enderecoDaRespostaViaCep(await resposta.json());
}
