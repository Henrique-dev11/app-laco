export function dataSaoPaulo(agora = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}
export function mudarMes(mes: string, diferenca: number) {
  const [ano, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(ano, numero - 1 + diferenca, 1))
    .toISOString()
    .slice(0, 7);
}
export function diasCalendario(mes: string) {
  const [ano, numero] = mes.split('-').map(Number);
  const inicio = new Date(Date.UTC(ano, numero - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(ano, numero, 0)).getUTCDate();
  return [
    ...Array.from({ length: inicio }, () => null),
    ...Array.from(
      { length: total },
      (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`,
    ),
  ];
}
