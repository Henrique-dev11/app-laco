import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
const situacoes = [
  ...Array(10).fill('CONCLUIDA'),
  ...Array(8).fill('ACEITA'),
  ...Array(6).fill('SOLICITADA'),
  ...Array(3).fill('RECUSADA'),
  ...Array(3).fill('CANCELADA'),
];
const hoje = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
}).format(new Date());
function deslocar(data, dias) {
  const resultado = new Date(`${data}T12:00:00Z`);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado.toISOString().slice(0, 10);
}
function diaUtil(data, direcao) {
  while ([0, 6].includes(new Date(`${data}T12:00Z`).getUTCDay()))
    data = deslocar(data, direcao);
  return data;
}
let transacao = false;
try {
  if (process.env.NODE_ENV === 'production')
    throw new Error(
      'Contratos fictícios são permitidos somente fora de produção.',
    );
  if (!process.env.DATABASE_URL)
    throw new Error('Configure DATABASE_URL no api/.env.');
  await client.connect();
  await client.query('BEGIN');
  transacao = true;
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('laco-seed-contratos-v1'))",
  );
  let criados = 0;
  const marcadores = [];
  for (const [i, status] of situacoes.entries()) {
    const numero = String(i + 1).padStart(2, '0');
    const observacoes = `[DEMO-CONTRATO-${numero}] Atendimento inteiramente fictício para demonstração da dashboard administrativa.`;
    marcadores.push(observacoes);
    const { rowCount } = await client.query(
      'SELECT id FROM "Contratacao" WHERE observacoes = $1',
      [observacoes],
    );
    if (rowCount) continue;
    const {
      rows: [responsavel],
    } = await client.query(
      `SELECT r.id, ri."idosoId" FROM "Responsavel" r
       JOIN "Usuario" u ON u.id = r."usuarioId"
       JOIN "ResponsavelIdoso" ri ON ri."responsavelId" = r.id
       WHERE u.email = $1 AND ri."responsavelPrincipal" = true ORDER BY ri.id LIMIT 1`,
      [`responsavel${numero}@exemplo.test`],
    );
    const { rows: ofertas } = await client.query(
      `SELECT cs.id, cs."cuidadorId", cs.preco, cs."duracaoMinutos", s.nome,
        d."horaInicio"::text AS hora
       FROM "CuidadorServico" cs
       JOIN "Cuidador" c ON c.id = cs."cuidadorId"
       JOIN "Usuario" u ON u.id = c."usuarioId"
       JOIN "Servico" s ON s.id = cs."servicoId"
       JOIN "Disponibilidade" d ON d."cuidadorId" = c.id AND d."diaSemana" = 'SEGUNDA' AND d.ativo = true
       WHERE u.email = $1 AND cs.ativo = true ORDER BY cs.id`,
      [`cuidador${numero}@exemplo.test`],
    );
    if (!responsavel || !ofertas.length)
      throw new Error(
        `Faltam usuários, ofertas ou horários fictícios do par ${numero}. Execute db:seed:usuarios primeiro.`,
      );
    const oferta = ofertas[i % ofertas.length];
    const concluida = status === 'CONCLUIDA';
    const dataAtendimento = concluida
      ? diaUtil(deslocar(hoje, -(i + 2)), -1)
      : diaUtil(deslocar(hoje, 1 + (i % 7)), 1);
    const criadoEm = concluida
      ? `${deslocar(dataAtendimento, -1)}T12:00:00-03:00`
      : `${deslocar(hoje, -(i % 28))}T09:00:00-03:00`;
    const valor = (Number(oferta.preco) * (0.9 + (i % 3) * 0.05)).toFixed(2);
    const {
      rows: [contrato],
    } = await client.query(
      `INSERT INTO "Contratacao" ("responsavelId", "idosoId", "cuidadorServicoId",
        "nomeServico", "precoReferencia", "duracaoMinutos", "valorAcordado", status,
        observacoes, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id`,
      [
        responsavel.id,
        responsavel.idosoId,
        oferta.id,
        oferta.nome,
        oferta.preco,
        oferta.duracaoMinutos,
        valor,
        status,
        observacoes,
        criadoEm,
      ],
    );
    if (['ACEITA', 'CONCLUIDA', 'CANCELADA'].includes(status)) {
      const inicio = new Date(`${dataAtendimento}T${oferta.hora}-03:00`);
      const fim = new Date(inicio.getTime() + oferta.duracaoMinutos * 60000);
      await client.query(
        `INSERT INTO "Agendamento" ("contratacaoId", "cuidadorId", inicio, fim, ativo, "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          contrato.id,
          oferta.cuidadorId,
          inicio,
          fim,
          status === 'ACEITA',
          criadoEm,
        ],
      );
    }
    criados++;
  }
  const { rows: resumo } = await client.query(
    `SELECT status, COUNT(*)::int AS quantidade, SUM("valorAcordado")::text AS valor
     FROM "Contratacao" WHERE observacoes = ANY($1::text[]) GROUP BY status ORDER BY status`,
    [marcadores],
  );
  if (
    resumo.reduce((total, linha) => total + linha.quantidade, 0) !==
    situacoes.length
  )
    throw new Error(
      'Quantidade inesperada de contratos fictícios. Nenhuma alteração foi salva.',
    );
  await client.query('COMMIT');
  transacao = false;
  console.table(resumo);
  console.log(
    `${criados} contratos fictícios criados; contratos existentes preservados.`,
  );
} catch (error) {
  if (transacao) await client.query('ROLLBACK');
  console.error(
    error instanceof Error ? error.message : 'Falha ao preparar contratos.',
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
