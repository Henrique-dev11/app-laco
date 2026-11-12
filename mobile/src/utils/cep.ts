export type EnderecoCep = {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type CamposEndereco = EnderecoCep;

/**
 * Converte a resposta do ViaCEP em endereço. Devolve `null` quando o CEP não
 * existe (o ViaCEP responde `{ "erro": true }`) ou a resposta não tem cidade.
 */
export function enderecoDaRespostaViaCep(dados: unknown): EnderecoCep | null {
  if (!dados || typeof dados !== 'object') return null;
  const resposta = dados as Record<string, unknown>;
  if (resposta.erro) return null;
  const texto = (valor: unknown) =>
    typeof valor === 'string' ? valor.trim() : '';
  const endereco = {
    rua: texto(resposta.logradouro),
    bairro: texto(resposta.bairro),
    cidade: texto(resposta.localidade),
    estado: texto(resposta.uf).toUpperCase(),
  };
  return endereco.cidade || endereco.estado ? endereco : null;
}

/**
 * Preenche rua, bairro, cidade e UF com o que o CEP trouxe. Campo que o CEP
 * não informa (CEP geral de cidade pequena, sem rua) mantém o que já estava.
 * Número e complemento nunca são tocados.
 */
export function aplicarEnderecoCep<T extends CamposEndereco>(
  atual: T,
  encontrado: EnderecoCep,
): T {
  return {
    ...atual,
    rua: encontrado.rua || atual.rua,
    bairro: encontrado.bairro || atual.bairro,
    cidade: encontrado.cidade || atual.cidade,
    estado: encontrado.estado || atual.estado,
  };
}
