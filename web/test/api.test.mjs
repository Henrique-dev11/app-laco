import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, ApiError } from '../admin/assets/api.js';
import { createServer } from '../scripts/server.mjs';

test('requisições administrativas enviam a sessão e tratam conflitos', async () => {
  let chamada;
  const api = createApi({
    getToken: () => 'token-de-teste',
    fetcher: async (url, options) => {
      chamada = { url, options };
      return new Response(
        JSON.stringify({ message: 'Cadastro já atualizado.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    },
  });
  await assert.rejects(
    api.verificar(12, 'APROVADO'),
    (error) =>
      error instanceof ApiError &&
      error.status === 409 &&
      error.message === 'Cadastro já atualizado.',
  );
  assert.equal(chamada.url, '/api/admin/cuidadores/12/verificacao');
  assert.equal(chamada.options.headers.Authorization, 'Bearer token-de-teste');
  assert.deepEqual(JSON.parse(chamada.options.body), {
    statusVerificacao: 'APROVADO',
  });
});

test('sessão expirada sinaliza logout e mensagens da validação são preservadas', async () => {
  let revogada = false;
  const api = createApi({
    onUnauthorized: () => {
      revogada = true;
    },
    fetcher: async () =>
      new Response(JSON.stringify({ message: ['Sessão expirada.'] }), {
        status: 401,
      }),
  });
  await assert.rejects(api.listar(), /Sessão expirada/);
  assert.equal(revogada, true);
});

test('download mantém autorização e retorna PDF binário; logout aceita 204', async () => {
  const api = createApi({
    getToken: () => 'sessao',
    fetcher: async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer sessao');
      return url.endsWith('/logout')
        ? new Response(null, { status: 204 })
        : new Response('%PDF-1.4', {
            headers: { 'Content-Type': 'application/pdf' },
          });
    },
  });
  const pdf = await api.curriculo(1);
  assert.equal(await pdf.text(), '%PDF-1.4');
  assert.equal(await api.logout(), null);
});

test('servidor entrega o painel e impede acesso a configurações e arquivos privados', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const origem = `http://127.0.0.1:${server.address().port}`;
    const home = await fetch(origem);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Administração do Laço/);
    assert.match(
      home.headers.get('Content-Security-Policy'),
      /frame-ancestors 'none'/,
    );
    for (const path of [
      '/.env',
      '/package.json',
      '/scripts/server.mjs',
      '/../api/.env',
      '/assets/../../.env',
    ])
      assert.equal((await fetch(origem + path)).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
