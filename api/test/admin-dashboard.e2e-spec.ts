import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashToken } from '../src/auth/auth.service.js';

describe('Dashboard administrativa: dados reais, paginação e relatórios', () => {
  let app: INestApplication, db: PrismaService;
  let adminToken: string,
    comumToken: string,
    cuidadorId: number,
    pendenteId: number,
    responsavelId: number,
    autocuidadoId: number,
    idosoId: number,
    independenteId: number,
    orfaoId: number,
    ofertaId: number,
    servicoId: number;
  const usuarios: number[] = [],
    enderecos: number[] = [],
    contratos: number[] = [];
  const http = () => request(app.getHttpServer());
  const get = (url: string, t = adminToken) =>
    http().get(url).auth(t, { type: 'bearer' });
  const periodo = 'inicio=2027-02-01&fim=2027-02-03';
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/laco_test_'))
      throw new Error('Use banco exclusivo de testes.');
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
    async function conta(
      n: number,
      tipoUsuario: 'ADMIN' | 'CUIDADOR' | 'RESPONSAVEL',
      status: 'ATIVO' | 'BLOQUEADO' = 'ATIVO',
    ) {
      const usuario = await db.usuario.create({
        data: {
          nome: `Admin Gestão ${n}`,
          email: `admin-gestao-${n}@teste.local`,
          senhaHash: 'privado',
          tipoUsuario,
          status,
        },
      });
      usuarios.push(usuario.id);
      const token = randomBytes(32).toString('hex');
      await db.sessao.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          expiraEm: new Date(Date.now() + 3600000),
        },
      });
      if (tipoUsuario === 'ADMIN') return { id: usuario.id, token };
      const endereco = await db.endereco.create({
        data: {
          rua: 'Rua Gestão',
          numero: '1',
          bairro: 'Centro',
          cidade: 'São Paulo',
          estado: 'SP',
          cep: '01001000',
        },
      });
      enderecos.push(endereco.id);
      const data = {
        usuarioId: usuario.id,
        enderecoId: endereco.id,
        telefone: '11988887777',
        cpf: `8111111111${n}`,
        dataNascimento: new Date('1980-01-01'),
        createdAt: new Date('2027-02-01T03:00:00Z'),
      };
      const perfil =
        tipoUsuario === 'CUIDADOR'
          ? await db.cuidador.create({
              data: {
                ...data,
                statusVerificacao: n === 2 ? 'APROVADO' : 'PENDENTE',
              },
            })
          : await db.responsavel.create({ data });
      return { id: perfil.id, token };
    }
    adminToken = (await conta(1, 'ADMIN')).token;
    cuidadorId = (await conta(2, 'CUIDADOR')).id;
    pendenteId = (await conta(3, 'CUIDADOR', 'BLOQUEADO')).id;
    const r = await conta(4, 'RESPONSAVEL');
    responsavelId = r.id;
    comumToken = r.token;
    autocuidadoId = (await conta(5, 'RESPONSAVEL', 'BLOQUEADO')).id;
    async function criarIdoso(nome: string) {
      return (
        await db.idoso.create({
          data: {
            nome,
            enderecoId: enderecos[0],
            dataNascimento: new Date('1940-01-01'),
          },
        })
      ).id;
    }
    idosoId = await criarIdoso('Idoso Gestão Vinculado');
    independenteId = await criarIdoso('Idoso Gestão Autocuidado');
    orfaoId = await criarIdoso('Idoso Gestão Sem vínculo');
    await db.responsavelIdoso.createMany({
      data: [
        { responsavelId, idosoId, parentesco: 'FILHO' },
        {
          responsavelId: autocuidadoId,
          idosoId: independenteId,
          parentesco: 'PROPRIO',
        },
      ],
    });
    servicoId = (
      await db.servico.create({
        data: { nome: 'Serviço Gestão Administrativa' },
      })
    ).id;
    ofertaId = (
      await db.cuidadorServico.create({
        data: { cuidadorId, servicoId, preco: '10.10', duracaoMinutos: 60 },
      })
    ).id;
    const registros = [
      ['SOLICITADA', '10.10', '2027-02-01T03:00:00Z'],
      ['ACEITA', '100.10', '2027-02-02T02:59:59Z'],
      ['CONCLUIDA', '20.20', '2027-02-02T03:00:00Z'],
      ['CANCELADA', '30.30', '2027-02-03T03:00:00Z'],
      ['RECUSADA', '40.40', '2027-02-04T02:59:59Z'],
      ['ACEITA', '999.99', '2027-02-01T02:59:59Z'],
      ['ACEITA', '999.99', '2027-02-04T03:00:00Z'],
    ] as const;
    for (const [status, valor, createdAt] of registros) {
      const c = await db.contratacao.create({
        data: {
          responsavelId,
          idosoId,
          cuidadorServicoId: ofertaId,
          nomeServico: 'Serviço Gestão Administrativa',
          precoReferencia: '10.10',
          valorAcordado: valor,
          duracaoMinutos: 60,
          status,
          createdAt: new Date(createdAt),
        },
      });
      contratos.push(c.id);
    }
  });
  afterAll(async () => {
    try {
      if (db) {
        await db.contratacao.deleteMany({ where: { id: { in: contratos } } });
        if (ofertaId)
          await db.cuidadorServico.delete({ where: { id: ofertaId } });
        if (servicoId) await db.servico.delete({ where: { id: servicoId } });
        await db.responsavelIdoso.deleteMany({
          where: {
            idosoId: { in: [idosoId, independenteId, orfaoId].filter(Boolean) },
          },
        });
        await db.idoso.deleteMany({
          where: {
            id: { in: [idosoId, independenteId, orfaoId].filter(Boolean) },
          },
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
  it('protege todos os endpoints administrativos contra visitantes e usuários comuns', async () => {
    for (const path of [
      '/admin/resumo',
      '/admin/usuarios/cuidadores',
      '/admin/usuarios/responsaveis',
      '/admin/usuarios/idosos',
      '/admin/usuarios/independentes',
      `/admin/usuarios/cuidadores/${cuidadorId}`,
      '/admin/contratacoes',
      `/admin/contratacoes/${contratos[0]}`,
      '/admin/relatorios',
    ]) {
      await http().get(path).expect(401);
      await get(path, comumToken).expect(403);
    }
  });
  it('retorna contagens reais e trata autocuidado como subconjunto dos idosos', async () => {
    const r = await get('/admin/resumo').expect(200);
    expect(r.body.cuidadores).toBe(await db.cuidador.count());
    expect(r.body.responsaveis).toBe(await db.responsavel.count());
    expect(r.body.idosos).toBe(await db.idoso.count());
    expect(r.body.independentes).toBe(
      await db.idoso.count({
        where: { responsavelIdosos: { some: { parentesco: 'PROPRIO' } } },
      }),
    );
    expect(r.body.contratacoes).toBe(await db.contratacao.count());
    expect(r.body.porStatus.ACEITA).toBe(
      await db.contratacao.count({ where: { status: 'ACEITA' } }),
    );
    expect(r.body.classificacaoIndependentes).toContain('PROPRIO');
  });
  it('pesquisa nomes, pagina de forma estável e combina verificação com situação', async () => {
    const a = await get(
      '/admin/usuarios/cuidadores?busca=admin%20gest%C3%A3o&limite=1&pagina=1',
    ).expect(200);
    const b = await get(
      '/admin/usuarios/cuidadores?busca=admin%20gest%C3%A3o&limite=1&pagina=2',
    ).expect(200);
    expect(a.body.total).toBe(2);
    expect(a.body.paginas).toBe(2);
    expect(a.body.dados).toHaveLength(1);
    expect(a.body.dados[0].id).not.toBe(b.body.dados[0].id);
    const filtro = await get(
      '/admin/usuarios/cuidadores?busca=Admin%20Gest%C3%A3o&verificacao=PENDENTE&situacao=BLOQUEADO',
    ).expect(200);
    expect(filtro.body.dados.map((c) => c.id)).toEqual([pendenteId]);
    const json = JSON.stringify(a.body);
    expect(json).not.toContain('senhaHash');
    expect(json).not.toContain('cpf');
    expect(json).not.toContain('dataNascimento');
    expect(
      (await get('/admin/usuarios/cuidadores?busca=nome-que-nao-existe')).body
        .total,
    ).toBe(0);
  });
  it('carrega responsáveis, idosos e independentes com vínculos e detalhes corretos', async () => {
    const r = await get(
      '/admin/usuarios/responsaveis?busca=Admin%20Gest%C3%A3o&vinculo=COM_VINCULO',
    ).expect(200);
    expect(r.body.dados).toHaveLength(2);
    expect(r.body.dados.every((r) => r._count.responsavelIdosos === 1)).toBe(
      true,
    );
    const i = await get(
      '/admin/usuarios/idosos?busca=Idoso%20Gest%C3%A3o&vinculo=SEM_VINCULO',
    ).expect(200);
    expect(i.body.dados.map((i) => i.id)).toEqual([orfaoId]);
    const self = await get(
      '/admin/usuarios/independentes?busca=Idoso%20Gest%C3%A3o&situacao=BLOQUEADO',
    ).expect(200);
    expect(self.body.dados.map((i) => i.id)).toEqual([independenteId]);
    expect(
      (
        await get(
          '/admin/usuarios/independentes?busca=Idoso%20Gest%C3%A3o&situacao=ATIVO',
        )
      ).body.total,
    ).toBe(0);
    const detalhe = await get(
      `/admin/usuarios/responsaveis/${responsavelId}`,
    ).expect(200);
    expect(detalhe.body.responsavelIdosos[0].idoso.id).toBe(idosoId);
    const idoso = await get(`/admin/usuarios/idosos/${idosoId}`).expect(200);
    expect(idoso.body.responsavelIdosos[0].responsavel.id).toBe(responsavelId);
    expect(JSON.stringify(idoso.body)).not.toContain('necessidadesEspeciais');
    await get(`/admin/usuarios/independentes/${idosoId}`).expect(404);
    await get('/admin/usuarios/cuidadores/999999').expect(404);
  });
  it('calcula centavos, status e limites inclusivos de datas no fuso de São Paulo', async () => {
    const r = await get(`/admin/relatorios?${periodo}&agrupamento=dia`).expect(
      200,
    );
    expect(r.body.indicadores).toEqual({
      valorTotalRegistrado: '201.10',
      valorContratado: '120.30',
      valorConcluido: '20.20',
      valorAceito: '100.10',
      quantidade: 5,
      ticketMedioConcluido: '20.20',
    });
    expect(r.body.serie.map((p) => p.quantidade)).toEqual([2, 1, 2]);
    expect(r.body.serie.map((p) => Number(p.valor))).toEqual([100.1, 20.2, 0]);
    expect(r.body.porStatus.every((s) => s.quantidade === 1)).toBe(true);
    expect(r.body.mensal[0].quantidade).toBe(5);
    expect(r.body.baseTemporal).toContain('Sem confirmação de pagamento');
    expect(r.body.servicos.find((s) => s.servicoId === servicoId).valor).toBe(
      '120.30',
    );
    expect(
      r.body.servicos.find((s) => s.servicoId === servicoId).quantidade,
    ).toBe(2);
    expect(
      r.body.servicos.find((s) => s.servicoId === servicoId).solicitacoes,
    ).toBe(5);
    const crescimento = r.body.crescimento.reduce(
      (n, d) => n + d.cuidadores + d.responsaveis,
      0,
    );
    expect(crescimento).toBe(4);
  });
  it('agrupa por semana, mês e ano e preenche períodos sem movimentação', async () => {
    for (const agrupamento of ['semana', 'mes', 'ano']) {
      const r = await get(
        `/admin/relatorios?${periodo}&agrupamento=${agrupamento}`,
      ).expect(200);
      expect(r.body.serie).toHaveLength(1);
      expect(r.body.serie[0].quantidade).toBe(5);
      expect(Number(r.body.serie[0].valor)).toBe(120.3);
    }
    const vazio = await get(
      '/admin/relatorios?inicio=2010-01-01&fim=2010-01-03',
    ).expect(200);
    expect(vazio.body.serie).toHaveLength(3);
    expect(
      vazio.body.serie.every(
        (d) => d.quantidade === 0 && Number(d.valor) === 0,
      ),
    ).toBe(true);
    expect(vazio.body.indicadores.ticketMedioConcluido).toBe('0.00');
    expect(vazio.body.servicos).toEqual([]);
  });
  it('filtra contratações no backend e não expõe dados de autenticação ou conclusão', async () => {
    const c = await get(
      `/admin/contratacoes?${periodo}&status=CONCLUIDA&busca=Gest%C3%A3o&limite=1`,
    ).expect(200);
    expect(c.body.total).toBe(1);
    expect(c.body.dados[0].id).toBe(contratos[2]);
    const detalhe = await get(`/admin/contratacoes/${contratos[2]}`).expect(
      200,
    );
    expect(detalhe.body.valorAcordado).toBe('20.2');
    for (const campo of [
      'senhaHash',
      'codigoConclusaoHash',
      'tentativasCodigo',
      'tokenHash',
    ])
      expect(JSON.stringify(detalhe.body)).not.toContain(campo);
  });
  it('valida consultas e preserva aprovação, bloqueio e atualização dos dados', async () => {
    for (const query of [
      'pagina=0',
      'limite=1000',
      'situacao=INVALIDO',
      'verificacao=ADMIN',
      'busca=' + 'x'.repeat(101),
    ])
      await get('/admin/usuarios/cuidadores?' + query).expect(400);
    for (const query of [
      'inicio=2027-02-30',
      'inicio=2027-03-01&fim=2027-02-01',
      'inicio=2010-01-01&fim=2027-01-01',
      'agrupamento=hour',
    ])
      await get('/admin/relatorios?' + query).expect(400);
    await get('/admin/usuarios/qualquer').expect(400);
    await http()
      .patch(`/admin/cuidadores/${pendenteId}/verificacao`)
      .auth(adminToken, { type: 'bearer' })
      .send({ statusVerificacao: 'APROVADO' })
      .expect(200);
    const detalhe = await get(
      `/admin/usuarios/cuidadores/${pendenteId}`,
    ).expect(200);
    expect(detalhe.body.statusVerificacao).toBe('APROVADO');
    expect(detalhe.body.usuario.status).toBe('ATIVO');
    await http()
      .patch(`/admin/cuidadores/${pendenteId}/conta`)
      .auth(adminToken, { type: 'bearer' })
      .send({ status: 'BLOQUEADO' })
      .expect(200);
    expect(
      (await get(`/admin/usuarios/cuidadores/${pendenteId}`)).body.usuario
        .status,
    ).toBe('BLOQUEADO');
  });
});
