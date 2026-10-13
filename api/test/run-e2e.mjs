import 'dotenv/config';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Nunca migra ou apaga o banco de desenvolvimento. Cria um banco exclusivo por execução.
const origem = new URL(
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL,
);
const nome = `laco_test_${randomUUID().replaceAll('-', '')}`;
const manutencao = new URL(origem);
manutencao.pathname = '/postgres';
const teste = new URL(origem);
teste.pathname = `/${nome}`;
const client = new pg.Client({
  connectionString: manutencao.toString(),
  connectionTimeoutMillis: 5000,
});
let criado = false;
try {
  await client.connect();
  await client.query(`CREATE DATABASE "${nome}"`);
  criado = true;
  const env = {
    ...process.env,
    DATABASE_URL: teste.toString(),
    NODE_ENV: 'test',
  };
  for (const args of [
    [
      'node_modules/prisma/build/index.js',
      'migrate',
      'deploy',
      '--config',
      'prisma7.config.ts',
    ],
    [
      'node_modules/vitest/vitest.mjs',
      'run',
      '--config',
      'vitest.config.e2e.ts',
    ],
  ]) {
    const resultado = spawnSync(process.execPath, args, {
      env,
      stdio: 'inherit',
    });
    if (resultado.status !== 0) {
      process.exitCode = resultado.status ?? 1;
      break;
    }
  }
} finally {
  if (criado) await client.query(`DROP DATABASE "${nome}" WITH (FORCE)`);
  await client.end();
}
