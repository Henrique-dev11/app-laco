/**
 * Escala de fontes do app, pensada para leitura por idosos.
 *
 * Todo `fontSize`/`lineHeight` passa por aqui: os valores nos estilos são o
 * tamanho "base" e `fs`/`lh` aplicam a ampliação. Para aumentar ou diminuir o
 * app inteiro, mude só `ESCALA_FONTE`.
 */
export const ESCALA_FONTE = 1.3;
/** Nada fica menor que isto, nem rótulos e datas pequenas. */
const TAMANHO_MINIMO = 14;
/** Títulos grandes crescem menos para não estourar a tela. */
const LIMITE_TITULO = 28;
const ESCALA_TITULO = 1.15;

export function fs(tamanho: number) {
  const escala = tamanho >= LIMITE_TITULO ? ESCALA_TITULO : ESCALA_FONTE;
  return Math.round(Math.max(tamanho * escala, TAMANHO_MINIMO));
}

export function lh(altura: number) {
  const escala = altura >= LIMITE_TITULO ? ESCALA_TITULO : ESCALA_FONTE;
  return Math.round(altura * escala);
}
