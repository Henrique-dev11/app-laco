export function dataParaFormulario(iso: string) {
  return iso.slice(0, 10).split('-').reverse().join('/');
}
export function dataParaApi(data: string) {
  return data.split('/').reverse().join('-');
}
/** Envia só os campos editados, inclusive campos opcionais apagados pelo usuário. */
export function alteracoes<T extends object>(antes: T, depois: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(depois).filter(
      ([chave, valor]) => valor !== (antes as Record<string, unknown>)[chave],
    ),
  ) as Partial<T>;
}
