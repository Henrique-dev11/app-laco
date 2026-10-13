import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

if (process.env.NODE_ENV === 'production')
  throw new Error(
    'Este comando prepara apenas administradores de desenvolvimento.',
  );
if (!process.stdin.isTTY)
  throw new Error('Execute npm run admin:criar em um terminal interativo.');
let ocultar = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!ocultar) process.stdout.write(chunk, encoding);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  const nome = (await rl.question('Nome do administrador: ')).trim();
  const email = (await rl.question('E-mail do administrador: '))
    .trim()
    .toLowerCase();
  process.stdout.write('Senha (12 a 72 bytes, entrada oculta): ');
  ocultar = true;
  const senha = await rl.question('');
  process.stdout.write('\nConfirme a senha: ');
  const confirmacao = await rl.question('');
  ocultar = false;
  process.stdout.write('\n');
  if (
    !nome ||
    nome.length > 150 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 255
  )
    throw new Error('Informe nome e e-mail válidos.');
  if (
    senha !== confirmacao ||
    Buffer.byteLength(senha) < 12 ||
    Buffer.byteLength(senha) > 72
  )
    throw new Error('As senhas devem coincidir e ter de 12 a 72 bytes.');
  await client.connect();
  const result = await client.query(
    'INSERT INTO "Usuario" (nome, email, "senhaHash", "tipoUsuario", "updatedAt") VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (email) DO NOTHING RETURNING id',
    [nome, email, await bcrypt.hash(senha, 12), 'ADMIN'],
  );
  if (!result.rowCount)
    throw new Error(
      'Este e-mail já está cadastrado. Nenhuma conta ou senha existente foi alterada.',
    );
  console.log(
    'Administrador criado. Use o e-mail e a senha informados no painel web.',
  );
} catch (error) {
  ocultar = false;
  console.error(
    error instanceof Error
      ? error.message
      : 'Não foi possível criar o administrador.',
  );
  process.exitCode = 1;
} finally {
  rl.close();
  await client.end();
}
