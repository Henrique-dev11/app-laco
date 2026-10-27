import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationMotion, nativeTransition } from '../src/motion/policy.ts';
import { juntarMensagens, idsNovasMensagens } from '../src/utils/chat.ts';

const home = { key: 'inicio', name: 'Home' };
const perfil = { key: 'perfil', name: 'Perfil' };
const editar = { key: 'editar', name: 'EditarPerfil' };
const conversa = { key: 'conversa-2', name: 'Conversa' };
const state = (...routes) => ({ index: routes.length - 1, routes });

test('navegação distingue abas, abertura, formulário, retorno e troca de sessão', () => {
  assert.equal(navigationMotion(undefined, state(home)), 'none');
  assert.equal(navigationMotion(state(home), state(home, perfil)), 'tab');
  assert.equal(navigationMotion(state(home), state(home, conversa)), 'forward');
  assert.equal(
    navigationMotion(state(home, perfil), state(home, perfil, editar)),
    'form',
  );
  assert.equal(
    navigationMotion(state(home, perfil, editar), state(home, perfil)),
    'back',
  );
  assert.equal(navigationMotion(state(home, conversa), state(home)), 'back');
  assert.equal(
    navigationMotion(state(home), state({ key: 'login', name: 'LoginType' })),
    'fade',
  );
});

test('atualizar parâmetros da rota atual não repete a transição', () => {
  const before = state(home, conversa);
  const after = state(home, { ...conversa, params: { fotoVersao: 'nova' } });
  assert.equal(navigationMotion(before, after), 'none');
});

test('reduzir movimento desativa transições nativas e a web usa sua própria entrada', () => {
  for (const platform of ['ios', 'android', 'web']) {
    for (const route of ['Home', 'EditarPerfil', 'Conversa']) {
      assert.equal(nativeTransition(route, true, platform), 'none');
    }
  }
  assert.equal(nativeTransition('Home', false, 'android'), 'fade');
  assert.equal(nativeTransition('Conversa', false, 'ios'), 'simple_push');
  assert.equal(
    nativeTransition('Conversa', false, 'android'),
    'slide_from_right',
  );
  assert.equal(
    nativeTransition('EditarPerfil', false, 'ios'),
    'slide_from_bottom',
  );
  assert.equal(nativeTransition('Conversa', false, 'web'), 'none');
});

test('consulta e confirmação do envio não duplicam nem desordenam balões', () => {
  const antigas = [
    { id: 2, conteudo: 'Oi' },
    { id: 1, conteudo: 'Olá' },
  ];
  const enviada = { id: 3, conteudo: 'Até amanhã' };
  const aposEnvio = juntarMensagens(antigas, [enviada]);
  const aposConsulta = juntarMensagens(aposEnvio, [
    { ...enviada },
    { id: 4, conteudo: 'Combinado' },
  ]);
  assert.deepEqual(
    aposConsulta.map((m) => m.id),
    [1, 2, 3, 4],
  );
  assert.equal(juntarMensagens(aposConsulta, []), aposConsulta);
});

test('histórico e mensagens já vistas não disparam animação ou contador', () => {
  const novas = [{ id: 2 }, { id: 3 }, { id: 3 }];
  assert.deepEqual(idsNovasMensagens(new Set(), novas, false), []);
  assert.deepEqual(idsNovasMensagens(new Set([2]), novas, true), [3]);
  assert.deepEqual(idsNovasMensagens(new Set([2, 3]), novas, true), []);
});
