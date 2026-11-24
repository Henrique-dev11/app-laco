import 'dotenv/config';
import pg from 'pg';

if (
  process.env.NODE_ENV === 'production' ||
  process.env.FINANCEIRO_SIMULADO !== '1'
)
  throw new Error(
    'Os cenários só podem ser cadastrados com a simulação ativa fora de produção.',
  );
if (!process.env.DATABASE_URL)
  throw new Error('Configure DATABASE_URL em api/.env.');
const destino = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname))
  throw new Error('Use um banco local para os cenários de TCC.');

const client = new pg.Client({
  connectionString: destino.toString(),
  connectionTimeoutMillis: 5000,
});
const cenarios = [
  ['41', 'ACEITA', null],
  ['42', 'CANCELADA', 'REEMBOLSADO'],
  ['43', 'ACEITA', 'EM_CONTESTACAO'],
];
const linhas = [];
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('laco-financeiro-demo-v1'))",
  );
  for (const [numero, estado, pagamento] of cenarios) {
    const etiqueta = `[DEMO-FINANCEIRO-${numero}] Acompanhamento de seis horas para demonstração acadêmica.`;
    const {
      rows: [anterior],
    } = await client.query(
      'SELECT id FROM "Contratacao" WHERE observacoes=$1',
      [etiqueta],
    );
    if (anterior) {
      linhas.push({
        numero,
        visita: anterior.id,
        cenario: pagamento ?? 'Fluxo completo',
      });
      continue;
    }
    const {
      rows: [participantes],
    } = await client.query(
      `SELECT r.id AS responsavel, ri."idosoId" AS idoso, c.id AS cuidador, ur.id AS "usuarioResponsavel"
       FROM "Responsavel" r JOIN "Usuario" ur ON ur.id=r."usuarioId"
       JOIN "ResponsavelIdoso" ri ON ri."responsavelId"=r.id AND ri."responsavelPrincipal"
       CROSS JOIN "Cuidador" c JOIN "Usuario" uc ON uc.id=c."usuarioId"
       WHERE ur.email=$1 AND uc.email=$2 ORDER BY ri.id LIMIT 1`,
      [`responsavel${numero}@exemplo.test`, `cuidador${numero}@exemplo.test`],
    );
    if (!participantes)
      throw new Error(
        'Execute db:seed:usuarios antes de preparar o financeiro.',
      );
    const nome = 'Acompanhamento domiciliar de seis horas (TCC)';
    const {
      rows: [servico],
    } = await client.query(
      'INSERT INTO "Servico" (nome,catalogo,"updatedAt") VALUES ($1,false,NOW()) RETURNING id',
      [nome],
    );
    const {
      rows: [oferta],
    } = await client.query(
      `INSERT INTO "CuidadorServico" ("cuidadorId","servicoId",preco,"duracaoMinutos","updatedAt")
       VALUES ($1,$2,150,360,NOW()) RETURNING id`,
      [participantes.cuidador, servico.id],
    );
    const {
      rows: [contrato],
    } = await client.query(
      `INSERT INTO "Contratacao" ("responsavelId","idosoId","cuidadorServicoId","nomeServico",
       "precoReferencia","valorAcordado","duracaoMinutos","financeiroSimulado",status,observacoes,"updatedAt")
       VALUES ($1,$2,$3,$4,150,150,360,true,$5,$6,NOW()) RETURNING id`,
      [
        participantes.responsavel,
        participantes.idoso,
        oferta.id,
        nome,
        estado,
        etiqueta,
      ],
    );
    if (pagamento) {
      const {
        rows: [p],
      } = await client.query(
        `INSERT INTO "PagamentoSimulado" ("contratacaoId","cuidadorId",status,bruto,comissao,liquido,
        "motivoContestacao","contestadoPorId","updatedAt") VALUES ($1,$2,$3,150,15,135,$4,$5,NOW()) RETURNING id`,
        [
          contrato.id,
          participantes.cuidador,
          pagamento,
          pagamento === 'EM_CONTESTACAO'
            ? 'Demonstração de atendimento com divergência entre as partes.'
            : null,
          pagamento === 'EM_CONTESTACAO'
            ? participantes.usuarioResponsavel
            : null,
        ],
      );
      for (const tipo of pagamento === 'REEMBOLSADO'
        ? ['RETENCAO', 'REEMBOLSO']
        : ['RETENCAO'])
        await client.query(
          `INSERT INTO "MovimentoSimulado" ("cuidadorId","pagamentoId",chave,tipo,valor,descricao)
           VALUES ($1,$2,$3,$4,150,$5)`,
          [
            participantes.cuidador,
            p.id,
            `${p.id}:${tipo}`,
            tipo,
            tipo === 'RETENCAO'
              ? 'Reserva de demonstração'
              : 'Reembolso fictício por cancelamento',
          ],
        );
    }
    linhas.push({
      numero,
      visita: contrato.id,
      cenario: pagamento ?? 'Fluxo completo',
    });
  }
  await client.query('COMMIT');
  console.table(linhas);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
