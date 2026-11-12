export function centavosProposta(valor: string): number | null {
  const v = valor.trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(v)) return null;
  const [inteiro, fracao = ''] = v.split('.');
  const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, '0'));
  return centavos > 0 ? centavos : null;
}
export function decimalProposta(centavos: number) {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}
export function minutosProposta(valor: string, unidade: 'horas' | 'minutos') {
  const v = valor.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(v)) return null;
  const minutos = Number(v) * (unidade === 'horas' ? 60 : 1);
  const arredondado = Math.round(minutos);
  return Math.abs(minutos - arredondado) < 1e-7 &&
    arredondado >= 1 &&
    arredondado <= 720
    ? arredondado
    : null;
}
