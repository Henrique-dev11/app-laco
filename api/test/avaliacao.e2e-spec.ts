import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

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
const senha = 'TesteSeguro123!';
const bearer = { type: 'bearer' } as const;

describe('Avaliação de atendimentos', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenResp: string;
  let tokenOutro: string;
  let tokenCuidador: string;
  let cuidadorId: number;
  let contratoA: number;
  let contratoB: number;
  let ofertaId: number;
  let responsavelId: number;
  let idosoId: number;
  let enderecoId: number;

  const http = () => request(app.getHttpServer());
  const login = async (email: string) =>
    (await http().post('/auth/login').send({ email, senha }).expect(200)).body
      .token as string;

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

    const hash = await bcrypt.hash(senha, 4);
    const endereco = await prisma.endereco.create({
      data: { rua: 'Rua A', numero: '1', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP', cep: '01001000' },
    });
    enderecoId = endereco.id;
    const servico = await prisma.servico.create({ data: { nome: 'Companhia Avaliação' } });
    const novoResponsavel = async (n: number, nome: string) =>
      prisma.responsavel.create({
        data: {
          telefone: '11988887777',
          cpf: cpf(String(300000000 + n)),
          dataNascimento: new Date('1980-05-20'),
          endereco: { connect: { id: endereco.id } },
          usuario: {
            create: { nome, email: `resp${n}@teste.local`, senhaHash: hash, tipoUsuario: 'RESPONSAVEL' },
          },
        },
      });
    const resp = await novoResponsavel(1, 'Maria Aparecida Souza');
    await novoResponsavel(2, 'Outra Pessoa');
    responsavelId = resp.id;
    const idoso = await prisma.idoso.create({
      data: { nome: 'Idoso', dataNascimento: new Date('1945-08-10'), enderecoId: endereco.id },
    });
    idosoId = idoso.id;
    await prisma.responsavelIdoso.create({
      data: { responsavelId, idosoId, parentesco: 'FILHA', responsavelPrincipal: true },
    });
    const cuidador = await prisma.cuidador.create({
      data: {
        telefone: '11977776666',
        cpf: cpf('400000001'),
        dataNascimento: new Date('1985-01-01'),
        endereco: { connect: { id: endereco.id } },
        statusVerificacao: 'APROVADO',
        usuario: {
          create: { nome: 'Carla Cuidadora', email: 'carla@teste.local', senhaHash: hash, tipoUsuario: 'CUIDADOR' },
        },
      },
    });
    cuidadorId = cuidador.id;
    ofertaId = (
      await prisma.cuidadorServico.create({
        data: { cuidadorId, servicoId: servico.id, preco: 35, duracaoMinutos: 60 },
      })
    ).id;
    const contrato = () =>
      prisma.contratacao.create({
        data: { responsavelId, idosoId, cuidadorServicoId: ofertaId, valorAcordado: 35, precoReferencia: 35, duracaoMinutos: 60, nomeServico: 'Companhia Avaliação', status: 'ACEITA' },
      });
    contratoA = (await contrato()).id;
    contratoB = (await contrato()).id;

    tokenResp = await login('resp1@teste.local');
    tokenOutro = await login('resp2@teste.local');
    tokenCuidador = await login('carla@teste.local');
  });

  // O banco é compartilhado com os outros e2e: remove o que este arquivo criou.
  afterAll(async () => {
    const emails = ['resp1@teste.local', 'resp2@teste.local', 'carla@teste.local'];
    const usuarios = await prisma.usuario.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const usuarioIds = usuarios.map((u) => u.id);
    await prisma.avaliacao.deleteMany({ where: { cuidadorId } });
    await prisma.contratacao.deleteMany({ where: { responsavelId } });
    await prisma.cuidadorServico.deleteMany({ where: { cuidadorId } });
    await prisma.responsavelIdoso.deleteMany({ where: { responsavelId } });
    await prisma.sessao.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.cuidador.deleteMany({ where: { id: cuidadorId } });
    await prisma.responsavel.deleteMany({ where: { usuarioId: { in: usuarioIds } } });
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
    await prisma.idoso.deleteMany({ where: { id: idosoId } });
    await prisma.servico.deleteMany({ where: { nome: 'Companhia Avaliação' } });
    await prisma.endereco.deleteMany({ where: { id: enderecoId } });
    await app?.close();
  });

  it('não avalia atendimento que ainda não foi concluído', async () => {
    await http()
      .post(`/contratacoes/${contratoA}/avaliacao`)
      .auth(tokenResp, bearer)
      .send({ nota: 5 })
      .expect(400);
    await prisma.contratacao.updateMany({
      where: { id: { in: [contratoA, contratoB] } },
      data: { status: 'CONCLUIDA' },
    });
  });

  it('exige login e que seja o responsável da contratação', async () => {
    const url = `/contratacoes/${contratoA}/avaliacao`;
    await http().post(url).send({ nota: 5 }).expect(401);
    await http().post(url).auth(tokenCuidador, bearer).send({ nota: 5 }).expect(403);
    await http().post(url).auth(tokenOutro, bearer).send({ nota: 5 }).expect(403);
    expect(await prisma.avaliacao.count()).toBe(0);
  });

  it('recusa nota inválida e campos inesperados', async () => {
    const url = `/contratacoes/${contratoA}/avaliacao`;
    for (const corpo of [
      { nota: 0 }, { nota: 6 }, { nota: 4.5 }, { nota: '5' }, {},
      { nota: 5, comentario: 'a'.repeat(1001) },
      { nota: 5, cuidadorId: 999 },
    ])
      await http().post(url).auth(tokenResp, bearer).send(corpo).expect(400);
    await http()
      .post('/contratacoes/99999/avaliacao')
      .auth(tokenResp, bearer)
      .send({ nota: 5 })
      .expect(404);
  });

  it('responsável avalia, uma única vez, e a avaliação aparece na contratação', async () => {
    const url = `/contratacoes/${contratoA}/avaliacao`;
    const criada = await http()
      .post(url)
      .auth(tokenResp, bearer)
      .send({ nota: 5, comentario: '  Muito atenciosa!  ' })
      .expect(201);
    expect(criada.body).toMatchObject({ contratacaoId: contratoA, nota: 5, comentario: 'Muito atenciosa!' });
    const gravada = await prisma.avaliacao.findUniqueOrThrow({ where: { contratacaoId: contratoA } });
    expect(gravada.cuidadorId).toBe(cuidadorId);
    expect(gravada.responsavelId).toBe(responsavelId);

    await http().post(url).auth(tokenResp, bearer).send({ nota: 1 }).expect(409);

    const contrato = await http().get(`/contratacoes/${contratoA}`).auth(tokenResp, bearer).expect(200);
    expect(contrato.body.avaliacao).toMatchObject({ nota: 5 });
  });

  it('duas requisições simultâneas gravam só uma avaliação', async () => {
    const url = `/contratacoes/${contratoB}/avaliacao`;
    const respostas = await Promise.all([
      http().post(url).auth(tokenResp, bearer).send({ nota: 3 }),
      http().post(url).auth(tokenResp, bearer).send({ nota: 3 }),
    ]);
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.avaliacao.count({ where: { contratacaoId: contratoB } })).toBe(1);
  });

  it('lista pública mostra média, total e só o primeiro nome do autor', async () => {
    const res = await http().get(`/catalogo/cuidadores/${cuidadorId}/avaliacoes`).expect(200);
    expect(res.body.media).toBe(4);
    expect(res.body.total).toBe(2);
    expect(res.body.avaliacoes.map((a: any) => a.autor)).toEqual(['Maria', 'Maria']);
    expect(JSON.stringify(res.body)).not.toMatch(/Souza|@teste\.local|responsavelId|cpf/i);
  });

  it('catálogo traz média e total de avaliações de cada cuidador', async () => {
    const res = await http().get('/catalogo/cuidadores').expect(200);
    const carla = res.body.find((c: any) => c.id === cuidadorId);
    expect(carla).toMatchObject({ avaliacaoMedia: 4, totalAvaliacoes: 2 });
  });

  it('cuidador não aprovado ou inexistente não tem lista pública', async () => {
    await http().get('/catalogo/cuidadores/99999/avaliacoes').expect(404);
    await prisma.cuidador.update({ where: { id: cuidadorId }, data: { statusVerificacao: 'PENDENTE' } });
    await http().get(`/catalogo/cuidadores/${cuidadorId}/avaliacoes`).expect(404);
    await prisma.cuidador.update({ where: { id: cuidadorId }, data: { statusVerificacao: 'APROVADO' } });
  });

  it('o banco recusa nota fora de 1 a 5 mesmo sem passar pela API', async () => {
    const contrato = await prisma.contratacao.create({
      data: { responsavelId, idosoId, cuidadorServicoId: ofertaId, valorAcordado: 35, precoReferencia: 35, duracaoMinutos: 60, nomeServico: 'Companhia Avaliação', status: 'CONCLUIDA' },
    });
    await expect(
      prisma.avaliacao.create({
        data: { contratacaoId: contrato.id, responsavelId, cuidadorId, nota: 9 },
      }),
    ).rejects.toThrow();
  });
});
