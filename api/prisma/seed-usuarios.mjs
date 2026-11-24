import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { prepararCatalogo } from './seed/catalogo.mjs';
import {
  QUANTIDADE_POR_PERFIL,
  SENHA_DEMONSTRACAO,
  DIAS_UTEIS,
  dadosUsuario,
  criarCurriculo,
} from './seed/dados-usuarios.mjs';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});

async function criarEndereco(endereco) {
  const {
    rows: [criado],
  } = await client.query(
    `INSERT INTO "Endereco" (rua, numero, complemento, bairro, cidade, estado, cep, "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
    [
      endereco.rua,
      endereco.numero,
      endereco.complemento,
      endereco.bairro,
      endereco.cidade,
      endereco.estado,
      endereco.cep,
    ],
  );
  return criado.id;
}

async function criarUsuario(dados, foto, senha, servicos) {
  const {
    rows: [existente],
  } = await client.query(
    'SELECT "tipoUsuario" FROM "Usuario" WHERE email = $1',
    [dados.email],
  );
  if (existente) {
    if (existente.tipoUsuario !== dados.tipoUsuario)
      throw new Error(
        `E-mail de demonstração já usado por outro perfil: ${dados.email}`,
      );
    return false;
  }
  const senhaHash = await bcrypt.hash(senha, 12);
  const {
    rows: [usuario],
  } = await client.query(
    `INSERT INTO "Usuario" (nome, "nomeSocial", email, "senhaHash", "tipoUsuario", "telefone2", "termosAceitosEm", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [
      dados.nome,
      dados.nomeSocial,
      dados.email,
      senhaHash,
      dados.tipoUsuario,
      dados.telefone2,
    ],
  );
  if (!usuario) {
    const {
      rows: [existente],
    } = await client.query(
      'SELECT "tipoUsuario" FROM "Usuario" WHERE email = $1',
      [dados.email],
    );
    if (existente?.tipoUsuario !== dados.tipoUsuario)
      throw new Error(
        `E-mail de demonstração já usado por outro perfil: ${dados.email}`,
      );
    return false;
  }
  await client.query(
    'INSERT INTO "FotoPerfil" ("usuarioId", mime, conteudo, "updatedAt") VALUES ($1, $2, $3, NOW())',
    [usuario.id, 'image/jpeg', foto],
  );
  const enderecoId = await criarEndereco(dados.endereco);
  const preferencias = dados.ofertas.map((oferta) => servicos.get(oferta.nome));
  for (const servicoId of preferencias) {
    await client.query(
      'INSERT INTO "PreferenciaServico" ("usuarioId", "servicoId") VALUES ($1, $2)',
      [usuario.id, servicoId],
    );
  }
  if (dados.perfil === 'cuidador') {
    const {
      rows: [cuidador],
    } = await client.query(
      `INSERT INTO "Cuidador" ("usuarioId", "enderecoId", telefone, cpf, "dataNascimento",
       biografia, "experienciaProfissional", "registroProfissional", "statusVerificacao", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'APROVADO', NOW()) RETURNING id`,
      [
        usuario.id,
        enderecoId,
        dados.telefone,
        dados.cpf,
        dados.dataNascimento,
        dados.biografia,
        dados.experienciaProfissional,
        dados.registroProfissional,
      ],
    );
    await client.query(
      'INSERT INTO "Curriculo" ("cuidadorId", nome, conteudo) VALUES ($1, $2, $3)',
      [
        cuidador.id,
        `curriculo-cuidador${dados.numero}.pdf`,
        criarCurriculo(dados),
      ],
    );
    for (const oferta of dados.ofertas) {
      await client.query(
        `INSERT INTO "CuidadorServico" ("cuidadorId", "servicoId", preco, "duracaoMinutos", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          cuidador.id,
          servicos.get(oferta.nome),
          oferta.preco,
          oferta.duracaoMinutos,
        ],
      );
    }
    for (const dia of DIAS_UTEIS) {
      await client.query(
        `INSERT INTO "Disponibilidade" ("cuidadorId", "diaSemana", "horaInicio", "horaFim", "updatedAt")
         VALUES ($1, $2, $3::time, $4::time, NOW())`,
        [cuidador.id, dia, ...dados.horarios],
      );
    }
  } else {
    const {
      rows: [responsavel],
    } = await client.query(
      `INSERT INTO "Responsavel" ("usuarioId", "enderecoId", telefone, cpf, "dataNascimento", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
      [usuario.id, enderecoId, dados.telefone, dados.cpf, dados.dataNascimento],
    );
    const idoso = dados.idoso;
    const {
      rows: [criado],
    } = await client.query(
      `INSERT INTO "Idoso" ("enderecoId", nome, "dataNascimento", sexo, telefone, cpf, observacoes, "necessidadesEspeciais", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
      [
        enderecoId,
        idoso.nome,
        idoso.dataNascimento,
        idoso.sexo,
        idoso.telefone,
        idoso.cpf,
        idoso.observacoes,
        idoso.necessidadesEspeciais,
      ],
    );
    await client.query(
      `INSERT INTO "ResponsavelIdoso" ("responsavelId", "idosoId", parentesco, "responsavelPrincipal", "updatedAt")
       VALUES ($1, $2, $3, true, NOW())`,
      [responsavel.id, criado.id, idoso.parentesco],
    );
  }
  return true;
}

let transacaoAberta = false;
try {
  if (process.env.NODE_ENV === 'production')
    throw new Error(
      'Usuários fictícios são permitidos somente fora de produção.',
    );
  if (!process.env.DATABASE_URL)
    throw new Error('Configure DATABASE_URL no api/.env.');
  const senha = process.env.SEED_DEMO_PASSWORD ?? SENHA_DEMONSTRACAO;
  if (senha.length < 8 || Buffer.byteLength(senha) > 72)
    throw new Error('SEED_DEMO_PASSWORD deve ter de 8 caracteres no mínimo e 72 bytes no máximo.');
  const usuarios = [];
  for (const perfil of ['cuidador', 'responsavel']) {
    for (let i = 0; i < QUANTIDADE_POR_PERFIL; i++) {
      const dados = dadosUsuario(perfil, i);
      const foto = await readFile(
        new URL(`./seed/fotos/${dados.fotoArquivo}`, import.meta.url),
      );
      if (foto[0] !== 0xff || foto[1] !== 0xd8 || foto.length > 3 * 1024 * 1024)
        throw new Error(`Foto JPEG inválida: ${dados.fotoArquivo}`);
      usuarios.push({ dados, foto });
    }
  }
  await client.connect();
  await client.query('BEGIN');
  transacaoAberta = true;
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('laco-seed-usuarios-v1'))",
  );
  await prepararCatalogo(client);
  const { rows: catalogo } = await client.query(
    'SELECT id, nome FROM "Servico" WHERE catalogo = true AND ativo = true',
  );
  const servicos = new Map(catalogo.map(({ nome, id }) => [nome, id]));
  for (const { dados } of usuarios)
    for (const oferta of dados.ofertas)
      if (!servicos.has(oferta.nome))
        throw new Error(`Serviço do catálogo indisponível: ${oferta.nome}`);
  const criados = { cuidador: 0, responsavel: 0 };
  for (const { dados, foto } of usuarios) {
    // Salt individual por conta, inclusive usando a mesma senha de demonstração.
    if (await criarUsuario(dados, foto, senha, servicos))
      criados[dados.perfil]++;
  }
  const { rows: resumo } = await client.query(
    `SELECT u."tipoUsuario", COUNT(*)::int AS usuarios,
      COUNT(f."usuarioId")::int AS fotos,
      COUNT(cv.id)::int AS curriculos,
      COUNT(r.id)::int AS responsaveis,
      COUNT(c.id)::int AS cuidadores
     FROM "Usuario" u
     LEFT JOIN "FotoPerfil" f ON f."usuarioId" = u.id
     LEFT JOIN "Cuidador" c ON c."usuarioId" = u.id
     LEFT JOIN "Responsavel" r ON r."usuarioId" = u.id
     LEFT JOIN "Curriculo" cv ON cv."cuidadorId" = c.id
     WHERE u.email = ANY($1::text[])
     GROUP BY u."tipoUsuario" ORDER BY u."tipoUsuario"`,
    [usuarios.map(({ dados }) => dados.email)],
  );
  if (
    resumo.length !== 2 ||
    resumo.some(
      (r) =>
        r.usuarios !== QUANTIDADE_POR_PERFIL ||
        r.fotos !== QUANTIDADE_POR_PERFIL ||
        (r.tipoUsuario === 'CUIDADOR'
          ? r.curriculos !== QUANTIDADE_POR_PERFIL ||
            r.cuidadores !== QUANTIDADE_POR_PERFIL
          : r.responsaveis !== QUANTIDADE_POR_PERFIL),
    )
  )
    throw new Error(
      'Os cadastros de demonstração estão incompletos. Nenhuma alteração foi salva.',
    );
  await client.query('COMMIT');
  transacaoAberta = false;
  console.table(resumo);
  console.log(
    `Novos cadastros: ${criados.cuidador} cuidadores e ${criados.responsavel} responsáveis. Contas existentes preservadas.`,
  );
  console.log(
    'E-mails: cuidador01@exemplo.test a cuidador50@exemplo.test; responsavel01@exemplo.test a responsavel50@exemplo.test.',
  );
  console.log(
    process.env.SEED_DEMO_PASSWORD
      ? 'Senha dos novos usuários: o valor definido em SEED_DEMO_PASSWORD.'
      : `Senha dos novos usuários fictícios: ${SENHA_DEMONSTRACAO}`,
  );
} catch (error) {
  if (transacaoAberta) await client.query('ROLLBACK');
  console.error(
    error instanceof Error
      ? error.message
      : 'Não foi possível preparar os usuários fictícios.',
  );
  process.exitCode = 1;
} finally {
  await client.end();
}
