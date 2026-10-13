import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcrypt';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  for (const [nome, descricao] of [
    ['Rotina diária', 'Auxílio nas atividades diárias.'],
    ['Companhia', 'Companhia e acompanhamento do idoso.'],
    ['Acompanhamento a exames', 'Acompanhamento em consultas e exames.'],
    ['Cuidados noturnos', 'Acompanhamento durante o período noturno.'],
  ]) {
    await client.query(
      'INSERT INTO "Servico" (nome, descricao, "updatedAt") VALUES ($1, $2, NOW()) ON CONFLICT (nome) DO NOTHING',
      [nome, descricao],
    );
  }
  if (process.env.SEED_ADMIN_EMAIL || process.env.SEED_ADMIN_PASSWORD) {
    if (
      process.env.NODE_ENV === 'production' ||
      !process.env.SEED_ADMIN_EMAIL ||
      !process.env.SEED_ADMIN_PASSWORD ||
      Buffer.byteLength(process.env.SEED_ADMIN_PASSWORD) < 12 ||
      Buffer.byteLength(process.env.SEED_ADMIN_PASSWORD) > 72
    )
      throw new Error(
        'Admin de desenvolvimento exige e-mail e senha de 12 a 72 bytes, fora de produção.',
      );
    await client.query(
      'INSERT INTO "Usuario" (nome, email, "senhaHash", "tipoUsuario", "updatedAt") VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (email) DO NOTHING',
      [
        'Administrador de desenvolvimento',
        process.env.SEED_ADMIN_EMAIL.trim().toLowerCase(),
        await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12),
        'ADMIN',
      ],
    );
    console.log(
      'Administrador de desenvolvimento preparado; contas existentes não foram alteradas.',
    );
  }
  console.log('Catálogo preparado sem duplicar serviços.');
} finally {
  await client.end();
}
