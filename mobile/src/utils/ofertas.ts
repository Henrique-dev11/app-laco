import type { OfertaRascunho } from '../types/cadastro';

export function valoresOferta(oferta: OfertaRascunho) {
  const minutos =
    Number(oferta.duracao.replace(',', '.')) *
    (oferta.unidade === 'horas' ? 60 : 1);
  return {
    preco: Number(oferta.preco.replace(',', '.')),
    duracaoMinutos:
      Math.abs(minutos - Math.round(minutos)) < 0.000001
        ? Math.round(minutos)
        : minutos,
  };
}
export function erroOferta(oferta: OfertaRascunho) {
  const { preco, duracaoMinutos } = valoresOferta(oferta);
  if (!oferta.nome.trim() || oferta.nome.trim().length > 150)
    return 'Informe um nome de até 150 caracteres.';
  if (
    !/^\d+([.,]\d{1,2})?$/.test(oferta.preco.trim()) ||
    !Number.isFinite(preco) ||
    preco < 0.01 ||
    preco > 99999999.99
  )
    return 'Informe um preço-base positivo com até duas casas decimais.';
  if (
    !/^\d+([.,]\d+)?$/.test(oferta.duracao.trim()) ||
    !Number.isInteger(duracaoMinutos) ||
    duracaoMinutos < 1 ||
    duracaoMinutos > 1440
  )
    return 'Informe duração de 1 a 1440 minutos (até 24 horas), sem frações de minuto.';
  return '';
}
