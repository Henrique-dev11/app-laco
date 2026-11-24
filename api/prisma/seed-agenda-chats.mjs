import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
const dias = [
  'DOMINGO',
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
];
const dataLocal = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
});
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});
const dinheiro = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const orientacoes = {
  'Acompanhamento domiciliar':
    'Vamos organizar o ambiente e apoiar a alimentação, a higiene e a mobilidade, respeitando a autonomia.',
  'Rotina diária':
    'Vamos seguir os horários de alimentação, higiene e descanso e anotar como foi a rotina.',
  Companhia:
    'Podemos fazer leitura, conversar, ouvir música e realizar atividades de memória conforme a disposição.',
  'Acompanhamento a exames':
    'Por favor, separe os documentos, o pedido do exame e as orientações da clínica. Vou acompanhar o deslocamento e a espera.',
  'Cuidados noturnos':
    'Vamos combinar a rotina de descanso, manter o caminho livre de obstáculos e registrar as intercorrências do período.',
};

async function buscarHorario(cuidadorId, duracao, deslocamento) {
  const { rows: janelas } = await client.query(
    'SELECT "diaSemana", "horaInicio"::text AS inicio, "horaFim"::text AS fim FROM "Disponibilidade" WHERE "cuidadorId"=$1 AND ativo=true ORDER BY "horaInicio"',
    [cuidadorId],
  );
  for (let dia = 1 + deslocamento; dia <= 35; dia++) {
    const data = new Date(`${dataLocal.format(new Date())}T12:00:00Z`);
    data.setUTCDate(data.getUTCDate() + dia);
    const texto = data.toISOString().slice(0, 10);
    for (const janela of janelas.filter(
      (j) => j.diaSemana === dias[data.getUTCDay()],
    )) {
      const limite = new Date(`${texto}T${janela.fim}-03:00`);
      for (
        let inicio = new Date(`${texto}T${janela.inicio}-03:00`);
        inicio.getTime() + duracao * 60000 <= limite.getTime();
        inicio = new Date(inicio.getTime() + 30 * 60000)
      ) {
        const fim = new Date(inicio.getTime() + duracao * 60000);
        const { rowCount } = await client.query(
          'SELECT id FROM "Agendamento" WHERE "cuidadorId"=$1 AND ativo=true AND inicio<$3 AND fim>$2',
          [cuidadorId, inicio, fim],
        );
        if (!rowCount) return { inicio, fim };
      }
    }
  }
  throw new Error(`Sem horário livre para o cuidador ${cuidadorId}.`);
}

