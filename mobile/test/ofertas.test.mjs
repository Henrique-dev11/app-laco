import test from 'node:test';
import assert from 'node:assert/strict';
import { valoresOferta, erroOferta } from '../src/utils/ofertas.ts';

const oferta = { nome: 'Companhia', preco: '35,50', duracao: '1,5', unidade: 'horas' };

test('converte reais e horas em preço decimal e minutos inteiros para a API', () => {
  assert.deepEqual(valoresOferta(oferta), { preco: 35.5, duracaoMinutos: 90 });
  assert.equal(erroOferta(oferta), '');
});
test('preserva minutos ao alternar para horas, inclusive com dízimas', () => {
  for (const minutos of [1, 20, 45, 60, 90, 120]) {
    const convertido = { ...oferta, duracao: String(minutos / 60) };
    assert.equal(valoresOferta(convertido).duracaoMinutos, minutos);
    assert.equal(erroOferta(convertido), '');
  }
});
test('rejeita valores incompletos, precisão monetária inválida e frações de minuto', () => {
  for (const change of [
    { nome: '   ' }, { preco: '' }, { preco: '0' }, { preco: '1,005' }, { preco: 'Infinity' },
    { preco: '100000000' }, { duracao: '' }, { duracao: '0' },
    { duracao: '0,01' }, { duracao: '25' }, { duracao: '1,2', unidade: 'minutos' },
  ]) assert.notEqual(erroOferta({ ...oferta, ...change }), '');
});
