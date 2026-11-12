/** IDs estáveis evitam duplicação quando o envio e a consulta chegam juntos. */
export function juntarMensagens<T extends { id: number }>(
  atuais: T[],
  novas: T[],
): T[] {
  if (!novas.length) return atuais;
  const porId = new Map(atuais.map((m) => [m.id, m]));
  for (const nova of novas) porId.set(nova.id, nova);
  return [...porId.values()].sort((a, b) => a.id - b.id);
}

/** Histórico inicial e respostas repetidas não são novas mensagens visuais. */
export function idsNovasMensagens(
  conhecidos: ReadonlySet<number>,
  novas: { id: number }[],
  inicializada: boolean,
) {
  return inicializada
    ? [...new Set(novas.filter((m) => !conhecidos.has(m.id)).map((m) => m.id))]
    : [];
}
