import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicarEnderecoCep,
  enderecoDaRespostaViaCep,
} from '../src/utils/cep.ts';

test('converte a resposta do ViaCEP em endereço', () => {
  assert.deepEqual(
    enderecoDaRespostaViaCep({
      cep: '01001-000',
      logradouro: ' Praça da Sé ',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'sp',
    }),
    { rua: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP' },
  );
});

test('CEP inexistente ou resposta inválida não gera endereço', () => {
  assert.equal(enderecoDaRespostaViaCep({ erro: true }), null);
  assert.equal(enderecoDaRespostaViaCep({ erro: 'true' }), null);
  assert.equal(enderecoDaRespostaViaCep(null), null);
  assert.equal(enderecoDaRespostaViaCep('texto'), null);
  assert.equal(enderecoDaRespostaViaCep({}), null);
});

test('aplicar o CEP preserva número, complemento e campos que o CEP não traz', () => {
  const atual = {
    cep: '08000-000',
    rua: 'Rua antiga',
    numero: '123',
    complemento: 'Apto 4',
    bairro: 'Bairro antigo',
    cidade: '',
    estado: '',
  };
  assert.deepEqual(
    aplicarEnderecoCep(atual, {
      rua: '',
      bairro: 'Guaianases',
      cidade: 'São Paulo',
      estado: 'SP',
    }),
    {
      cep: '08000-000',
      rua: 'Rua antiga',
      numero: '123',
      complemento: 'Apto 4',
      bairro: 'Guaianases',
      cidade: 'São Paulo',
      estado: 'SP',
    },
  );
});
