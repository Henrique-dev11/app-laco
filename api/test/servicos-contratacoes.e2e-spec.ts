import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashToken } from '../src/auth/auth.service.js';

function cpf(numero: number) {
  let v = String(numero);
  for (let n = 9; n <= 10; n++) {
    const d =
      ([...v].reduce((s, x, i) => s + Number(x) * (n + 1 - i), 0) * 10) % 11;
    v += d === 10 ? '0' : String(d);
  }
  return v;
}
const endereco = {
  rua: 'Rua MVP',
  numero: '1',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01001000',
};
const personalizado = {
  nome: 'Leitura assistida MVP',
  descricao: 'Leitura e conversa',
  preco: 48.5,
  duracaoMinutos: 45,
};

describe('Serviços personalizados e condições preservadas na contratação', () => {
  let app: INestApplication;
  let db: PrismaService;
  let servicoId: number;
  let cuidadorId: number;
  let cuidadorToken: string;
  let responsavelToken: string;
  let responsavelId: number;
  let idosoId: number;
  let ofertaId: number;
  let contratoId: number;
  let customId: number;
  const http = () => request(app.getHttpServer());
  const base = (n: number) => ({
    perfil: 'cuidador',
    nome: 'Pessoa MVP',
    email: `mvp${n}@teste.local`,
    senha: 'TesteMVP123!',
    telefone: '11999998888',
    cpf: cpf(500000000 + n),
    dataNascimento: '1980-01-01',
    endereco,
    aceitoTermos: true,
    servicoIds: [servicoId],
    ofertas: [{ servicoId, preco: 70, duracaoMinutos: 60 }],
  });
  const cadastrar = (body: object) =>
    http()
      .post('/auth/cadastro')
      .field('dados', JSON.stringify(body))
      .attach('curriculo', Buffer.from('%PDF-1.4\n%%EOF'), 'curriculo.pdf');
  async function sessao(usuarioId: number, letra: string) {
    const token = letra.repeat(64);
    await db.sessao.create({
      data: {
        usuarioId,
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + 3600000),
      },
    });
    return token;
  }
  const solicitar = (extra: object = {}) =>
    http()
      .post('/contratacoes')
      .auth(responsavelToken, { type: 'bearer' })
      .send({ responsavelId, idosoId, cuidadorServicoId: ofertaId, ...extra });

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/laco_test_'))
      throw new Error('Use banco exclusivo de teste.');
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
    servicoId = (
      await db.servico.create({
        data: {
          nome: 'Domiciliar MVP',
          precoSugerido: 65,
          duracaoSugeridaMinutos: 60,
        },
      })
    ).id;
    const b = base(1);
    const resp = await http()
      .post('/auth/cadastro')
      .send({ ...b, perfil: 'idoso', ofertas: undefined })
      .expect(201);
    const responsavel = await db.responsavel.findUniqueOrThrow({
      where: { usuarioId: resp.body.usuario.id },
      include: { responsavelIdosos: true },
    });
    responsavelId = responsavel.id;
    idosoId = responsavel.responsavelIdosos[0].idosoId;
    responsavelToken = await sessao(resp.body.usuario.id, 'a');
  });
  afterAll(async () => {
    await app?.close();
  });

  it('oferece sugestões opcionais no catálogo', async () => {
    const r = await http().get('/servicos').expect(200);
    const s = r.body.find((s: { id: number }) => s.id === servicoId);
    expect(Number(s.precoSugerido)).toBe(65);
    expect(s.duracaoSugeridaMinutos).toBe(60);
  });
  it('exige ao menos um serviço e todas as configurações, inclusive para personalizados', async () => {
    for (const extra of [
      { servicoIds: [], ofertas: [] },
      { ofertas: [] },
      { servicosPersonalizados: [{ ...personalizado, preco: 0 }] },
      { servicosPersonalizados: [{ ...personalizado, duracaoMinutos: 0 }] },
      { servicosPersonalizados: [{ ...personalizado, nome: '  ' }] },
      {
        servicosPersonalizados: [
          personalizado,
          { ...personalizado, nome: ' LEITURA ASSISTIDA MVP ' },
        ],
      },
    ])
      await cadastrar({ ...base(2), ...extra }).expect(400);
    expect(
      await db.usuario.count({ where: { email: 'mvp2@teste.local' } }),
    ).toBe(0);
  });
  it('salva seleção padrão e personalizada na mesma transação sem poluir o catálogo', async () => {
    const r = await cadastrar({
      ...base(3),
      servicosPersonalizados: [personalizado],
    }).expect(201);
    const c = await db.cuidador.findUniqueOrThrow({
      where: { usuarioId: r.body.usuario.id },
      include: { cuidadorServicos: { include: { servico: true } } },
    });
    cuidadorId = c.id;
    cuidadorToken = await sessao(r.body.usuario.id, 'b');
    ofertaId = c.cuidadorServicos.find((o) => o.servicoId === servicoId)!.id;
    customId = c.cuidadorServicos.find((o) => !o.servico.catalogo)!.servicoId;
    expect(c.statusVerificacao).toBe('PENDENTE');
    const catalogo = await http().get('/servicos').expect(200);
    expect(catalogo.body.some((s: { id: number }) => s.id === customId)).toBe(
      false,
    );
    await http().get(`/servicos/${customId}`).expect(404);
    await db.cuidador.update({
      where: { id: cuidadorId },
      data: { statusVerificacao: 'APROVADO' },
    });
    const publico = await http().get('/catalogo/cuidadores').expect(200);
    const item = publico.body.find((c: { id: number }) => c.id === cuidadorId);
    expect(
      item.cuidadorServicos.some(
        (o: { servico: { id: number } }) => o.servico.id === customId,
      ),
    ).toBe(true);
  });
  it('aceita cadastro apenas com serviço personalizado e permite nomes iguais entre cuidadores', async () => {
    const r = await cadastrar({
      ...base(4),
      servicoIds: [],
      ofertas: [],
      servicosPersonalizados: [personalizado],
    }).expect(201);
    const c = await db.cuidador.findUniqueOrThrow({
      where: { usuarioId: r.body.usuario.id },
      include: { cuidadorServicos: true },
    });
    expect(c.cuidadorServicos).toHaveLength(1);
    expect(c.cuidadorServicos[0].servicoId).not.toBe(customId);
    const t = await sessao(r.body.usuario.id, 'c');
    await http()
      .post(`/cuidadores/${c.id}/servicos/${customId}`)
      .auth(t, { type: 'bearer' })
      .send({ preco: 50, duracaoMinutos: 30 })
      .expect(404);
    await http()
      .patch(`/cuidadores/${cuidadorId}/servicos/${servicoId}`)
      .auth(t, { type: 'bearer' })
      .send({ preco: 10 })
      .expect(403);
  });
  it('edita ofertas e adiciona personalizados pelo perfil com validação e autorização', async () => {
    const path = `/cuidadores/${cuidadorId}/servicos`;
    await http()
      .post(path)
      .auth(responsavelToken, { type: 'bearer' })
      .send(personalizado)
      .expect(403);
    await http()
      .post(path)
      .auth(cuidadorToken, { type: 'bearer' })
      .send(personalizado)
      .expect(409);
    await http()
      .post(path)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ ...personalizado, nome: 'Domiciliar MVP' })
      .expect(409);
    await http()
      .post(path)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ ...personalizado, nome: 'Passeio MVP' })
      .expect(201);
    for (const change of [
      { preco: null },
      { duracaoMinutos: null },
      { preco: 0 },
      { preco: 12.345 },
      { duracaoMinutos: 1.5 },
      { duracaoMinutos: 1441 },
    ])
      await http()
        .patch(`${path}/${servicoId}`)
        .auth(cuidadorToken, { type: 'bearer' })
        .send(change)
        .expect(400);
  });
  it('rejeita oferta desatualizada e não permite impor valor ou duração pelo cliente', async () => {
    await solicitar({ precoReferenciaEsperado: 1 }).expect(409);
    await solicitar({ duracaoEsperadaMinutos: 1 }).expect(409);
    await solicitar({ valorAcordado: 1 }).expect(400);
    await solicitar({ duracaoMinutos: 1 }).expect(400);
  });
  it('registra preço, duração, serviço e observações; alterações da oferta não mudam o contrato', async () => {
    const r = await solicitar({
      precoReferenciaEsperado: 70,
      duracaoEsperadaMinutos: 60,
      observacoes: 'Apoio na rotina',
    }).expect(201);
    contratoId = r.body.id;
    expect(r.body.status).toBe('SOLICITADA');
    expect(r.body.duracaoMinutos).toBe(60);
    expect(Number(r.body.precoReferencia)).toBe(70);
    expect(Number(r.body.valorAcordado)).toBe(70);
    expect(r.body.nomeServico).toBe('Domiciliar MVP');
    await http()
      .patch(`/cuidadores/${cuidadorId}/servicos/${servicoId}`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ preco: 99, duracaoMinutos: 90 })
      .expect(200);
    const salvo = await http()
      .get(`/contratacoes/${contratoId}`)
      .auth(responsavelToken, { type: 'bearer' })
      .expect(200);
    expect(Number(salvo.body.valorAcordado)).toBe(70);
    expect(salvo.body.duracaoMinutos).toBe(60);
    expect(salvo.body.observacoes).toBe('Apoio na rotina');
    const nova = await solicitar().expect(201);
    expect(Number(nova.body.valorAcordado)).toBe(99);
    expect(nova.body.duracaoMinutos).toBe(90);
  });
  it('preserva aceite e recusa por cuidador e agenda usando duração registrada', async () => {
    await http()
      .patch(`/contratacoes/${contratoId}/status`)
      .auth(responsavelToken, { type: 'bearer' })
      .send({ status: 'ACEITA' })
      .expect(403);
    await http()
      .patch(`/contratacoes/${contratoId}/status`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ status: 'ACEITA' })
      .expect(200);
    for (const diaSemana of [
      'DOMINGO',
      'SEGUNDA',
      'TERCA',
      'QUARTA',
      'QUINTA',
      'SEXTA',
      'SABADO',
    ])
      await http()
        .post(`/cuidadores/${cuidadorId}/disponibilidades`)
        .auth(cuidadorToken, { type: 'bearer' })
        .send({ diaSemana, horaInicio: '08:00', horaFim: '18:00' })
        .expect(201);
    const data = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const a = await http()
      .post(`/contratacoes/${contratoId}/agendamento`)
      .auth(responsavelToken, { type: 'bearer' })
      .send({ inicio: `${data}T10:00:00-03:00` })
      .expect(201);
    expect(
      new Date(a.body.fim).getTime() - new Date(a.body.inicio).getTime(),
    ).toBe(60 * 60000);
    const r = await solicitar().expect(201);
    await http()
      .patch(`/contratacoes/${r.body.id}/status`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ status: 'RECUSADA' })
      .expect(200);
    await http()
      .patch(`/contratacoes/${r.body.id}/status`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ status: 'ACEITA' })
      .expect(400);
  });
  it('contrata serviços personalizados, mas impede ofertas pausadas e idosos sem vínculo', async () => {
    const oferta = await db.cuidadorServico.findUniqueOrThrow({
      where: { cuidadorId_servicoId: { cuidadorId, servicoId: customId } },
    });
    await solicitar({ cuidadorServicoId: oferta.id }).expect(201);
    await http()
      .patch(`/cuidadores/${cuidadorId}/servicos/${customId}`)
      .auth(cuidadorToken, { type: 'bearer' })
      .send({ ativo: false })
      .expect(200);
    await solicitar({ cuidadorServicoId: oferta.id }).expect(400);
    const atual = await db.idoso.findUniqueOrThrow({ where: { id: idosoId } });
    const outro = await db.idoso.create({
      data: {
        nome: 'Idoso sem vínculo MVP',
        enderecoId: atual.enderecoId,
        dataNascimento: new Date('1940-01-01'),
      },
    });
    await solicitar({ idosoId: outro.id }).expect(400);
  });
});
