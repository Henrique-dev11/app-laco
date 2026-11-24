import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
// O acesso próprio usa FotoPerfil; os demais idosos usam FotoIdoso.
const alvosSql = `SELECT i.id, i.sexo,
  (SELECT r."usuarioId" FROM "ResponsavelIdoso" ri
   JOIN "Responsavel" r ON r.id = ri."responsavelId"
   WHERE ri."idosoId" = i.id AND ri.parentesco = 'PROPRIO'
   ORDER BY ri.id LIMIT 1) AS "usuarioId"
  FROM "Idoso" i`;
let transacao = false;
try {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Fotos fictícias são permitidas somente fora de produção.');
  if (!process.env.DATABASE_URL)
    throw new Error('Configure DATABASE_URL no api/.env.');
  const fotos = await Promise.all(
    Array.from({ length: 50 }, async (_, i) => {
      const arquivo = `idoso${String(i + 1).padStart(2, '0')}.jpg`;
      const foto = await readFile(
        new URL(`./seed/fotos/${arquivo}`, import.meta.url),
      );
      if (foto[0] !== 0xff || foto[1] !== 0xd8 || foto.length > 3 * 1024 * 1024)
        throw new Error(`Foto JPEG inválida: ${arquivo}`);
      return foto;
    }),
  );
  await client.connect();
  await client.query('BEGIN');
  transacao = true;
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('laco-seed-fotos-idosos-v1'))",
  );
  const { rows: idosos } = await client.query(`${alvosSql} ORDER BY i.id`);
  let adicionadas = 0;
  const contadores = [0, 0];
  for (const [i, idoso] of idosos.entries()) {
    const sexo = idoso.sexo?.trim().toLowerCase();
    const grupo = sexo === 'feminino' ? 0 : sexo === 'masculino' ? 1 : i % 2;
    const foto = fotos[(contadores[grupo]++ % 25) * 2 + grupo];
    const { rowCount } = idoso.usuarioId
      ? await client.query(
          `INSERT INTO "FotoPerfil" ("usuarioId", mime, conteudo, "updatedAt")
           VALUES ($1, 'image/jpeg', $2, NOW()) ON CONFLICT ("usuarioId") DO NOTHING`,
          [idoso.usuarioId, foto],
        )
      : await client.query(
          `INSERT INTO "FotoIdoso" ("idosoId", mime, conteudo, "updatedAt")
           VALUES ($1, 'image/jpeg', $2, NOW()) ON CONFLICT ("idosoId") DO NOTHING`,
          [idoso.id, foto],
        );
    adicionadas += rowCount;
  }
  const {
    rows: [resumo],
  } = await client.query(
    `SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE CASE WHEN i."usuarioId" IS NULL
        THEN fi."idosoId" IS NOT NULL ELSE fp."usuarioId" IS NOT NULL END)::int AS "comFoto"
     FROM (${alvosSql}) i
     LEFT JOIN "FotoIdoso" fi ON fi."idosoId" = i.id
     LEFT JOIN "FotoPerfil" fp ON fp."usuarioId" = i."usuarioId"`,
  );
  if (resumo.total !== resumo.comFoto)
    throw new Error(
      'Ainda existem idosos sem foto. Nenhuma alteração foi salva.',
    );
  await client.query('COMMIT');
  transacao = false;
  console.log(
    `${adicionadas} fotos adicionadas. ${resumo.comFoto} de ${resumo.total} idosos com foto. Fotos existentes preservadas.`,
  );
} catch (error) {
  if (transacao) await client.query('ROLLBACK');
  console.error(
    error instanceof Error
      ? error.message
      : 'Falha ao preparar fotos dos idosos.',
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
