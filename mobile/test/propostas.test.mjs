import test from 'node:test';
import assert from 'node:assert/strict';
import {
  centavosProposta,
  decimalProposta,
  minutosProposta,
} from '../src/utils/propostas.ts';
test('mantém centavos exatos ao somar vários serviços e atendimentos', () => {
  assert.equal(
    decimalProposta(centavosProposta('100,10') * 2 + centavosProposta('40.10')),
    '240.30',
  );
  assert.equal(
    decimalProposta(centavosProposta('0.1') + centavosProposta('0.2')),
    '0.30',
  );
});
test('rejeita preço zero, negativo, notação exponencial ou mais de duas casas', () => {
  for (const v of ['', '0', '-1', '1e3', '0.005', 'Infinity', '1,2.3'])
    assert.equal(centavosProposta(v), null);
});
test('converte horas para minutos inteiros, inclusive dízimas, e limita duração', () => {
  assert.equal(minutosProposta('1,5', 'horas'), 90);
  assert.equal(minutosProposta(String(20 / 60), 'horas'), 20);
  assert.equal(minutosProposta('300', 'minutos'), 300);
  for (const [v, u] of [
    ['0', 'minutos'],
    ['0.1', 'minutos'],
    ['13', 'horas'],
    ['-1', 'horas'],
  ])
    assert.equal(minutosProposta(v, u), null);
});
