/**
 * Regras puras do sistema de avaliações (sem React), para serem testadas em
 * `test/avaliacoes.test.mjs` e reaproveitadas pelas telas.
 */
export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;
export const COMENTARIO_MAXIMO = 500;

/** Texto curto que acompanha as estrelas (estilo "Ótimo", "Bom"…). */
const rotulosNota: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Ótimo',
};

export const rotuloNota = (nota: number) => rotulosNota[Math.round(nota)] ?? '';

export const notaValida = (nota: unknown): nota is number =>
  typeof nota === 'number' &&
  Number.isInteger(nota) &&
  nota >= NOTA_MINIMA &&
  nota <= NOTA_MAXIMA;

/** Retorna a mensagem de erro do formulário, ou '' se estiver válido. */
export function validarAvaliacao(nota: number, comentario: string) {
  if (!notaValida(nota)) return 'Escolha de 1 a 5 estrelas para avaliar.';
  if (comentario.trim().length > COMENTARIO_MAXIMO)
    return `O comentário pode ter até ${COMENTARIO_MAXIMO} caracteres.`;
  return '';
}

/** Corpo enviado à API; o comentário é opcional e some se estiver em branco. */
export function dadosAvaliacao(nota: number, comentario: string) {
  const texto = comentario.trim();
  return { nota, ...(texto ? { comentario: texto } : {}) };
}

/** A API pode devolver a média como número ou texto (Decimal); null = sem notas. */
export function normalizarMedia(media: unknown): number | null {
  const valor = typeof media === 'string' ? Number(media) : media;
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0
    ? Math.min(NOTA_MAXIMA, valor)
    : null;
}

export const formatarMedia = (media: number | null) =>
  media === null ? '–' : media.toFixed(1).replace('.', ',');

export function textoTotalAvaliacoes(total: number) {
  if (!total) return 'Sem avaliações';
  return total === 1 ? '1 avaliação' : `${total} avaliações`;
}

/** "Maria Souza Lima" → "Maria L." (mostra pouco do avaliador, como nos apps de entrega). */
export function nomeAvaliador(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'Usuário';
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[partes.length - 1].charAt(0).toUpperCase()}.`;
}
