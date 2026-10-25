import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alteracoesIdoso,
  dadosIdosoFormulario,
  dadosIdosoParaApi,
} from '../src/utils/perfis.ts';
const idoso = {
  id: 3,
  nome: 'Maria Silva',
  nomeSocial: 'Maria',
  dataNascimento: '1940-05-20T00:00:00.000Z',
  cpf: '52998224725',
  telefone: '81999998888',
  sexo: 'Feminino',
  necessidadesEspeciais: 'Apoio ao caminhar',
  observacoes: 'Prefere manhã',
  updatedAt: '2026-10-25T00:00:00Z',
};

test('dados atuais do idoso preenchem o formulário, preservando informações de cuidado', () => {
  const dados = dadosIdosoFormulario(idoso);
  assert.equal(dados.dataNascimento, '20/05/1940');
  assert.equal(dados.necessidadesEspeciais, idoso.necessidadesEspeciais);
  assert.deepEqual(alteracoesIdoso(dados, dados), {});
});
test('edição parcial do idoso ignora máscaras e não reenvia dados intocados', () => {
  const dados = dadosIdosoFormulario(idoso);
  assert.deepEqual(
    alteracoesIdoso(dados, {
      ...dados,
      cpf: '529.982.247-25',
      telefone: '(81) 99999-8888',
      observacoes: 'Prefere tarde',
    }),
    { observacoes: 'Prefere tarde' },
  );
});
test('permite remover dados opcionais e preserva o apagamento no payload', () => {
  const dados = dadosIdosoFormulario(idoso);
  assert.deepEqual(
    alteracoesIdoso(dados, {
      ...dados,
      nomeSocial: '',
      cpf: '',
      telefone: '',
      necessidadesEspeciais: '',
      observacoes: '',
    }),
    {
      nomeSocial: '',
      cpf: null,
      telefone: null,
      necessidadesEspeciais: '',
      observacoes: '',
    },
  );
});
test('converte nascimento apenas para envio e mantém o rascunho original', () => {
  const dados = dadosIdosoFormulario(idoso);
  assert.equal(dadosIdosoParaApi(dados).dataNascimento, '1940-05-20');
  assert.equal(dados.dataNascimento, '20/05/1940');
  assert.deepEqual(
    alteracoesIdoso(dados, { ...dados, dataNascimento: '01/02/1942' }),
    { dataNascimento: '1942-02-01' },
  );
});
