import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { vi } from 'vitest';
import { PagamentoNotificacoesService } from '../src/financeiro/pagamento-notificacoes.service.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashToken } from '../src/auth/auth.service.js';

describe('Financeiro acadêmico', () => {
  let app: INestApplication;
  let db: PrismaService;
  let responsavelId: number;
  let cuidadorId: number;
  let idosoId: number;
  let ofertaId: number;
  let usuarioResponsavelId: number, usuarioCuidadorId: number;
  let enderecoId: number, servicoId: number;
  const idsUsuarios: number[] = [];
  let r: string, c: string, a: string, terceiro: string;
  const bearer = { type: 'bearer' } as const;
  const http = () => request(app.getHttpServer());
  const post = (path: string, token: string, body = {}) =>
    http().post(path).auth(token, bearer).send(body);
  const anterior = process.env.FINANCEIRO_SIMULADO;
  const comissaoAnterior = process.env.FINANCEIRO_COMISSAO_PONTOS;
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/laco_test_'))
      throw new Error('Use banco temporário.');
    process.env.FINANCEIRO_SIMULADO = '1';
    process.env.FINANCEIRO_COMISSAO_PONTOS = '1000';
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    db = app.get(PrismaService);
    await db.$executeRaw`CREATE SCHEMA IF NOT EXISTS financeiro_test`;
    const endereco = await db.endereco.create({
      data: {
        rua: 'Rua Teste',
        numero: '1',
        cidade: 'São Paulo',
        estado: 'SP',
        bairro: 'Bairro',
        cep: '01001000',
      },
    });
    enderecoId = endereco.id;
    const pessoa = {
      enderecoId: endereco.id,
      telefone: '11900000000',
      dataNascimento: new Date('1980-01-01'),
    };
    async function conta(tipoUsuario: 'CUIDADOR' | 'RESPONSAVEL' | 'ADMIN') {
      const usuario = await db.usuario.create({
        data: {
          nome: 'Pessoa Teste',
          email: randomUUID() + '@exemplo.test',
          senhaHash: 'inutilizado',
          tipoUsuario,
        },
      });
      idsUsuarios.push(usuario.id);
      const token = randomBytes(32).toString('hex');
      await db.sessao.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          expiraEm: new Date(Date.now() + 3_600_000),
        },
      });
      return { id: usuario.id, token };
    }
    const responsavel = await conta('RESPONSAVEL');
    const cuidador = await conta('CUIDADOR');
    usuarioResponsavelId = responsavel.id;
    usuarioCuidadorId = cuidador.id;
    r = responsavel.token;
    c = cuidador.token;
    a = (await conta('ADMIN')).token;
    terceiro = (await conta('RESPONSAVEL')).token;
    responsavelId = (
      await db.responsavel.create({
        data: { ...pessoa, cpf: '77700000123', usuarioId: responsavel.id },
      })
    ).id;
    cuidadorId = (
      await db.cuidador.create({
        data: {
          ...pessoa,
          cpf: '77700000234',
          usuarioId: cuidador.id,
          statusVerificacao: 'APROVADO',
        },
      })
    ).id;
    idosoId = (
      await db.idoso.create({
        data: {
          enderecoId: endereco.id,
          nome: 'Idoso Teste',
          dataNascimento: new Date('1950-01-01'),
        },
      })
    ).id;
    await db.responsavelIdoso.create({
      data: {
        responsavelId,
        idosoId,
        parentesco: 'FILHO',
        responsavelPrincipal: true,
      },
    });
    const servico = await db.servico.create({
      data: { nome: 'Companhia em teste financeiro', catalogo: false },
    });
    servicoId = servico.id;
    ofertaId = (
      await db.cuidadorServico.create({
        data: {
          cuidadorId,
          servicoId: servico.id,
          preco: '150.00',
          duracaoMinutos: 360,
        },
      })
    ).id;
  });
  afterAll(async () => {
    if (anterior === undefined) delete process.env.FINANCEIRO_SIMULADO;
    else process.env.FINANCEIRO_SIMULADO = anterior;
    if (comissaoAnterior === undefined)
      delete process.env.FINANCEIRO_COMISSAO_PONTOS;
    else process.env.FINANCEIRO_COMISSAO_PONTOS = comissaoAnterior;
    if (db) {
      await db.$executeRaw`DROP SCHEMA IF EXISTS financeiro_test CASCADE`;
      await db.movimentoSimulado.deleteMany({ where: { cuidadorId } });
      const pagamentos = await db.pagamentoSimulado.findMany({
        where: { cuidadorId },
        select: { id: true },
      });
      await db.codigoAtendimento.deleteMany({
        where: { pagamentoId: { in: pagamentos.map((p) => p.id) } },
      });
      await db.pagamentoSimulado.deleteMany({ where: { cuidadorId } });
      await db.agendamento.deleteMany({ where: { cuidadorId } });
      await db.avaliacao.deleteMany({ where: { responsavelId } });
      await db.avaliacaoResponsavel.deleteMany({
        where: { contratacao: { responsavelId } },
      });
      await db.contratacao.deleteMany({ where: { responsavelId } });
      await db.cuidadorServico.deleteMany({ where: { id: ofertaId } });
      await db.servico.deleteMany({ where: { id: servicoId } });
      await db.responsavelIdoso.deleteMany({ where: { responsavelId } });
      await db.idoso.deleteMany({ where: { id: idosoId } });
      await db.cuidador.deleteMany({ where: { id: cuidadorId } });
      await db.responsavel.deleteMany({ where: { id: responsavelId } });
      await db.usuario.deleteMany({ where: { id: { in: idsUsuarios } } });
      await db.endereco.deleteMany({ where: { id: enderecoId } });
    }
    await app?.close();
  });

  async function aceita(dias: number) {
    const dados = {
      idosoId,
      responsavelId,
      cuidadorServicoId: ofertaId,
      reutilizarSolicitacaoPendente: true,
    };
    const [solicitada, repetida] = await Promise.all([
      post('/contratacoes', r, dados).expect(201),
      post('/contratacoes', r, dados).expect(201),
    ]);
    const id = solicitada.body.id as number;
    expect(repetida.body.id).toBe(id);
    expect(solicitada.body.financeiroSimulado).toBe(true);
    await http()
      .patch(`/contratacoes/${id}/status`)
      .auth(c, bearer)
      .send({ status: 'ACEITA' })
      .expect(200);
    const inicio = new Date(Date.now() + dias * 86400_000);
    await db.agendamento.create({
      data: {
        cuidadorId,
        contratacaoId: id,
        inicio,
        fim: new Date(inicio.getTime() + 6 * 3600_000),
      },
    });
    return { id, url: `/financeiro/visitas/${id}` };
  }

  it('retém, valida, reverte uma falha na liberação e controla saques', async () => {
    const { id, url } = await aceita(4);
    await http().get(url).auth(terceiro, bearer).expect(403);
    await post(url + '/validar', c, {
      etapa: 'INICIO',
      codigo: 'I123456',
    }).expect(409);
    await post(url + '/qr', c).expect(403);
    const qr = await post(url + '/qr', r).expect(201);
    expect(qr.body.imagem).toMatch(/^data:image\/png;base64,/);
    expect(qr.body.referencia).toMatch(/^LACO-TCC-SIMULACAO/);
    await post(url + '/pagar', r, { metodo: 'OUTRO' }).expect(400);
    const pushAnterior = process.env.EXPO_PUSH_ATIVO;
    process.env.EXPO_PUSH_ATIVO = '1';
    try {
      await http()
        .put('/financeiro/avisos/dispositivo')
        .auth(c, bearer)
        .send({ token: 'ExpoPushToken[teste-financeiro]' })
        .expect(200);
      await http()
        .put('/financeiro/avisos/dispositivo')
        .auth(c, bearer)
        .send({ token: 'ExpoPushToken[teste-financeiro]' })
        .expect(200);
    } finally {
      if (pushAnterior === undefined) delete process.env.EXPO_PUSH_ATIVO;
      else process.env.EXPO_PUSH_ATIVO = pushAnterior;
    }
    await http().get('/financeiro/avisos').auth(r, bearer).expect(403);
    const duplicados = await Promise.all([
      post(url + '/pagar', r, { metodo: 'CARTAO' }),
      post(url + '/pagar', r, { metodo: 'CARTAO' }),
    ]);
    expect(duplicados.map((x) => x.status)).toEqual([201, 201]);
    const pagamento = duplicados[0].body;
    expect(pagamento).toMatchObject({
      status: 'RETIDO',
      metodo: 'CARTAO',
      bruto: '150',
      comissao: '15',
      liquido: '135',
    });
    expect(duplicados[1].body.id).toBe(pagamento.id);
    const avisosRetencao = await http()
      .get('/financeiro/avisos')
      .auth(c, bearer)
      .expect(200);
    expect(avisosRetencao.body).toEqual([
      expect.objectContaining({
        etapa: 'RETENCAO',
        contratacaoId: id,
        lidoEm: null,
        servicos: [expect.any(String)],
      }),
    ]);
    const avisoId = avisosRetencao.body[0].id;
    await post(`/financeiro/avisos/${avisoId}/lido`, r).expect(403);
    await post(`/financeiro/avisos/${avisoId}/lido`, c).expect(201, {
      contratacaoId: id,
    });
    expect(await db.entregaPush.count({ where: { avisoId } })).toBe(1);
    expect(
      await db.movimentoSimulado.count({
        where: { pagamentoId: pagamento.id },
      }),
    ).toBe(1);
    const pendente = await http()
      .get('/financeiro/carteira')
      .auth(c, bearer)
      .expect(200);
    expect(pendente.body).toMatchObject({ pendente: '135', disponivel: '0' });
    await http()
      .patch(`/contratacoes/${id}/status`)
      .auth(c, bearer)
      .send({ status: 'CONCLUIDA', codigo: 'ABCDEF' })
      .expect(409);
    await post(url + '/codigo', c, { etapa: 'INICIO' }).expect(403);
    const primeiro = (
      await post(url + '/codigo', r, { etapa: 'INICIO' }).expect(201)
    ).body.codigo;
    await post(url + '/codigo', r, { etapa: 'INICIO' }).expect(409);
    const errado = primeiro === 'I111111' ? 'I111112' : 'I111111';
    await post(url + '/validar', c, { etapa: 'INICIO', codigo: errado }).expect(
      400,
    );
    const where = {
      pagamentoId_etapa: {
        pagamentoId: pagamento.id,
        etapa: 'INICIO' as const,
      },
    };
    expect(
      (await db.codigoAtendimento.findUniqueOrThrow({ where })).tentativas,
    ).toBe(1);
    await db.codigoAtendimento.update({
      where,
      data: { expiraEm: new Date(1000), emitidoEm: new Date(0) },
    });
    await post(url + '/validar', c, {
      etapa: 'INICIO',
      codigo: primeiro,
    }).expect(400);
    const inicio = (
      await post(url + '/codigo', r, { etapa: 'INICIO' }).expect(201)
    ).body.codigo;
    await post(url + '/validar', c, { etapa: 'INICIO', codigo: inicio }).expect(
      201,
    );
    await post(url + '/validar', c, { etapa: 'INICIO', codigo: inicio }).expect(
      409,
    );
    await post(url + '/codigo', r, { etapa: 'FIM' }).expect(409);
    await post(url + '/acao', c, { acao: 'FINALIZAR' }).expect(201);
    const fim = (await post(url + '/codigo', r, { etapa: 'FIM' }).expect(201))
      .body.codigo;
    expect(fim).not.toBe(inicio);
    // Injeta uma falha real na escrita do crédito, exclusivamente no banco temporário.
    await db.$executeRawUnsafe(
      "CREATE FUNCTION financeiro_test.falhar_credito() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tipo = 'LIBERACAO' THEN RAISE EXCEPTION 'falha de teste'; END IF; RETURN NEW; END $$",
    );
    await db.$executeRaw`CREATE TRIGGER falha_credito BEFORE INSERT ON "MovimentoSimulado" FOR EACH ROW EXECUTE FUNCTION financeiro_test.falhar_credito()`;
    try {
      await post(url + '/validar', c, { etapa: 'FIM', codigo: fim }).expect(
        500,
      );
      expect(
        (
          await db.pagamentoSimulado.findUniqueOrThrow({
            where: { id: pagamento.id },
          })
        ).status,
      ).toBe('RETIDO');
      expect(
        (await db.contratacao.findUniqueOrThrow({ where: { id } })).status,
      ).toBe('ACEITA');
      expect(
        (
          await db.codigoAtendimento.findFirstOrThrow({
            where: { pagamentoId: pagamento.id, etapa: 'FIM' },
          })
        ).usadoEm,
      ).toBeNull();
    } finally {
      await db.$executeRaw`DROP TRIGGER falha_credito ON "MovimentoSimulado"`;
    }
    const encerrada = await post(url + '/validar', c, {
      etapa: 'FIM',
      codigo: fim,
    }).expect(201);
    expect(encerrada.body).toMatchObject({
      etapa: 'CONCLUIDO',
      pagamento: { status: 'LIBERADO' },
    });
    await post(url + '/validar', c, { etapa: 'FIM', codigo: fim }).expect(409);
    const avisos = await http()
      .get('/financeiro/avisos')
      .auth(c, bearer)
      .expect(200);
    expect(avisos.body).toEqual([
      expect.objectContaining({
        etapa: 'LIBERACAO',
        contratacaoId: id,
        lidoEm: null,
      }),
      expect.objectContaining({
        etapa: 'RETENCAO',
        contratacaoId: id,
        lidoEm: expect.any(String),
      }),
    ]);
    const envio = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Rede indisponível'))
      .mockResolvedValueOnce(
        Response.json({ data: [{ status: 'ok', id: 'ticket-1' }] }),
      );
    try {
      const worker = app.get(PagamentoNotificacoesService);
      await worker['processar']();
      expect(envio).toHaveBeenCalledTimes(2);
      for (const [, requisicao] of envio.mock.calls) {
        const [mensagem] = JSON.parse(String(requisicao?.body));
        expect(mensagem).toMatchObject({
          to: 'ExpoPushToken[teste-financeiro]',
          channelId: 'pagamentos',
          data: { tipo: 'pagamento', avisoId: expect.any(Number) },
        });
        expect(Object.keys(mensagem.data).sort()).toEqual(['avisoId', 'tipo']);
      }
      const entregas = await db.entregaPush.findMany({
        where: { aviso: { pagamentoId: pagamento.id } },
      });
      expect(entregas).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tentativas: 1,
            encerrada: false,
            ticket: null,
          }),
          expect.objectContaining({
            tentativas: 0,
            encerrada: false,
            ticket: 'ticket-1',
          }),
        ]),
      );
      const comTicket = entregas.find((entrega) => entrega.ticket !== null)!;
      await db.entregaPush.update({
        where: { id: comTicket.id },
        data: { proximaEm: new Date(0) },
      });
      envio.mockResolvedValueOnce(
        Response.json({
          data: {
            'ticket-1': {
              status: 'error',
              details: { error: 'DeviceNotRegistered' },
            },
          },
        }),
      );
      await worker['processar']();
      expect(envio.mock.calls[2][0]).toMatch(/getReceipts$/);
      await http()
        .get('/financeiro/avisos/dispositivo')
        .auth(c, bearer)
        .expect(200, { ativo: false });
      expect(
        await db.avisoPagamento.count({ where: { pagamentoId: pagamento.id } }),
      ).toBe(2);
    } finally {
      envio.mockRestore();
    }
    await http()
      .delete('/financeiro/avisos/dispositivo')
      .auth(c, bearer)
      .expect(200, { ativo: false });
    await post(`/contratacoes/${id}/avaliacao`, r, { nota: 5 }).expect(201);
    const porAvaliar = await http().get(url).auth(c, bearer).expect(200);
    expect(porAvaliar.body.avaliacao).toBeNull();
    expect(porAvaliar.body.avaliadoNome).toBeTruthy();
    await post(`/contratacoes/${id}/avaliacao`, c, { nota: 4 }).expect(201);
    await post(`/contratacoes/${id}/avaliacao`, c, { nota: 3 }).expect(409);
    const avaliada = await http().get(url).auth(c, bearer).expect(200);
    expect(avaliada.body.avaliacao).toEqual({ nota: 4 });
    const sacar = '/financeiro/carteira/saques';
    await post(sacar, c, { valor: '135.01', referencia: randomUUID() }).expect(
      409,
    );
    const dados = { valor: '35.00', referencia: randomUUID(), metodo: 'OUTRO' };
    const retirada = await post(sacar, c, dados).expect(201);
    expect(retirada.body.metodo).toBe('OUTRO');
    await post(sacar, c, dados).expect(201);
    await post(sacar, c, { ...dados, metodo: 'PIX' }).expect(409);
    const carteira = await http()
      .get('/financeiro/carteira')
      .auth(c, bearer)
      .expect(200);
    expect(carteira.body).toMatchObject({
      disponivel: '100',
      sacado: '35',
      recebido: '135',
    });
  });

  it('expõe perfis com campos mínimos e só mostra os idosos da relação autorizada', async () => {
    const sessao = await http().get('/auth/me').auth(r, bearer).expect(200);
    expect(Date.parse(sessao.body.sessaoExpiraEm)).toBeGreaterThan(Date.now());
    await http().get('/perfis/me').expect(401);
    const meu = await http().get('/perfis/me').auth(c, bearer).expect(200);
    expect(meu.body.usuario).toMatchObject({ id: usuarioCuidadorId });
    expect(meu.body.usuario).not.toHaveProperty('email');
    const outroIdoso = await db.idoso.create({
      data: {
        enderecoId,
        nome: 'Pessoa que deve permanecer privada',
        dataNascimento: new Date('1955-01-01'),
      },
    });
    try {
      await db.responsavelIdoso.create({
        data: {
          responsavelId,
          idosoId: outroIdoso.id,
          parentesco: 'FILHO',
          responsavelPrincipal: true,
        },
      });
      const proprio = await http()
        .get('/perfis/me')
        .auth(r, bearer)
        .expect(200);
      expect(proprio.body.idosos).toEqual(
        expect.arrayContaining([
          { primeiroNome: 'Idoso', faixaEtaria: expect.any(String) },
          { primeiroNome: 'Pessoa', faixaEtaria: expect.any(String) },
        ]),
      );
      expect(proprio.body.usuario).not.toHaveProperty('email');
      const avaliacoes = await http()
        .get('/catalogo/cuidadores/' + cuidadorId + '/avaliacoes')
        .expect(200);
      expect(avaliacoes.body.avaliacoes).toEqual([
        expect.objectContaining({
          nota: 5,
          autor: expect.any(String),
          createdAt: expect.any(String),
        }),
      ]);
      const privada = '/perfis/responsaveis/' + usuarioResponsavelId;
      await http().get(privada).expect(401);
      await http().get(privada).auth(terceiro, bearer).expect(403);
      const perfil = await http().get(privada).auth(c, bearer).expect(200);
      expect(perfil.body.idosos).toEqual([
        { primeiroNome: 'Idoso', faixaEtaria: expect.any(String) },
      ]);
      expect(Object.keys(perfil.body.usuario).sort()).toEqual([
        'foto',
        'id',
        'nome',
        'nomeSocial',
      ]);
      expect(Object.keys(perfil.body.avaliacoes).sort()).toEqual([
        'media',
        'total',
      ]);
      expect(perfil.body.desempenho).toHaveLength(6);
      const publico = await http()
        .get('/perfis/cuidadores/' + usuarioCuidadorId)
        .expect(200);
      expect(publico.body.desempenho).toHaveLength(6);
      expect(
        publico.body.desempenho.reduce((total, item) => total + item.total, 0),
      ).toBe(1);
      expect(publico.body).not.toHaveProperty('endereco');
      expect(publico.body.usuario).not.toHaveProperty('email');
    } finally {
      await db.responsavelIdoso.deleteMany({
        where: { idosoId: outroIdoso.id },
      });
      await db.idoso.delete({ where: { id: outroIdoso.id } });
    }
  });

  it('retorna série diária de créditos com zeros e valida os filtros da carteira', async () => {
    for (const dias of [7, 30, 90]) {
      const resultado = await http()
        .get('/financeiro/carteira?dias=' + dias)
        .auth(c, bearer)
        .expect(200);
      expect(resultado.body.liberacoes).toHaveLength(dias);
      expect(resultado.body.liberacoes.map((item) => item.valor)).toEqual([
        ...Array(dias - 1).fill('0.00'),
        '135.00',
      ]);
    }
    await http().get('/financeiro/carteira?dias=2').auth(c, bearer).expect(400);
  });

  it('reembolsa cancelamento, congela contestação e registra a resolução do administrador', async () => {
    const primeira = await aceita(5);
    await post(primeira.url + '/pagar', r).expect(201);
    const cancelada = await post(primeira.url + '/acao', r, {
      acao: 'CANCELAR',
    }).expect(201);
    expect(cancelada.body).toMatchObject({
      etapa: 'CANCELADO',
      pagamento: { status: 'REEMBOLSADO' },
    });
    const segunda = await aceita(6);
    await post(segunda.url + '/pagar', r).expect(201);
    await post(segunda.url + '/acao', c, {
      acao: 'CONTESTAR',
      motivo: 'Responsável indisponível',
    }).expect(201);
    await post(segunda.url + '/codigo', r, { etapa: 'INICIO' }).expect(409);
    const resolver = '/financeiro/admin/visitas/' + segunda.id + '/resolver';
    await post(resolver, c, {
      acao: 'LIBERAR',
      motivo: 'Tentativa indevida',
    }).expect(403);
    await post(resolver, a, { acao: 'LIBERAR', motivo: ' ' }).expect(400);
    const resolvida = await post(resolver, a, {
      acao: 'LIBERAR',
      motivo: 'Resolução acadêmica auditada',
    }).expect(201);
    expect(resolvida.body.pagamento).toMatchObject({
      status: 'LIBERADO',
      motivoResolucao: 'Resolução acadêmica auditada',
      resolvidoPorId: expect.any(Number),
    });
    await post(resolver, a, {
      acao: 'LIBERAR',
      motivo: 'Tentativa duplicada',
    }).expect(409);
  });
});
