import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashToken } from '../src/auth/auth.service.js';
function cpf(n: number) {
  let v = String(n);
  for (let s = 9; s <= 10; s++) {
    const d =
      ([...v].reduce((a, x, i) => a + Number(x) * (s + 1 - i), 0) * 10) % 11;
    v += d === 10 ? '0' : String(d);
  }
  return v;
}
const endereco = {
  rua: 'Rua Agenda',
  numero: '10',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01001000',
};
describe('Agenda, disponibilidade, múltiplos idosos e edição de perfis', () => {
  let app: INestApplication, db: PrismaService;
  const usuariosCriados: number[] = [];
  const enderecosCriados: number[] = [];
  let catalogoId: number;
  let responsavelId: number,
    outroId: number,
    cuidadorId: number,
    ofertaId: number;
  let token: string, outroToken: string, cuidadorToken: string;
  let idosoId: number, segundoId: number, janelaId: number;
  let contratoA: number, contratoB: number, vencedor: number, perdedor: number;
  const segunda = new Date();
  segunda.setUTCDate(
    segunda.getUTCDate() + 7 + ((8 - segunda.getUTCDay()) % 7),
  );
  const data = segunda.toISOString().slice(0, 10),
    mes = data.slice(0, 7);
  const http = () => request(app.getHttpServer());
  const horarios = (id: number, auth = token, m = mes) =>
    http()
      .get(`/contratacoes/${id}/horarios`)
      .query({ mes: m })
      .auth(auth, { type: 'bearer' });
  const disponibilidade = (body: object, auth = cuidadorToken) =>
    http()
      .post(`/cuidadores/${cuidadorId}/disponibilidades`)
      .auth(auth, { type: 'bearer' })
      .send(body);
  async function contrato(idoso = idosoId, aceitar = true) {
    const r = await http()
      .post('/contratacoes')
      .auth(token, { type: 'bearer' })
      .send({ responsavelId, idosoId: idoso, cuidadorServicoId: ofertaId })
      .expect(201);
    if (aceitar)
      await http()
        .patch(`/contratacoes/${r.body.id}/status`)
        .auth(cuidadorToken, { type: 'bearer' })
        .send({ status: 'ACEITA' })
        .expect(200);
    return r.body.id as number;
  }
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/laco_test_'))
      throw new Error('Use banco temporário.');
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
    db = app.get(PrismaService);
    async function conta(n: number, tipoUsuario: 'RESPONSAVEL' | 'CUIDADOR') {
      const u = await db.usuario.create({
        data: {
          nome: `Pessoa Agenda ${n}`,
          email: `agenda${n}@teste.local`,
          senhaHash: 'nao-usada',
          tipoUsuario,
        },
      });
      usuariosCriados.push(u.id);
      const t = randomBytes(32).toString('hex');
      await db.sessao.create({
        data: {
          usuarioId: u.id,
          tokenHash: hashToken(t),
          expiraEm: new Date(Date.now() + 3600000),
        },
      });
      const base = {
        usuario: { connect: { id: u.id } },
        telefone: '11999998888',
        cpf: cpf(800000000 + n),
        dataNascimento: new Date('1980-01-01'),
        endereco: { create: endereco },
      };
      const p =
        tipoUsuario === 'RESPONSAVEL'
          ? await db.responsavel.create({ data: base })
          : await db.cuidador.create({
              data: { ...base, statusVerificacao: 'APROVADO' },
            });
      enderecosCriados.push(p.enderecoId);
      return { id: p.id, token: t };
    }
    const r = await conta(1, 'RESPONSAVEL');
    responsavelId = r.id;
    token = r.token;
    const o = await conta(2, 'RESPONSAVEL');
    outroId = o.id;
    outroToken = o.token;
    const c = await conta(3, 'CUIDADOR');
    cuidadorId = c.id;
    cuidadorToken = c.token;
    const servico = await db.servico.create({
      data: { nome: 'Serviço de agenda integrado' },
    });
    catalogoId = servico.id;
    ofertaId = (
      await db.cuidadorServico.create({
        data: {
          cuidadorId,
          servicoId: servico.id,
          preco: 100,
          duracaoMinutos: 240,
        },
      })
    ).id;
  });
  afterAll(async () => {
    try {
      if (db)
        await db.$transaction(async (tx) => {
          const responsaveis = [responsavelId, outroId].filter((id) =>
            Number.isInteger(id),
          );
          const idosos = await tx.idoso.findMany({
            where: {
              responsavelIdosos: {
                some: { responsavelId: { in: responsaveis } },
              },
            },
            select: { id: true, enderecoId: true },
          });
          const contratos = await tx.contratacao.findMany({
            where: { responsavelId: { in: responsaveis } },
            select: { id: true },
          });
          await tx.agendamento.deleteMany({
            where: { contratacaoId: { in: contratos.map((c) => c.id) } },
          });
          await tx.contratacao.deleteMany({
            where: { id: { in: contratos.map((c) => c.id) } },
          });
          await tx.disponibilidade.deleteMany({
            where: { cuidadorId: cuidadorId ?? -1 },
          });
          await tx.cuidadorServico.deleteMany({
            where: { cuidadorId: cuidadorId ?? -1 },
          });
          await tx.servico.deleteMany({ where: { id: catalogoId ?? -1 } });
          await tx.responsavelIdoso.deleteMany({
            where: { responsavelId: { in: responsaveis } },
          });
          await tx.idoso.deleteMany({
            where: { id: { in: idosos.map((i) => i.id) } },
          });
          await tx.cuidador.deleteMany({
            where: { usuarioId: { in: usuariosCriados } },
          });
          await tx.responsavel.deleteMany({
            where: { usuarioId: { in: usuariosCriados } },
          });
          await tx.usuario.deleteMany({
            where: { id: { in: usuariosCriados } },
          });
          await tx.endereco.deleteMany({
            where: {
              id: {
                in: [...enderecosCriados, ...idosos.map((i) => i.enderecoId)],
              },
            },
          });
        });
    } finally {
      await app?.close();
    }
  });
  it('cadastra dois idosos com vínculo automático e lista apenas os próprios', async () => {
    const criar = (nome: string) =>
      http()
        .post('/idosos')
        .auth(token, { type: 'bearer' })
        .send({
          nome,
          nomeSocial: `${nome} social`,
          dataNascimento: '1940-02-01',
          parentesco: 'FILHO',
          endereco,
        });
    idosoId = (await criar('Idoso Agenda Um').expect(201)).body.id;
    segundoId = (await criar('Idoso Agenda Dois').expect(201)).body.id;
    const r = await http()
      .get('/idosos')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(r.body.map((i: { id: number }) => i.id).sort()).toEqual(
      [idosoId, segundoId].sort(),
    );
    expect(
      (
        await http()
          .get('/idosos')
          .auth(outroToken, { type: 'bearer' })
          .expect(200)
      ).body,
    ).toEqual([]);
    const me = await http()
      .get('/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(me.body.responsavel.responsavelIdosos).toHaveLength(2);
    await http()
      .post('/idosos')
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ nome: 'Não permitido', dataNascimento: '1940-01-01', endereco })
      .expect(403);
    await http()
      .post('/idosos')
      .auth(token, { type: 'bearer' })
      .send({ nome: 'Inválido', dataNascimento: '2040-01-01', endereco })
      .expect(400);
  });
  it('salva perfil e endereço juntos, com autorização e validação', async () => {
    await http()
      .patch(`/responsaveis/${responsavelId}`)
      .auth(token, { type: 'bearer' })
      .send({
        telefone: '11911112222',
        usuario: {
          nome: 'Responsável Editado',
          nomeSocial: 'Social Agenda',
          telefone2: '11933334444',
          email: ' AGENDA-EDITADA@teste.local ',
        },
        endereco: { numero: '20' },
      })
      .expect(200);
    const me = (
      await http().get('/auth/me').auth(token, { type: 'bearer' }).expect(200)
    ).body;
    expect(me.nome).toBe('Responsável Editado');
    expect(me.email).toBe('agenda-editada@teste.local');
    expect(me.responsavel.endereco.numero).toBe('20');
    expect(me.responsavel.endereco.rua).toBe(endereco.rua);
    expect(me.telefone2).toBe('11933334444');
    await http()
      .patch(`/cuidadores/${cuidadorId}`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({
        biografia: 'Atendimento humanizado',
        experienciaProfissional: 'Cinco anos',
        registroProfissional: 'REG-1',
        usuario: { nome: 'Cuidador Editado' },
      })
      .expect(200);
    const cm = (
      await http()
        .get('/auth/me')
        .auth(cuidadorToken, { type: 'bearer' })
        .expect(200)
    ).body;
    expect(cm.cuidador.biografia).toBe('Atendimento humanizado');
    expect(cm.nome).toBe('Cuidador Editado');
    await http()
      .patch(`/responsaveis/${responsavelId}`)
      .auth(outroToken, { type: 'bearer' })
      .send({ telefone: '11911112222' })
      .expect(403);
    for (const change of [
      { cpf: '11111111111' },
      { dataNascimento: '2099-01-01' },
      { endereco: { rua: '   ' } },
      { usuario: { nome: ' ' } },
      { usuario: { tipoUsuario: 'ADMIN' } },
      { usuario: { senha: 'Nova123456!' } },
    ])
      await http()
        .patch(`/responsaveis/${responsavelId}`)
        .auth(token, { type: 'bearer' })
        .send(change)
        .expect(400);
    // Um conflito na edição do usuário desfaz também a alteração do endereço.
    await http()
      .patch(`/responsaveis/${responsavelId}`)
      .auth(token, { type: 'bearer' })
      .send({
        endereco: { numero: '999' },
        usuario: { email: 'agenda2@teste.local' },
      })
      .expect(409);
    expect(
      (
        await db.responsavel.findUniqueOrThrow({
          where: { id: responsavelId },
          include: { endereco: true },
        })
      ).endereco.numero,
    ).toBe('20');
  });
  it('edita dados do idoso e impede alteração ou vinculação por terceiros', async () => {
    await http()
      .patch(`/idosos/${idosoId}`)
      .auth(token, { type: 'bearer' })
      .send({
        nome: 'Idoso Atualizado',
        nomeSocial: 'Social atualizado',
        necessidadesEspeciais: 'Mobilidade reduzida',
        endereco: { numero: '50' },
      })
      .expect(200);
    const i = (
      await http()
        .get(`/idosos/${idosoId}`)
        .auth(token, { type: 'bearer' })
        .expect(200)
    ).body;
    expect(i.nomeSocial).toBe('Social atualizado');
    expect(i.endereco.numero).toBe('50');
    await http()
      .patch(`/idosos/${idosoId}`)
      .auth(outroToken, { type: 'bearer' })
      .send({ nome: 'Alheio' })
      .expect(403);
    await http()
      .post(`/responsaveis/${outroId}/idosos/${idosoId}`)
      .auth(outroToken, { type: 'bearer' })
      .send({ parentesco: 'OUTRO' })
      .expect(403);
    await http()
      .patch(`/idosos/${idosoId}`)
      .auth(token, { type: 'bearer' })
      .send({ nome: '  ' })
      .expect(400);
  });
  it('adiciona múltiplos intervalos e edita/ativa/desativa sem permitir sobreposições', async () => {
    janelaId = (
      await disponibilidade({
        diaSemana: 'SEGUNDA',
        horaInicio: '08:00',
        horaFim: '12:00',
      }).expect(201)
    ).body.id;
    await disponibilidade({
      diaSemana: 'SEGUNDA',
      horaInicio: '13:00',
      horaFim: '17:00',
    }).expect(201);
    await disponibilidade({
      diaSemana: 'SABADO',
      horaInicio: '08:00',
      horaFim: '12:00',
    }).expect(201);
    await disponibilidade({
      diaSemana: 'SEGUNDA',
      horaInicio: '11:00',
      horaFim: '14:00',
    }).expect(409);
    await disponibilidade({
      diaSemana: 'TERCA',
      horaInicio: '12:00',
      horaFim: '08:00',
    }).expect(400);
    await disponibilidade(
      { diaSemana: 'QUARTA', horaInicio: '08:00', horaFim: '12:00' },
      token,
    ).expect(403);
    await http()
      .patch(`/disponibilidades/${janelaId}`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ horaFim: '14:00' })
      .expect(409);
    await http()
      .patch(`/disponibilidades/${janelaId}`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ ativo: false })
      .expect(200);
    expect(
      (
        await http()
          .get(`/cuidadores/${cuidadorId}/disponibilidades`)
          .auth(cuidadorToken, { type: 'bearer' })
          .expect(200)
      ).body.find((d: { id: number }) => d.id === janelaId).ativo,
    ).toBe(false);
    await http()
      .patch(`/disponibilidades/${janelaId}`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ ativo: true, horaInicio: '08:00' })
      .expect(200);
  });
  it('oferece somente dias e horários compatíveis com a duração e controla acesso/status', async () => {
    contratoA = await contrato();
    contratoB = await contrato(segundoId);
    const r = await horarios(contratoA).expect(200);
    expect(r.body.fuso).toBe('America/Sao_Paulo');
    expect(r.body.duracaoMinutos).toBe(240);
    expect(
      r.body.datas
        .find((d: { data: string }) => d.data === data)
        .horarios.map((h: { horaInicio: string }) => h.horaInicio),
    ).toEqual(['08:00', '13:00']);
    expect(
      r.body.datas.every((d: { data: string }) =>
        [1, 6].includes(new Date(`${d.data}T12:00Z`).getUTCDay()),
      ),
    ).toBe(true);
    await horarios(contratoA, outroToken).expect(403);
    await horarios(contratoA, cuidadorToken).expect(403);
    await horarios(contratoA, token, '2026-13').expect(400);
    const pendente = await contrato(idosoId, false);
    await horarios(pendente).expect(400);
    await http()
      .post(`/contratacoes/${contratoA}/agendamento`)
      .auth(token, { type: 'bearer' })
      .send({ inicio: `${data}T10:00:00-03:00` })
      .expect(400);
    await http()
      .post(`/contratacoes/${contratoA}/agendamento`)
      .auth(token, { type: 'bearer' })
      .send({ inicio: '2000-01-01T08:00:00-03:00' })
      .expect(400);
  });
  it('impede reservas simultâneas e apresenta a reserva nas duas agendas com filtro por idoso', async () => {
    const results = await Promise.all(
      [contratoA, contratoB].map((id) =>
        http()
          .post(`/contratacoes/${id}/agendamento`)
          .auth(token, { type: 'bearer' })
          .send({ inicio: `${data}T08:00:00-03:00` }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const reserva = results.find((r) => r.status === 201)!.body;
    vencedor = reserva.contratacaoId;
    perdedor = vencedor === contratoA ? contratoB : contratoA;
    expect(
      new Date(reserva.fim).getTime() - new Date(reserva.inicio).getTime(),
    ).toBe(240 * 60000);
    const agendas = await Promise.all(
      [token, cuidadorToken].map((t) =>
        http().get('/agendamentos').auth(t, { type: 'bearer' }).expect(200),
      ),
    );
    expect(agendas[0].body[0].id).toBe(agendas[1].body[0].id);
    const idoso = agendas[0].body[0].contratacao.idoso.id;
    expect([idosoId, segundoId]).toContain(idoso);
    expect(
      (
        await http()
          .get('/agendamentos')
          .query({ idosoId: idoso })
          .auth(token, { type: 'bearer' })
          .expect(200)
      ).body,
    ).toHaveLength(1);
    expect(
      (
        await http()
          .get('/agendamentos')
          .query({ idosoId: idoso === idosoId ? segundoId : idosoId })
          .auth(token, { type: 'bearer' })
          .expect(200)
      ).body,
    ).toEqual([]);
    expect(
      (
        await http()
          .get('/agendamentos')
          .auth(outroToken, { type: 'bearer' })
          .expect(200)
      ).body,
    ).toEqual([]);
    const livres = await horarios(perdedor).expect(200);
    expect(
      livres.body.datas
        .find((d: { data: string }) => d.data === data)
        .horarios.map((h: { horaInicio: string }) => h.horaInicio),
    ).toEqual(['13:00']);
  });
  it('cancelamento libera o horário e a agenda mantém a informação de cancelado', async () => {
    await http()
      .patch(`/contratacoes/${vencedor}/status`)
      .auth(token, { type: 'bearer' })
      .send({ status: 'CANCELADA' })
      .expect(200);
    const livres = await horarios(perdedor).expect(200);
    expect(
      livres.body.datas
        .find((d: { data: string }) => d.data === data)
        .horarios.map((h: { horaInicio: string }) => h.horaInicio),
    ).toContain('08:00');
    const a = (
      await http()
        .get('/agendamentos')
        .auth(cuidadorToken, { type: 'bearer' })
        .expect(200)
    ).body;
    expect(
      a.find(
        (a: { contratacao: { id: number } }) => a.contratacao.id === vencedor,
      ).ativo,
    ).toBe(false);
    await http()
      .post(`/contratacoes/${perdedor}/agendamento`)
      .auth(token, { type: 'bearer' })
      .send({ inicio: `${data}T08:00:00-03:00` })
      .expect(201);
    await horarios(perdedor).expect(400);
    // Pausar recorrência mantém o atendimento confirmado e remove novas opções de reserva.
    await http()
      .patch(`/disponibilidades/${janelaId}`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ ativo: false })
      .expect(200);
    expect(
      (
        await db.agendamento.findUniqueOrThrow({
          where: { contratacaoId: perdedor },
        })
      ).ativo,
    ).toBe(true);
  });
});
