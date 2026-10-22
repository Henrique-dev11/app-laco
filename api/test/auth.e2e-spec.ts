import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashToken } from '../src/auth/auth.service.js';

function cpf(base: string) {
  let value = base;
  for (let size = 9; size <= 10; size++) {
    const sum = [...value].reduce(
      (total, digit, i) => total + Number(digit) * (size + 1 - i),
      0,
    );
    const digit = (sum * 10) % 11;
    value += String(digit === 10 ? 0 : digit);
  }
  return value;
}
const endereco = {
  rua: 'Rua Teste',
  numero: '10',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01001000',
};
const senha = 'TesteSeguro123!';

describe('Cadastro, sessão e isolamento de dados', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let servicoId: number;
  let token: string;
  let usuarioId: number;
  let responsavelId: number;
  let idosoId: number;
  let cuidadorId: number;
  let ofertaId: number;
  let cuidadorToken: string;
  let adminToken: string;
  let contratacaoId: number;

  const payload = (
    numero: number,
    perfil: 'responsavel' | 'idoso' | 'cuidador' = 'responsavel',
  ) => ({
    perfil,
    nome: 'Pessoa Teste',
    nomeSocial: 'Nome Social',
    email: `pessoa${numero}@teste.local`,
    senha,
    telefone: '11988887777',
    telefone2: '11988886666',
    cpf: cpf(String(100000000 + numero)),
    dataNascimento: '1980-05-20',
    endereco,
    aceitoTermos: true,
    servicoIds: [servicoId],
    ...(perfil === 'responsavel'
      ? {
          idoso: {
            nome: 'Idoso Teste',
            nomeSocial: 'Nome social do idoso',
            cpf: cpf(String(200000000 + numero)),
            dataNascimento: '1945-08-10',
            parentesco: 'FILHA',
            endereco,
          },
        }
      : {}),
    ...(perfil === 'cuidador'
      ? { ofertas: [{ servicoId, preco: 35, duracaoMinutos: 60 }] }
      : {}),
  });

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/laco_test_'))
      throw new Error('Use npm run test:e2e com banco exclusivo.');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    servicoId = (
      await prisma.servico.create({ data: { nome: 'Companhia Teste' } })
    ).id;
    await prisma.usuario.create({
      data: {
        nome: 'Admin Teste',
        email: 'admin@teste.local',
        senhaHash: await bcrypt.hash(senha, 12),
        tipoUsuario: 'ADMIN',
      },
    });
    adminToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@teste.local', senha })
        .expect(200)
    ).body.token;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('salva cadastro completo e não devolve senha ou hash', async () => {
    const result = await request(app.getHttpServer())
      .post('/auth/cadastro')
      .send(payload(1))
      .expect(201);
    usuarioId = result.body.usuario.id;
    expect(result.body.usuario).not.toHaveProperty('senhaHash');
    expect(result.body.usuario).not.toHaveProperty('senha');
    const user = await prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      include: {
        responsavel: { include: { responsavelIdosos: true } },
        preferencias: true,
      },
    });
    expect(await bcrypt.compare(senha, user.senhaHash)).toBe(true);
    expect(user.termosAceitosEm).not.toBeNull();
    expect(user.telefone2).toBe('11988886666');
    expect(user.preferencias[0].servicoId).toBe(servicoId);
    responsavelId = user.responsavel!.id;
    idosoId = user.responsavel!.responsavelIdosos[0].idosoId;
  });

  it('normaliza e-mail, inicia sessão e recupera o perfil salvo', async () => {
    const result = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ' PESSOA1@TESTE.LOCAL ', senha })
      .expect(200);
    token = result.body.token;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(me.body.responsavel.responsavelIdosos[0].idoso.id).toBe(idosoId);
    expect(
      (
        await request(app.getHttpServer())
          .get(`/idosos/${idosoId}`)
          .auth(token, { type: 'bearer' })
          .expect(200)
      ).body.nomeSocial,
    ).toBe('Nome social do idoso');
    expect(JSON.stringify(me.body)).not.toContain('senhaHash');
    const session = await prisma.sessao.findFirstOrThrow({
      where: { usuarioId },
    });
    expect(session.tokenHash).not.toBe(token);
  });

  it('rejeita credenciais inválidas e dados privados sem sessão', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'pessoa1@teste.local', senha: 'SenhaIncorreta' })
      .expect(401);
    await request(app.getHttpServer()).get('/usuarios').expect(401);
    await request(app.getHttpServer()).get('/idosos').expect(401);
    await request(app.getHttpServer())
      .post('/servicos')
      .auth(token, { type: 'bearer' })
      .send({ nome: 'Sem permissão' })
      .expect(403);
  });

  it('rejeita CPF, data, termos, endereço incompleto e campos inesperados', async () => {
    for (const change of [
      { cpf: '11111111111' },
      { dataNascimento: '2099-01-01' },
      { aceitoTermos: false },
      { endereco: { cep: '01001000' } },
      { tipoUsuario: 'ADMIN' },
    ]) {
      await request(app.getHttpServer())
        .post('/auth/cadastro')
        .send({ ...payload(2), ...change })
        .expect(400);
    }
    expect(
      await prisma.usuario.count({ where: { email: 'pessoa2@teste.local' } }),
    ).toBe(0);
  });

  it('desfaz a transação se o CPF do idoso já existir', async () => {
    await request(app.getHttpServer())
      .post('/auth/cadastro')
      .send({ ...payload(3), idoso: payload(1).idoso })
      .expect(409);
    expect(
      await prisma.usuario.count({ where: { email: 'pessoa3@teste.local' } }),
    ).toBe(0);
    expect(
      await prisma.responsavel.count({ where: { cpf: payload(3).cpf } }),
    ).toBe(0);
  });

  it('trata dois cadastros simultâneos sem duplicar usuário', async () => {
    const results = await Promise.all([
      request(app.getHttpServer()).post('/auth/cadastro').send(payload(4)),
      request(app.getHttpServer()).post('/auth/cadastro').send(payload(4)),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.usuario.count({ where: { email: 'pessoa4@teste.local' } }),
    ).toBe(1);
  });

  it('impede acesso de outro usuário a perfil, idoso e vínculos', async () => {
    const other = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'pessoa4@teste.local', senha })
        .expect(200)
    ).body.token;
    for (const path of [
      `/usuarios/${usuarioId}`,
      `/responsaveis/${responsavelId}`,
      `/idosos/${idosoId}`,
      `/responsaveis/${responsavelId}/idosos`,
    ])
      await request(app.getHttpServer())
        .get(path)
        .auth(other, { type: 'bearer' })
        .expect(403);
  });

  it('cria acesso do idoso com vínculo PROPRIO', async () => {
    const result = await request(app.getHttpServer())
      .post('/auth/cadastro')
      .send(payload(5, 'idoso'))
      .expect(201);
    const owner = await prisma.responsavel.findUniqueOrThrow({
      where: { usuarioId: result.body.usuario.id },
      include: { responsavelIdosos: true },
    });
    expect(owner.responsavelIdosos[0].parentesco).toBe('PROPRIO');
  });

  it('salva cuidador, oferta e PDF na mesma transação e mantém pendente', async () => {
    const result = await request(app.getHttpServer())
      .post('/auth/cadastro')
      .field('dados', JSON.stringify(payload(6, 'cuidador')))
      .attach('curriculo', Buffer.from('%PDF-1.4\n%%EOF'), 'curriculo.pdf')
      .expect(201);
    const caregiver = await prisma.cuidador.findUniqueOrThrow({
      where: { usuarioId: result.body.usuario.id },
      include: { curriculo: true, cuidadorServicos: true },
    });
    cuidadorId = caregiver.id;
    ofertaId = caregiver.cuidadorServicos[0].id;
    expect(caregiver.statusVerificacao).toBe('PENDENTE');
    expect(
      Buffer.from(caregiver.curriculo!.conteudo).subarray(0, 5).toString(),
    ).toBe('%PDF-');
    cuidadorToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'pessoa6@teste.local', senha })
        .expect(200)
    ).body.token;
    await request(app.getHttpServer())
      .post('/contratacoes')
      .auth(token, { type: 'bearer' })
      .send({ responsavelId, idosoId, cuidadorServicoId: ofertaId })
      .expect(400);
  });

  it('recusa arquivos inválidos sem criar conta', async () => {
    await request(app.getHttpServer())
      .post('/auth/cadastro')
      .field('dados', JSON.stringify(payload(7, 'cuidador')))
      .attach('curriculo', Buffer.from('arquivo inválido'), 'curriculo.pdf')
      .expect(400);
    expect(
      await prisma.usuario.count({ where: { email: 'pessoa7@teste.local' } }),
    ).toBe(0);
    await request(app.getHttpServer())
      .post('/auth/cadastro')
      .send(payload(8, 'cuidador'))
      .expect(400);
  });

  it('publica apenas cuidadores aprovados sem dados privados', async () => {
    expect(
      (
        await request(app.getHttpServer())
          .get('/catalogo/cuidadores')
          .expect(200)
      ).body,
    ).toEqual([]);
    await request(app.getHttpServer())
      .patch(`/cuidadores/${cuidadorId}/verificacao`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ statusVerificacao: 'APROVADO' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/cuidadores/${cuidadorId}/verificacao`)
      .auth(adminToken, { type: 'bearer' })
      .send({ statusVerificacao: 'APROVADO' })
      .expect(200);
    const catalogo = (
      await request(app.getHttpServer()).get('/catalogo/cuidadores').expect(200)
    ).body;
    expect(catalogo[0].cuidadorServicos[0].id).toBe(ofertaId);
    for (const field of ['cpf', 'telefone', 'senhaHash', 'email', 'conteudo'])
      expect(JSON.stringify(catalogo)).not.toContain(`"${field}"`);
  });

  it('painel administrativo restringe lista, currículo e alterações por papel', async () => {
    await request(app.getHttpServer()).get('/admin/cuidadores').expect(401);
    for (const sessao of [token, cuidadorToken]) {
      await request(app.getHttpServer())
        .get('/admin/cuidadores')
        .auth(sessao, { type: 'bearer' })
        .expect(403);
      await request(app.getHttpServer())
        .get(`/admin/cuidadores/${cuidadorId}/curriculo`)
        .auth(sessao, { type: 'bearer' })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/admin/cuidadores/${cuidadorId}/verificacao`)
        .auth(sessao, { type: 'bearer' })
        .send({ statusVerificacao: 'APROVADO' })
        .expect(403);
      await request(app.getHttpServer())
        .patch(`/admin/cuidadores/${cuidadorId}/conta`)
        .auth(sessao, { type: 'bearer' })
        .send({ status: 'ATIVO' })
        .expect(403);
    }
    const lista = (
      await request(app.getHttpServer())
        .get('/admin/cuidadores')
        .auth(adminToken, { type: 'bearer' })
        .expect(200)
    ).body;
    expect(
      lista.find((item: { id: number }) => item.id === cuidadorId).curriculo
        .nome,
    ).toBe('curriculo.pdf');
    expect(JSON.stringify(lista)).not.toContain('senhaHash');
    expect(JSON.stringify(lista)).not.toContain('conteudo');
    await request(app.getHttpServer())
      .get(`/admin/cuidadores/${cuidadorId}/curriculo`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /pdf/);
    await request(app.getHttpServer())
      .patch(`/admin/cuidadores/${cuidadorId}/conta`)
      .auth(adminToken, { type: 'bearer' })
      .send({ status: 'ADMIN' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/admin/cuidadores/999999/curriculo')
      .auth(adminToken, { type: 'bearer' })
      .expect(404);
  });

  it('admin rejeita, aprova, bloqueia e reativa cuidadores revogando sessões', async () => {
    const verificar = (statusVerificacao: string) =>
      request(app.getHttpServer())
        .patch(`/admin/cuidadores/${cuidadorId}/verificacao`)
        .auth(adminToken, { type: 'bearer' })
        .send({ statusVerificacao });
    await verificar('REJEITADO').expect(200);
    expect(
      (
        await request(app.getHttpServer())
          .get('/catalogo/cuidadores')
          .expect(200)
      ).body,
    ).toEqual([]);
    await verificar('APROVADO').expect(200);
    await request(app.getHttpServer())
      .patch(`/admin/cuidadores/${cuidadorId}/conta`)
      .auth(adminToken, { type: 'bearer' })
      .send({ status: 'BLOQUEADO' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(cuidadorToken, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'pessoa6@teste.local', senha })
      .expect(401);
    expect(
      (
        await request(app.getHttpServer())
          .get('/catalogo/cuidadores')
          .expect(200)
      ).body,
    ).toEqual([]);
    const atualizado = await verificar('APROVADO').expect(200);
    expect(atualizado.body.usuario.status).toBe('ATIVO');
    cuidadorToken = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'pessoa6@teste.local', senha })
        .expect(200)
    ).body.token;
  });

  it('contrata com preço da oferta, filtra histórico e controla transições por papel', async () => {
    const contrato = await request(app.getHttpServer())
      .post('/contratacoes')
      .auth(token, { type: 'bearer' })
      .send({ responsavelId, idosoId, cuidadorServicoId: ofertaId })
      .expect(201);
    contratacaoId = contrato.body.id;
    expect(Number(contrato.body.valorAcordado)).toBe(35);
    await request(app.getHttpServer())
      .patch(`/contratacoes/${contratacaoId}/status`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'ACEITA' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/contratacoes/${contratacaoId}/status`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ status: 'ACEITA' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/contratacoes/${contratacaoId}/status`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ status: 'SOLICITADA' })
      .expect(400);
    const other = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'pessoa4@teste.local', senha })
        .expect(200)
    ).body.token;
    expect(
      (
        await request(app.getHttpServer())
          .get('/contratacoes')
          .auth(other, { type: 'bearer' })
          .expect(200)
      ).body,
    ).toEqual([]);
    await request(app.getHttpServer())
      .get(`/contratacoes/${contratacaoId}`)
      .auth(other, { type: 'bearer' })
      .expect(403);
  });

  it('persiste edição do nome social e permite baixar apenas o próprio currículo', async () => {
    await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioId}`)
      .auth(token, { type: 'bearer' })
      .send({ nome: '   ' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioId}`)
      .auth(token, { type: 'bearer' })
      .send({ nomeSocial: 'Nome Atualizado' })
      .expect(200);
    expect(
      (
        await request(app.getHttpServer())
          .get('/auth/me')
          .auth(token, { type: 'bearer' })
          .expect(200)
      ).body.nomeSocial,
    ).toBe('Nome Atualizado');
    await request(app.getHttpServer())
      .get('/auth/curriculo')
      .auth(cuidadorToken, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /pdf/);
    await request(app.getHttpServer())
      .get('/auth/curriculo')
      .auth(token, { type: 'bearer' })
      .expect(400);
  });

  it('recusa disponibilidades sobrepostas, inclusive simultâneas', async () => {
    const path = `/cuidadores/${cuidadorId}/disponibilidades`;
    const criar = (horaInicio: string, horaFim: string) =>
      request(app.getHttpServer())
        .post(path)
        .auth(cuidadorToken, { type: 'bearer' })
        .send({ diaSemana: 'SEGUNDA', horaInicio, horaFim });
    const results = await Promise.all([
      criar('08:00', '12:00'),
      criar('09:00', '13:00'),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    await criar('08:30', '11:00').expect(409);
    await criar('13:00', '14:00').expect(201);
    await criar('15:00', '14:00').expect(400);
    await request(app.getHttpServer())
      .post(path)
      .auth(token, { type: 'bearer' })
      .send({ diaSemana: 'TERCA', horaInicio: '08:00', horaFim: '12:00' })
      .expect(403);
  });

  it('agenda apenas em disponibilidade, impede reserva simultânea e libera horário cancelado', async () => {
    const proximaSegunda = new Date();
    proximaSegunda.setUTCDate(
      proximaSegunda.getUTCDate() + ((8 - proximaSegunda.getUTCDay()) % 7 || 7),
    );
    const dia = proximaSegunda.toISOString().slice(0, 10);
    const inicio = `${dia}T10:00:00-03:00`;
    const criarContrato = async () => {
      const response = await request(app.getHttpServer())
        .post('/contratacoes')
        .auth(token, { type: 'bearer' })
        .send({ responsavelId, idosoId, cuidadorServicoId: ofertaId })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/contratacoes/${response.body.id}/status`)
        .auth(cuidadorToken, { type: 'bearer' })
        .send({ status: 'ACEITA' })
        .expect(200);
      return response.body.id as number;
    };
    const outroId = await criarContrato();
    await request(app.getHttpServer())
      .post(`/contratacoes/${contratacaoId}/agendamento`)
      .auth(token, { type: 'bearer' })
      .send({ inicio: `${dia}T23:00:00-03:00` })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/contratacoes/${contratacaoId}/agendamento`)
      .auth(token, { type: 'bearer' })
      .send({ inicio: '2000-01-01T10:00:00-03:00' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/contratacoes/${contratacaoId}/agendamento`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ inicio })
      .expect(403);
    const results = await Promise.all(
      [contratacaoId, outroId].map((id) =>
        request(app.getHttpServer())
          .post(`/contratacoes/${id}/agendamento`)
          .auth(token, { type: 'bearer' })
          .send({ inicio }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    const reserva = results.find((result) => result.status === 201)!.body;
    expect(
      new Date(reserva.fim).getTime() - new Date(reserva.inicio).getTime(),
    ).toBe(60 * 60000);
    await request(app.getHttpServer())
      .patch(`/contratacoes/${reserva.contratacaoId}/status`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'CANCELADA' })
      .expect(200);
    expect(
      (
        await prisma.agendamento.findUniqueOrThrow({
          where: { id: reserva.id },
        })
      ).ativo,
    ).toBe(false);
    const novoId = await criarContrato();
    await request(app.getHttpServer())
      .post(`/contratacoes/${novoId}/agendamento`)
      .auth(token, { type: 'bearer' })
      .send({ inicio })
      .expect(201);
    const agenda = (
      await request(app.getHttpServer())
        .get('/agendamentos')
        .auth(token, { type: 'bearer' })
        .expect(200)
    ).body;
    expect(agenda).toHaveLength(2);
    const other = (
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'pessoa4@teste.local', senha })
        .expect(200)
    ).body.token;
    expect(
      (
        await request(app.getHttpServer())
          .get('/agendamentos')
          .auth(other, { type: 'bearer' })
          .expect(200)
      ).body,
    ).toEqual([]);
  });

  it('salva foto de perfil, valida o conteúdo e controla quem pode ver', async () => {
    const http = () => request(app.getHttpServer());
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
      'base64',
    );
    await http().post('/auth/foto').auth(token, { type: 'bearer' }).expect(400);
    await http()
      .post('/auth/foto')
      .auth(token, { type: 'bearer' })
      .attach('foto', Buffer.from('não sou imagem, mas tenho tamanho'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(400);
    await http()
      .post('/auth/foto')
      .auth(token, { type: 'bearer' })
      .attach('foto', Buffer.alloc(3 * 1024 * 1024 + 1), 'grande.png')
      .expect(413);
    await http().post('/auth/foto').attach('foto', png, 'a.png').expect(401);
    await http()
      .post('/auth/foto')
      .auth(token, { type: 'bearer' })
      .attach('foto', png, { filename: 'a.png', contentType: 'image/png' })
      .expect(201);
    const me = await http()
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(me.body.foto.updatedAt).toBeTruthy();
    // Dono vê; sem sessão ou outro usuário sem vínculo não vê.
    const dono = await http()
      .get(`/fotos/${usuarioId}`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(dono.headers['content-type']).toBe('image/png');
    await http().get(`/fotos/${usuarioId}`).expect(401);
    // Sessão criada direto no banco para não consumir o limite de logins.
    const outro = 'f'.repeat(64);
    const alheio = await prisma.usuario.findUniqueOrThrow({
      where: { email: 'pessoa4@teste.local' },
    });
    await prisma.sessao.create({
      data: {
        usuarioId: alheio.id,
        tokenHash: hashToken(outro),
        expiraEm: new Date(Date.now() + 3600_000),
      },
    });
    await http()
      .get(`/fotos/${usuarioId}`)
      .auth(outro, { type: 'bearer' })
      .expect(403);
    // Cuidador aprovado: foto pública (aparece na busca).
    await http()
      .post('/auth/foto')
      .auth(cuidadorToken, { type: 'bearer' })
      .attach('foto', png, { filename: 'c.png', contentType: 'image/png' })
      .expect(201);
    const cuidador = await prisma.cuidador.findUniqueOrThrow({
      where: { id: cuidadorId },
    });
    await http().get(`/fotos/${cuidador.usuarioId}`).expect(200);
    const catalogo = await http().get('/catalogo/cuidadores').expect(200);
    expect(
      catalogo.body.find((c: { id: number }) => c.id === cuidadorId).usuario
        .foto.updatedAt,
    ).toBeTruthy();
    // Remoção.
    await http()
      .delete('/auth/foto')
      .auth(token, { type: 'bearer' })
      .expect(204);
    await http()
      .get(`/fotos/${usuarioId}`)
      .auth(token, { type: 'bearer' })
      .expect(404);
  });

  it('revoga sessão no logout, expiração e bloqueio', async () => {
    const login = async () =>
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'pessoa1@teste.local', senha })
          .expect(200)
      ).body.token;
    const expired = await login();
    await prisma.sessao.updateMany({
      where: { usuarioId },
      data: { expiraEm: new Date(0) },
    });
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(expired, { type: 'bearer' })
      .expect(401);
    const blocked = await login();
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { status: 'BLOQUEADO' },
    });
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(blocked, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'pessoa1@teste.local', senha })
      .expect(401);
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { status: 'ATIVO' },
    });
    const fresh = await login();
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(fresh, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get('/auth/me')
      .auth(fresh, { type: 'bearer' })
      .expect(401);
  });

  it('trocar senha revoga todas as sessões e exige a nova senha', async () => {
    const login = async () =>
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'pessoa1@teste.local', senha })
          .expect(200)
      ).body.token;
    const primeira = await login();
    const segunda = await login();
    const novaSenha = 'SenhaNovaSegura123!';
    await request(app.getHttpServer())
      .patch(`/usuarios/${usuarioId}/senha`)
      .auth(primeira, { type: 'bearer' })
      .send({ senhaAtual: senha, novaSenha })
      .expect(200);
    for (const sessao of [primeira, segunda])
      await request(app.getHttpServer())
        .get('/auth/me')
        .auth(sessao, { type: 'bearer' })
        .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'pessoa1@teste.local', senha })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'pessoa1@teste.local', senha: novaSenha })
      .expect(200);
  });
});
