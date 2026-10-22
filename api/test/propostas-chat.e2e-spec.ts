import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashToken } from '../src/auth/auth.service.js';

describe('Propostas no chat, confirmação atômica e agendas', () => {
  let app: INestApplication, db: PrismaService;
  let r: { id: number; usuarioId: number; token: string },
    c: typeof r,
    x: typeof r,
    y: typeof r;
  let idosoId: number,
    outroIdosoId: number,
    ofertaId: number,
    oferta2: number,
    ofertaAlheia: number,
    contratoId: number,
    propostaId: number;
  const usuarios: number[] = [],
    enderecos: number[] = [],
    servicos: number[] = [];
  const segunda = new Date();
  segunda.setUTCDate(
    segunda.getUTCDate() + 7 + ((8 - segunda.getUTCDay()) % 7),
  );
  const data = segunda.toISOString().slice(0, 10),
    mes = data.slice(0, 7);
  const proxima = new Date(segunda);
  proxima.setUTCDate(proxima.getUTCDate() + 7);
  const data2 = proxima.toISOString().slice(0, 10);
  const inicio = `${data}T08:00:00-03:00`;
  const http = () => request(app.getHttpServer());
  const post = (url: string, body: object, token = c.token) =>
    http().post(url).auth(token, { type: 'bearer' }).send(body);
  const get = (url: string, token = r.token) =>
    http().get(url).auth(token, { type: 'bearer' });
  const url = (contato = r.usuarioId) =>
    `/mensagens/conversas/${contato}/propostas`;
  const payload = (extra: object = {}) => ({
    idosoId,
    total: '240.30',
    observacoes: 'Condições negociadas no chat',
    itens: [
      {
        cuidadorServicoId: ofertaId,
        contratacaoOrigemId: contratoId,
        preco: '100.10',
        duracaoMinutos: 120,
        inicios: [inicio, `${data2}T08:00:00-03:00`],
      },
      {
        cuidadorServicoId: oferta2,
        preco: '40.10',
        duracaoMinutos: 30,
        inicios: [`${data}T10:00:00-03:00`],
      },
    ],
    ...extra,
  });
  const responder = (id: number, status: string, resposta?: string) =>
    post(
      `${url(c.usuarioId)}/${id}/resposta`,
      { status, ...(resposta ? { resposta } : {}) },
      r.token,
    );
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
          nome: `Pessoa Proposta ${n}`,
          email: `proposta${n}@teste.local`,
          senhaHash: 'nao-usada',
          tipoUsuario,
        },
      });
      usuarios.push(u.id);
      const token = randomBytes(32).toString('hex');
      await db.sessao.create({
        data: {
          usuarioId: u.id,
          tokenHash: hashToken(token),
          expiraEm: new Date(Date.now() + 3600000),
        },
      });
      const e = await db.endereco.create({
        data: {
          rua: 'Rua Proposta',
          numero: '1',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01001000',
        },
      });
      enderecos.push(e.id);
      const base = {
        usuarioId: u.id,
        enderecoId: e.id,
        telefone: '11999998888',
        cpf: `9000000000${n}`,
        dataNascimento: new Date('1980-01-01'),
      };
      const perfil =
        tipoUsuario === 'RESPONSAVEL'
          ? await db.responsavel.create({ data: base })
          : await db.cuidador.create({
              data: { ...base, statusVerificacao: 'APROVADO' },
            });
      return { id: perfil.id, usuarioId: u.id, token };
    }
    r = await conta(1, 'RESPONSAVEL');
    c = await conta(2, 'CUIDADOR');
    x = await conta(3, 'RESPONSAVEL');
    y = await conta(4, 'CUIDADOR');
    const criarIdoso = async (responsavelId: number, enderecoId: number) => {
      const i = await db.idoso.create({
        data: {
          nome: 'Idoso Proposta',
          dataNascimento: new Date('1940-01-01'),
          enderecoId,
        },
      });
      await db.responsavelIdoso.create({
        data: { responsavelId, idosoId: i.id, parentesco: 'FILHO' },
      });
      return i.id;
    };
    idosoId = await criarIdoso(r.id, enderecos[0]);
    outroIdosoId = await criarIdoso(x.id, enderecos[2]);
    for (const nome of ['Domiciliar Proposta', 'Leitura Proposta']) {
      const s = await db.servico.create({ data: { nome } });
      servicos.push(s.id);
      const o = await db.cuidadorServico.create({
        data: {
          cuidadorId: c.id,
          servicoId: s.id,
          preco: '150.50',
          duracaoMinutos: 300,
        },
      });
      if (!ofertaId) ofertaId = o.id;
      else oferta2 = o.id;
    }
    ofertaAlheia = (
      await db.cuidadorServico.create({
        data: {
          cuidadorId: y.id,
          servicoId: servicos[0],
          preco: 80,
          duracaoMinutos: 60,
        },
      })
    ).id;
    await db.disponibilidade.create({
      data: {
        cuidadorId: c.id,
        diaSemana: 'SEGUNDA',
        horaInicio: new Date('1970-01-01T08:00:00Z'),
        horaFim: new Date('1970-01-01T12:00:00Z'),
      },
    });
    contratoId = (
      await db.contratacao.create({
        data: {
          responsavelId: r.id,
          idosoId,
          cuidadorServicoId: ofertaId,
          nomeServico: 'Domiciliar Proposta',
          precoReferencia: 150.5,
          valorAcordado: 150.5,
          duracaoMinutos: 300,
        },
      })
    ).id;
  });
  afterAll(async () => {
    try {
      if (db && r) {
        await db.mensagem.deleteMany({
          where: {
            OR: [
              { remetenteId: { in: usuarios } },
              { destinatarioId: { in: usuarios } },
            ],
          },
        });
        await db.agendamento.deleteMany({
          where: { cuidadorId: { in: [c.id, y.id] } },
        });
        await db.contratacao.updateMany({
          where: { responsavelId: r.id },
          data: { itemPropostaId: null, sessaoProposta: null },
        });
        await db.itemPropostaAtendimento.deleteMany({
          where: { proposta: { responsavelId: r.id } },
        });
        await db.propostaAtendimento.deleteMany({
          where: { responsavelId: r.id },
        });
        await db.contratacao.deleteMany({ where: { responsavelId: r.id } });
        await db.disponibilidade.deleteMany({
          where: { cuidadorId: { in: [c.id, y.id] } },
        });
        await db.cuidadorServico.deleteMany({
          where: { cuidadorId: { in: [c.id, y.id] } },
        });
        await db.servico.deleteMany({ where: { id: { in: servicos } } });
        await db.responsavelIdoso.deleteMany({
          where: { idosoId: { in: [idosoId, outroIdosoId] } },
        });
        await db.idoso.deleteMany({
          where: { id: { in: [idosoId, outroIdosoId] } },
        });
        await db.cuidador.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await db.responsavel.deleteMany({
          where: { usuarioId: { in: usuarios } },
        });
        await db.usuario.deleteMany({ where: { id: { in: usuarios } } });
        await db.endereco.deleteMany({ where: { id: { in: enderecos } } });
      }
    } finally {
      await app?.close();
    }
  });
  it('mantém texto e acesso ao chat existente, fornece idosos, ofertas e horários por duração', async () => {
    await post(`/mensagens/conversas/${r.usuarioId}`, {
      conteudo: 'Podemos negociar duas manhãs?',
    }).expect(201);
    const mensagens = await get(`/mensagens/conversas/${c.usuarioId}`).expect(
      200,
    );
    expect(mensagens.body[0].conteudo).toContain('negociar');
    const contexto = await get(`${url()}/contexto`, c.token).expect(200);
    expect(contexto.body.idosos.map((i) => i.id)).toEqual([idosoId]);
    expect(contexto.body.contratacoes[0].id).toBe(contratoId);
    const longa = await get(
      `${url()}/horarios?mes=${mes}&duracaoMinutos=300`,
      c.token,
    ).expect(200);
    expect(longa.body.datas).toEqual([]);
    const curta = await get(
      `${url()}/horarios?mes=${mes}&duracaoMinutos=120`,
      c.token,
    ).expect(200);
    expect(curta.body.fuso).toBe('America/Sao_Paulo');
    expect(
      curta.body.datas.find((d) => d.data === data).horarios[0].horaInicio,
    ).toBe('08:00');
  });
  it('rejeita intrusos, papel incorreto, idoso sem vínculo e serviço de outro cuidador', async () => {
    await get(`${url()}/contexto`, x.token).expect(403);
    await get(url(), x.token).expect(403);
    await post(url(), payload(), x.token).expect(403);
    await post(url(c.usuarioId), payload(), r.token).expect(403);
    await post(url(), payload({ idosoId: outroIdosoId })).expect(403);
    const alheia = payload();
    alheia.itens[0].cuidadorServicoId = ofertaAlheia;
    delete (alheia.itens[0] as { contratacaoOrigemId?: number })
      .contratacaoOrigemId;
    await post(url(), alheia).expect(400);
  });
  it('valida valores, fuso, datas passadas, duração incompatível e sobreposição na própria proposta', async () => {
    await post(url(), payload({ total: '10.00' })).expect(400);
    const semFuso = payload();
    semFuso.itens[0].inicios = [`${data}T08:00:00`];
    await post(url(), semFuso).expect(400);
    const passado = payload();
    passado.itens[0].inicios = [
      '2000-01-01T08:00:00-03:00',
      `${data2}T08:00:00-03:00`,
    ];
    await post(url(), passado).expect(400);
    const longa = payload();
    longa.itens[0].duracaoMinutos = 300;
    await post(url(), longa).expect(400);
    const sobreposta = payload();
    sobreposta.itens[1].inicios = [inicio];
    await post(url(), sobreposta).expect(409);
    const vazia = payload();
    vazia.itens[0].inicios = [];
    await post(url(), vazia).expect(400);
    expect(await db.agendamento.count({ where: { cuidadorId: c.id } })).toBe(0);
  });
  it('envia cartão pendente sem confirmar atendimentos e preserva versões respondidas', async () => {
    const p = await post(url(), payload()).expect(201);
    propostaId = p.body.id;
    expect(p.body.status).toBe('PENDENTE');
    expect(p.body.total).toBe('240.3');
    const mensagens = await get(`/mensagens/conversas/${c.usuarioId}`).expect(
      200,
    );
    expect(mensagens.body.at(-1).propostaId).toBe(propostaId);
    expect(await db.contratacao.count({ where: { responsavelId: r.id } })).toBe(
      1,
    );
    expect(await db.agendamento.count({ where: { cuidadorId: c.id } })).toBe(0);
    await post(`${url()}/${propostaId}/resposta`, { status: 'ACEITA' }).expect(
      403,
    );
    await post(
      `${url(c.usuarioId)}/${propostaId}/resposta`,
      { status: 'ACEITA' },
      x.token,
    ).expect(403);
    await responder(propostaId, 'ALTERACOES_SOLICITADAS').expect(400);
    await responder(
      propostaId,
      'ALTERACOES_SOLICITADAS',
      'Revise os valores.',
    ).expect(201);
    await responder(propostaId, 'ACEITA').expect(409);
    const v2 = await post(url(), payload({ anteriorId: propostaId })).expect(
      201,
    );
    expect(v2.body.versao).toBe(2);
    await responder(v2.body.id, 'RECUSADA').expect(201);
    await responder(v2.body.id, 'ACEITA').expect(409);
    const v3 = await post(url(), payload({ anteriorId: v2.body.id })).expect(
      201,
    );
    const v4 = await post(url(), payload({ anteriorId: v3.body.id })).expect(
      201,
    );
    expect(
      (
        await db.propostaAtendimento.findUniqueOrThrow({
          where: { id: v3.body.id },
        })
      ).status,
    ).toBe('SUBSTITUIDA');
    await responder(v3.body.id, 'ACEITA').expect(409);
    await post(url(), payload({ anteriorId: v3.body.id })).expect(409);
    propostaId = v4.body.id;
  });
  it('aceita uma vez sob concorrência, reutiliza contratação e confirma todas as sessões nas duas agendas', async () => {
    await db.cuidadorServico.update({
      where: { id: ofertaId },
      data: { preco: 999, duracaoMinutos: 45 },
    });
    const resultados = await Promise.all([
      responder(propostaId, 'ACEITA'),
      responder(propostaId, 'ACEITA'),
    ]);
    expect(resultados.map((r) => r.status).sort()).toEqual([201, 409]);
    const contratos = await db.contratacao.findMany({
      where: { responsavelId: r.id },
      include: { agendamento: true },
      orderBy: { id: 'asc' },
    });
    expect(contratos).toHaveLength(3);
    expect(contratos[0].id).toBe(contratoId);
    expect(
      contratos.every((c) => c.status === 'ACEITA' && c.agendamento?.ativo),
    ).toBe(true);
    expect(contratos[0].duracaoMinutos).toBe(120);
    expect(contratos[0].precoReferencia.toString()).toBe('150.5');
    expect(contratos[0].valorAcordado.toString()).toBe('100.1');
    for (const token of [r.token, c.token]) {
      const agenda = await get('/agendamentos', token).expect(200);
      expect(agenda.body).toHaveLength(3);
      expect(agenda.body[0].contratacao.observacoes).toBe(
        'Condições negociadas no chat',
      );
      expect(agenda.body[0].contratacao.valorAcordado).toBe('100.1');
      expect(agenda.body[0].contratacao.duracaoMinutos).toBe(120);
    }
    await db.cuidadorServico.update({
      where: { id: ofertaId },
      data: { preco: 300 },
    });
    expect(
      (
        await db.contratacao.findUniqueOrThrow({ where: { id: contratoId } })
      ).valorAcordado.toString(),
    ).toBe('100.1');
    await post(url(), payload({ anteriorId: propostaId })).expect(409);
    expect(
      (await get(url(c.usuarioId))).body.find((p) => p.id === propostaId)
        .status,
    ).toBe('ACEITA');
  });
  it('bloqueia horários ocupados e desfaz toda a confirmação se um horário ficar indisponível após o envio', async () => {
    await post(url(), payload()).expect(409); // origem já formalizada
    const proposta = {
      idosoId,
      total: '20.00',
      itens: [
        {
          cuidadorServicoId: ofertaId,
          preco: '10.00',
          duracaoMinutos: 60,
          inicios: [`${data}T10:30:00-03:00`, `${data2}T10:30:00-03:00`],
        },
      ],
    };
    const p = await post(url(), proposta).expect(201);
    const bloqueio = await db.contratacao.create({
      data: {
        responsavelId: r.id,
        idosoId,
        cuidadorServicoId: ofertaId,
        nomeServico: 'Reserva',
        precoReferencia: 10,
        valorAcordado: 10,
        duracaoMinutos: 60,
        status: 'ACEITA',
      },
    });
    await post(
      `/contratacoes/${bloqueio.id}/agendamento`,
      { inicio: `${data2}T10:30:00-03:00` },
      r.token,
    ).expect(201);
    const antes = await db.contratacao.count({
      where: { responsavelId: r.id },
    });
    await responder(p.body.id, 'ACEITA').expect(409);
    expect(await db.contratacao.count({ where: { responsavelId: r.id } })).toBe(
      antes,
    );
    expect(
      (
        await db.propostaAtendimento.findUniqueOrThrow({
          where: { id: p.body.id },
        })
      ).status,
    ).toBe('PENDENTE');
    expect(await db.agendamento.count({ where: { cuidadorId: c.id } })).toBe(4);
    await post(url(), proposta).expect(409);
  });
  it('reflete cancelamento nas duas agendas e preserva os termos aceitos no cartão', async () => {
    await http()
      .patch(`/contratacoes/${contratoId}/status`)
      .auth(r.token, { type: 'bearer' })
      .send({ status: 'CANCELADA' })
      .expect(200);
    for (const token of [r.token, c.token]) {
      const a = await get('/agendamentos', token).expect(200);
      expect(a.body.find((a) => a.contratacao.id === contratoId).ativo).toBe(
        false,
      );
    }
    const p = (await get(url(c.usuarioId))).body.find(
      (p) => p.id === propostaId,
    );
    expect(p.status).toBe('ACEITA');
    expect(
      p.itens.flatMap((i) => i.contratacoes).find((c) => c.id === contratoId)
        .status,
    ).toBe('CANCELADA');
    expect(p.itens[0].preco).toBe('100.1');
  });
  it('revoga confirmação quando o vínculo do responsável com o idoso é removido', async () => {
    const p = await post(url(), {
      idosoId,
      total: '10.00',
      itens: [
        {
          cuidadorServicoId: ofertaId,
          preco: '10.00',
          duracaoMinutos: 30,
          inicios: [inicio],
        },
      ],
    }).expect(201);
    await db.responsavelIdoso.delete({
      where: { responsavelId_idosoId: { responsavelId: r.id, idosoId } },
    });
    await responder(p.body.id, 'ACEITA').expect(403);
    expect(
      (
        await db.propostaAtendimento.findUniqueOrThrow({
          where: { id: p.body.id },
        })
      ).status,
    ).toBe('PENDENTE');
  });
});
