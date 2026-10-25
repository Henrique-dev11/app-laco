import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dataSaoPaulo,
  diasCalendario,
  mudarMes,
} from '../src/utils/calendario.ts';
import {
  alteracoes,
  dataParaApi,
  dataParaFormulario,
  resumoEndereco,
} from '../src/utils/perfis.ts';
test('usa o dia de São Paulo mesmo quando o dia UTC já virou', () => {
  assert.equal(dataSaoPaulo(new Date('2027-02-02T01:00:00Z')), '2027-02-01');
});
test('calendário respeita dias da semana, meses e anos bissextos', () => {
  assert.equal(mudarMes('2026-12', 1), '2027-01');
  assert.equal(mudarMes('2027-01', -1), '2026-12');
  const dias = diasCalendario('2028-02');
  assert.equal(dias.filter(Boolean).length, 29);
  assert.deepEqual(dias.slice(0, 3), [null, null, '2028-02-01']);
});
test('edição envia somente alterações e preserva apagamento de opcionais', () => {
  assert.deepEqual(
    alteracoes(
      { nome: 'Ana', telefone: '11999998888', social: 'Aninha' },
      { nome: 'Ana', telefone: '11911112222', social: '' },
    ),
    { telefone: '11911112222', social: '' },
  );
  assert.equal(dataParaApi('01/02/1940'), '1940-02-01');
  assert.equal(dataParaFormulario('1940-02-01T00:00:00Z'), '01/02/1940');
});

test('resumo de endereço mantém o texto exibido no perfil consistente e curto', () => {
  assert.equal(
    resumoEndereco({
      rua: 'Rua das Flores',
      numero: '321',
      complemento: 'Apto 2',
      bairro: 'Centro',
      cidade: 'Recife',
      estado: 'PE',
      cep: '50000-000',
    }),
    'Rua das Flores, 321 · Centro, Recife/PE',
  );
  assert.equal(
    resumoEndereco({
      rua: 'Avenida Norte',
      numero: '12',
      complemento: '',
      bairro: 'Boa Vista',
      cidade: 'Olinda',
      estado: 'PE',
      cep: '53000-000',
    }),
    'Avenida Norte, 12 · Boa Vista, Olinda/PE',
  );
});
