import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMENTARIO_MAXIMO,
  dadosAvaliacao,
  formatarMedia,
  nomeAvaliador,
  normalizarMedia,
  notaValida,
  rotuloNota,
  textoTotalAvaliacoes,
  validarAvaliacao,
} from '../src/utils/avaliacoes.ts';

test('a nota precisa ser um inteiro de 1 a 5', () => {
  for (const nota of [1, 2, 3, 4, 5]) assert.equal(notaValida(nota), true);
  for (const nota of [0, 6, 2.5, -1, NaN, '5', null, undefined])
    assert.equal(notaValida(nota), false);
});

test('o formulário exige a nota e limita o comentário', () => {
  assert.match(validarAvaliacao(0, ''), /1 a 5 estrelas/);
  assert.equal(validarAvaliacao(4, ''), '');
  assert.equal(validarAvaliacao(5, 'x'.repeat(COMENTARIO_MAXIMO)), '');
  assert.match(
    validarAvaliacao(5, 'x'.repeat(COMENTARIO_MAXIMO + 1)),
    /até 500 caracteres/,
  );
  // Espaços nas pontas não contam para o limite.
  assert.equal(validarAvaliacao(5, ` ${'x'.repeat(COMENTARIO_MAXIMO)} `), '');
});

test('o corpo enviado à API omite comentário em branco e apara espaços', () => {
  assert.deepEqual(dadosAvaliacao(5, '   '), { nota: 5 });
  assert.deepEqual(dadosAvaliacao(3, '  Pontual e atenciosa  '), {
    nota: 3,
    comentario: 'Pontual e atenciosa',
  });
});

test('a média aceita número ou texto (Decimal) e esconde "sem notas"', () => {
  assert.equal(normalizarMedia(4.5), 4.5);
  assert.equal(normalizarMedia('4.25'), 4.25);
  assert.equal(normalizarMedia(0), null);
  assert.equal(normalizarMedia(null), null);
  assert.equal(normalizarMedia(undefined), null);
  assert.equal(normalizarMedia('abc'), null);
  assert.equal(normalizarMedia(7), 5);
  assert.equal(formatarMedia(4.25), '4,3');
  assert.equal(formatarMedia(null), '–');
});

test('textos de apoio das avaliações', () => {
  assert.equal(textoTotalAvaliacoes(0), 'Sem avaliações');
  assert.equal(textoTotalAvaliacoes(1), '1 avaliação');
  assert.equal(textoTotalAvaliacoes(12), '12 avaliações');
  assert.equal(rotuloNota(5), 'Ótimo');
  assert.equal(rotuloNota(1), 'Muito ruim');
  assert.equal(rotuloNota(0), '');
});

test('o avaliador aparece só com nome e inicial do sobrenome', () => {
  assert.equal(nomeAvaliador('Maria de Souza Lima'), 'Maria L.');
  assert.equal(nomeAvaliador('  João  '), 'João');
  assert.equal(nomeAvaliador(''), 'Usuário');
});