let transacao = false;
try {
  if (process.env.NODE_ENV === 'production')
    throw new Error(
      'Agenda e chats fictícios são permitidos somente fora de produção.',
    );
  if (!process.env.DATABASE_URL)
    throw new Error('Configure DATABASE_URL no api/.env.');
  await client.connect();
  await client.query('BEGIN');
  transacao = true;
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('laco-seed-agenda-chats-v1'))",
  );
  let agendamentosCriados = 0,
    mensagensCriadas = 0;
  for (let i = 0; i < 10; i++) {
    const numero = String(31 + i).padStart(2, '0');
    const observacoes = `[DEMO-AGENDA-${numero}] Atendimento fictício com conversa de demonstração sobre o serviço.`;
    const { rowCount } = await client.query(
      'SELECT id FROM "Contratacao" WHERE observacoes=$1',
      [observacoes],
    );
    if (rowCount) continue;
    const {
      rows: [responsavel],
    } = await client.query(
      `SELECT r.id, ri."idosoId" FROM "Responsavel" r JOIN "Usuario" u ON u.id=r."usuarioId"
       JOIN "ResponsavelIdoso" ri ON ri."responsavelId"=r.id
       WHERE u.email=$1 AND ri."responsavelPrincipal"=true ORDER BY ri.id LIMIT 1`,
      [`responsavel${numero}@exemplo.test`],
    );
    const { rows: ofertas } = await client.query(
      `SELECT cs.id, cs."cuidadorId", cs.preco, cs."duracaoMinutos", s.nome FROM "CuidadorServico" cs
       JOIN "Cuidador" c ON c.id=cs."cuidadorId" JOIN "Usuario" u ON u.id=c."usuarioId"
       JOIN "Servico" s ON s.id=cs."servicoId"
       WHERE u.email=$1 AND u.status='ATIVO' AND c."statusVerificacao"='APROVADO' AND cs.ativo=true AND s.ativo=true ORDER BY cs.id`,
      [`cuidador${numero}@exemplo.test`],
    );
    if (!responsavel || !ofertas.length)
      throw new Error(
        `Faltam cadastros fictícios do par ${numero}. Execute db:seed:usuarios primeiro.`,
      );
    const oferta = ofertas[i % ofertas.length];
    const horario = await buscarHorario(
      oferta.cuidadorId,
      oferta.duracaoMinutos,
      i % 7,
    );
    const criadoEm = new Date(Date.now() - 3600000);
    const {
      rows: [contrato],
    } = await client.query(
      `INSERT INTO "Contratacao" ("responsavelId", "idosoId", "cuidadorServicoId", "nomeServico", "precoReferencia",
       "duracaoMinutos", "valorAcordado", status, observacoes, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$5,'ACEITA',$7,$8,$8) RETURNING id`,
      [
        responsavel.id,
        responsavel.idosoId,
        oferta.id,
        oferta.nome,
        oferta.preco,
        oferta.duracaoMinutos,
        observacoes,
        criadoEm,
      ],
    );
    await client.query(
      'INSERT INTO "Agendamento" ("contratacaoId", "cuidadorId", inicio, fim, ativo, "createdAt") VALUES ($1,$2,$3,$4,true,$5)',
      [contrato.id, oferta.cuidadorId, horario.inicio, horario.fim, criadoEm],
    );
    agendamentosCriados++;
  }

  const { rows: contratos } = await client.query(
    `SELECT DISTINCT ON (r."usuarioId", c."usuarioId") ct.id, ct.status, ct."nomeServico", ct."valorAcordado", ct."createdAt",
     r."usuarioId" AS responsavel, c."usuarioId" AS cuidador, ur.nome AS "nomeResponsavel", uc.nome AS "nomeCuidador",
     i.nome AS "nomeIdoso", a.inicio, a.fim
     FROM "Contratacao" ct JOIN "Responsavel" r ON r.id=ct."responsavelId" JOIN "Usuario" ur ON ur.id=r."usuarioId"
     JOIN "CuidadorServico" cs ON cs.id=ct."cuidadorServicoId" JOIN "Cuidador" c ON c.id=cs."cuidadorId"
     JOIN "Usuario" uc ON uc.id=c."usuarioId" JOIN "Idoso" i ON i.id=ct."idosoId"
     JOIN "Agendamento" a ON a."contratacaoId"=ct.id
     WHERE (ct.observacoes LIKE '[DEMO-CONTRATO-%' OR ct.observacoes LIKE '[DEMO-AGENDA-%')
       AND ct.status IN ('ACEITA','CONCLUIDA')
       AND ur.email LIKE 'responsavel%@exemplo.test' AND uc.email LIKE 'cuidador%@exemplo.test'
     ORDER BY r."usuarioId", c."usuarioId", ct.id DESC`,
  );
  for (const ct of contratos) {
    const concluido = ct.status === 'CONCLUIDA';
    const textos = [
      `Olá, ${ct.nomeCuidador.split(' ')[0]}! Combinei o serviço de ${ct.nomeServico.toLowerCase()} para ${ct.nomeIdoso}. Podemos confirmar o atendimento de ${dataHora.format(ct.inicio)}?`,
      `Olá, ${ct.nomeResponsavel.split(' ')[0]}! Confirmado: ${ct.nomeServico}, em ${dataHora.format(ct.inicio)}, com término às ${dataHora.format(ct.fim).split(' ').at(-1)}. O valor combinado é ${dinheiro.format(Number(ct.valorAcordado))}.`,
      'Perfeito! Gostaria de alinhar os cuidados e saber o que precisamos deixar preparado para esse serviço.',
      orientacoes[ct.nomeServico] ??
        'Vou acompanhar a rotina com atenção, respeitando as preferências e orientações da família.',
      concluido
        ? 'Obrigado pelo atendimento! Como foi a rotina e como ficou a disposição ao final?'
        : 'Combinado! Estarei disponível para receber você e apresentar as preferências da rotina.',
      concluido
        ? `O serviço de ${ct.nomeServico.toLowerCase()} foi concluído no horário combinado. A rotina transcorreu bem e deixei as observações com a família. Obrigado pela confiança!`
        : `Tudo certo para o serviço de ${ct.nomeServico.toLowerCase()}. Avisarei pelo chat quando estiver a caminho. Até lá!`,
    ];
    const base = concluido
      ? ct.inicio.getTime() - 3600000
      : ct.createdAt.getTime() + 300000;
    for (const [j, conteudo] of textos.entries()) {
      if (conteudo.length > 1000)
        throw new Error('Mensagem de demonstração excede o limite.');
      const remetente = j % 2 === 0 ? ct.responsavel : ct.cuidador;
      const destinatario = j % 2 === 0 ? ct.cuidador : ct.responsavel;
      const quando = new Date(
        concluido && j >= 4
          ? ct.fim.getTime() + (j - 3) * 600000
          : base + j * 300000,
      );
      const lidaEm =
        j === 5 && !concluido ? null : new Date(quando.getTime() + 60000);
      const { rowCount } = await client.query(
        `INSERT INTO "Mensagem" ("remetenteId", "destinatarioId", conteudo, "lidaEm", "createdAt")
         SELECT $1::integer,$2::integer,$3::varchar(1000),$4::timestamp,$5::timestamp WHERE NOT EXISTS
         (SELECT 1 FROM "Mensagem" WHERE "remetenteId"=$1 AND "destinatarioId"=$2 AND conteudo=$3)`,
        [remetente, destinatario, conteudo, lidaEm, quando],
      );
      mensagensCriadas += rowCount;
    }
  }
  await client.query('COMMIT');
  transacao = false;
  console.log(
    `${agendamentosCriados} novos agendamentos; ${mensagensCriadas} novas mensagens em ${contratos.length} conversas entre responsáveis e cuidadores.`,
  );
  console.log(
    'Agendamentos futuros, horários sem sobreposição e conversas baseadas no serviço. Registros existentes preservados.',
  );
} catch (error) {
  if (transacao) await client.query('ROLLBACK');
  console.error(
    error instanceof Error
      ? error.message
      : 'Falha ao preparar agenda e chats.',
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
