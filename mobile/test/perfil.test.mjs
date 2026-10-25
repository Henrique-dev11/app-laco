import test from 'node:test';
import assert from 'node:assert/strict';
import { alteracoesPerfil, normalizarPerfil } from '../src/utils/perfis.ts';
import {
  formatarCep,
  formatarCpf,
  formatarTelefone,
  somenteNumeros,
} from '../src/utils/validation.ts';

const original = {
  nome: 'Ana Silva',
  nomeSocial: 'Ana',
  email: 'ana@teste.local',
  telefone: '11999998888',
  telefone2: '1133334444',
  cpf: '52998224725',
  dataNascimento: '20/05/1980',
  biografia: 'Cuido com carinho.',
  experienciaProfissional: 'Cinco anos',
  registroProfissional: '123',
};

test('máscaras e normalização não provocam alterações em dados intocados', () => {
  const mascarado = {
    ...original,
    nome: ' Ana Silva ',
    email: ' ANA@TESTE.LOCAL ',
    cpf: formatarCpf(original.cpf),
    telefone: formatarTelefone(original.telefone),
    telefone2: formatarTelefone(original.telefone2),
  };
  assert.deepEqual(alteracoesPerfil(original, mascarado, false), {});
  assert.deepEqual(normalizarPerfil(mascarado), original);
});

test('atualização parcial permite apagar opcionais sem reenviar CPF, e-mail ou endereço', () => {
  assert.deepEqual(
    alteracoesPerfil(
      original,
      { ...original, nomeSocial: '', telefone2: '' },
      false,
    ),
    {
      usuario: { nomeSocial: '', telefone2: null },
    },
  );
  assert.deepEqual(
    alteracoesPerfil(
      original,
      { ...original, telefone: '(81) 98888-7777' },
      false,
    ),
    {
      telefone: '81988887777',
    },
  );
});

test('e-mail e nascimento são enviados normalizados quando alterados', () => {
  assert.deepEqual(
    alteracoesPerfil(
      original,
      {
        ...original,
        email: ' NOVO@TESTE.LOCAL ',
        dataNascimento: '01/02/1985',
      },
      false,
    ),
    {
      usuario: { email: 'novo@teste.local' },
      dataNascimento: '1985-02-01',
    },
  );
});

test('campos profissionais pertencem apenas à edição do cuidador', () => {
  const editado = { ...original, biografia: '', registroProfissional: ' 456 ' };
  assert.deepEqual(alteracoesPerfil(original, editado, false), {});
  assert.deepEqual(alteracoesPerfil(original, editado, true), {
    biografia: '',
    registroProfissional: '456',
  });
});

test('máscaras de CPF, CEP e telefone preservam os dígitos aceitos pelo backend', () => {
  assert.equal(formatarCpf('52998224725'), '529.982.247-25');
  assert.equal(formatarCep('01001000'), '01001-000');
  assert.equal(formatarTelefone('1133334444'), '(11) 3333-4444');
  assert.equal(formatarTelefone('11999998888'), '(11) 99999-8888');
  assert.equal(formatarTelefone('5511999998888'), '+55 (11) 99999-8888');
  for (const telefone of [
    '11',
    '113',
    '1133334444',
    '11999998888',
    '5511999998888',
  ]) {
    assert.equal(somenteNumeros(formatarTelefone(telefone)), telefone);
    assert.equal(
      formatarTelefone(formatarTelefone(telefone)),
      formatarTelefone(telefone),
    );
  }
});
