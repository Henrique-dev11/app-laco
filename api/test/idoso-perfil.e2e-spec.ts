import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashToken } from '../src/auth/auth.service.js';

function cpf(base: string) {
  let valor = base;
  for (let tamanho = 9; tamanho <= 10; tamanho++) {
    const soma = [...valor].reduce(
      (total, digito, i) => total + Number(digito) * (tamanho + 1 - i),
      0,
    );
    const verificador = (soma * 10) % 11;
    valor += String(verificador === 10 ? 0 : verificador);
  }
  return valor;
}
const cpfs = ['810000001', '810000002', '810000003', '810000004'].map(cpf);

const endereco = {
  rua: 'Rua do Idoso',
  numero: '20',
  complemento: 'Casa',
  bairro: 'Centro',
  cidade: 'Recife',
  estado: 'PE',
  cep: '50000000',
};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

describe('Perfil e foto do idoso', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let responsavel: { id: number; perfilId: number; token: string };
  let outro: typeof responsavel;
  let proprio: typeof responsavel;
  let idosoId: number;
  let proprioId: number;
  const http = () => request(app.getHttpServer());
  const me = async (token: string) =>
    (await http().get('/auth/me').auth(token, { type: 'bearer' }).expect(200))
      .body;
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
    async function criar(numero: number, cpf: string) {
      const usuario = await prisma.usuario.create({
        data: {
          nome: `Pessoa ${numero}`,
          email: `idoso-perfil-${numero}@teste.local`,
          senhaHash: 'teste-sem-login',
          tipoUsuario: 'RESPONSAVEL',
          responsavel: {
            create: {
              cpf,
              telefone: '81999998888',
              dataNascimento: new Date('1950-05-20'),
              endereco: { create: endereco },
            },
          },
        },
        include: { responsavel: true },
      });
      const token = randomBytes(32).toString('hex');
      await prisma.sessao.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          expiraEm: new Date(Date.now() + 3600_000),
        },
      });
      return { id: usuario.id, perfilId: usuario.responsavel!.id, token };
    }
    responsavel = await criar(0, cpfs[0]);
    outro = await criar(1, cpfs[1]);
    proprio = await criar(2, cpfs[2]);
    const idoso = await http()
      .post('/idosos')
      .auth(responsavel.token, { type: 'bearer' })
      .send({
        nome: 'Maria Silva',
        nomeSocial: 'Maria',
        cpf: cpfs[3],
        telefone: '8133334444',
        dataNascimento: '1940-01-20',
        parentesco: 'FILHA',
        necessidadesEspeciais: 'Apoio ao caminhar',
        observacoes: 'Prefere manhã',
        endereco,
      })
      .expect(201);
    idosoId = idoso.body.id;
    const acesso = await prisma.idoso.create({
      data: {
        nome: 'Nome antigo',
        cpf: cpfs[2],
        dataNascimento: new Date('1950-05-20'),
        endereco: { create: endereco },
        responsavelIdosos: {
          create: {
            responsavelId: proprio.perfilId,
            parentesco: 'PROPRIO',
            responsavelPrincipal: true,
          },
        },
      },
    });
    proprioId = acesso.id;
  });
  afterAll(async () => {
    await app?.close();
  });

  it('edita dados e cuidados por partes sem apagar campos não enviados', async () => {
    await http()
      .patch(`/idosos/${idosoId}`)
      .auth(responsavel.token, { type: 'bearer' })
      .send({
        nomeSocial: '',
        telefone: null,
        necessidadesEspeciais: 'Fisioterapia',
        observacoes: '',
        endereco: { numero: '45', complemento: '' },
      })
      .expect(200);
    const { body } = await http()
      .get(`/idosos/${idosoId}`)
      .auth(responsavel.token, { type: 'bearer' })
      .expect(200);
    expect(body).toMatchObject({
      nome: 'Maria Silva',
      nomeSocial: '',
      telefone: null,
      cpf: cpfs[3],
      necessidadesEspeciais: 'Fisioterapia',
      observacoes: '',
      endereco: { ...endereco, numero: '45', complemento: '' },
      foto: null,
    });
    expect(body.dataNascimento).toBe('1940-01-20T00:00:00.000Z');
  });

  it('salva foto separada da conta, devolve metadados nas listas e entrega apenas bytes autorizados', async () => {
    await http()
      .post(`/idosos/${idosoId}/foto`)
      .auth(responsavel.token, { type: 'bearer' })
      .attach('foto', png, 'foto.png')
      .expect(201);
    const { body } = await http()
      .get(`/idosos/${idosoId}`)
      .auth(responsavel.token, { type: 'bearer' })
      .expect(200);
    expect(body.foto.updatedAt).toBeTruthy();
    expect(body.foto.conteudo).toBeUndefined();
    expect((await me(responsavel.token)).foto).toBeNull();
    const vinculo = (
      await me(responsavel.token)
    ).responsavel.responsavelIdosos.find(
      (v: { idoso: { id: number } }) => v.idoso.id === idosoId,
    );
    expect(vinculo.idoso.foto).toEqual(body.foto);
    const lista = await http()
      .get('/idosos')
      .auth(responsavel.token, { type: 'bearer' })
      .expect(200);
    expect(
      lista.body.find((idoso: { id: number }) => idoso.id === idosoId).foto,
    ).toEqual(body.foto);
    const imagem = await http()
      .get(`/idosos/${idosoId}/foto`)
      .auth(responsavel.token, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /image\/png/);
    expect(imagem.body).toEqual(png);
    expect(imagem.headers['cache-control']).toContain('private');
  });

  it('rejeita arquivos inválidos e impede que outro usuário visualize, troque ou remova a foto', async () => {
    const path = `/idosos/${idosoId}/foto`;
    await http()
      .post(path)
      .auth(responsavel.token, { type: 'bearer' })
      .attach('foto', Buffer.from('arquivo que não é imagem'), 'falso.png')
      .expect(400);
    await http()
      .post(path)
      .auth(responsavel.token, { type: 'bearer' })
      .attach('foto', Buffer.alloc(3 * 1024 * 1024 + 1), 'grande.png')
      .expect(413);
    await http().get(path).expect(401);
    await http().get(path).auth(outro.token, { type: 'bearer' }).expect(403);
    await http()
      .post(path)
      .auth(outro.token, { type: 'bearer' })
      .attach('foto', png, 'intruso.png')
      .expect(403);
    await http().delete(path).auth(outro.token, { type: 'bearer' }).expect(403);
    await http()
      .get(path)
      .auth(responsavel.token, { type: 'bearer' })
      .expect(200);
    await http()
      .delete(path)
      .auth(responsavel.token, { type: 'bearer' })
      .expect(204);
    await http()
      .get(path)
      .auth(responsavel.token, { type: 'bearer' })
      .expect(404);
    expect(
      (await me(responsavel.token)).responsavel.responsavelIdosos[0].idoso.foto,
    ).toBeNull();
  });

  it('usa a mesma foto no acesso próprio e no perfil do idoso', async () => {
    await http()
      .post('/auth/foto')
      .auth(proprio.token, { type: 'bearer' })
      .attach('foto', png, 'proprio.png')
      .expect(201);
    const usuario = await me(proprio.token);
    expect(usuario.perfil).toBe('IDOSO_INDEPENDENTE');
    expect(usuario.foto).toEqual(
      usuario.responsavel.responsavelIdosos[0].idoso.foto,
    );
    await http()
      .get(`/idosos/${proprioId}/foto`)
      .auth(proprio.token, { type: 'bearer' })
      .expect(200);
    await http()
      .post(`/idosos/${proprioId}/foto`)
      .auth(proprio.token, { type: 'bearer' })
      .attach('foto', png, 'nova.png')
      .expect(201);
    expect(
      await prisma.fotoIdoso.count({ where: { idosoId: proprioId } }),
    ).toBe(0);
    expect((await me(proprio.token)).foto.updatedAt).toBeTruthy();
    await http()
      .delete(`/idosos/${proprioId}/foto`)
      .auth(proprio.token, { type: 'bearer' })
      .expect(204);
    expect((await me(proprio.token)).foto).toBeNull();
  });

  it('sincroniza dados pessoais e cuidados entre a conta própria e o cadastro do idoso', async () => {
    const antigo = await http()
      .get(`/idosos/${proprioId}`)
      .auth(proprio.token, { type: 'bearer' })
      .expect(200);
    expect(antigo.body.nome).toBe('Pessoa 2');
    expect(antigo.body.telefone).toBe('81999998888');
    await http()
      .patch(`/responsaveis/${proprio.perfilId}`)
      .auth(proprio.token, { type: 'bearer' })
      .send({
        usuario: { nome: 'Idoso Atualizado', nomeSocial: 'Seu José' },
        telefone: '81988887777',
        endereco: { numero: '60' },
        idoso: {
          sexo: 'Masculino',
          necessidadesEspeciais: 'Apoio diário',
          observacoes: 'Prefere tarde',
        },
      })
      .expect(200);
    const usuario = await me(proprio.token);
    expect(usuario.responsavel.responsavelIdosos[0].idoso).toMatchObject({
      nome: 'Idoso Atualizado',
      nomeSocial: 'Seu José',
      telefone: '81988887777',
      necessidadesEspeciais: 'Apoio diário',
      observacoes: 'Prefere tarde',
      sexo: 'Masculino',
      endereco: { numero: '60' },
    });
    await http()
      .patch(`/idosos/${proprioId}`)
      .auth(proprio.token, { type: 'bearer' })
      .send({
        nome: 'José Silva',
        nomeSocial: '',
        dataNascimento: '1948-01-20',
        telefone: '81977776666',
        endereco: { complemento: 'Bloco A' },
      })
      .expect(200);
    const atual = await me(proprio.token);
    expect(atual).toMatchObject({ nome: 'José Silva', nomeSocial: '' });
    expect(atual.responsavel).toMatchObject({
      telefone: '81977776666',
      dataNascimento: '1948-01-20T00:00:00.000Z',
      endereco: { numero: '60', complemento: 'Bloco A' },
    });
    for (const campo of ['cpf', 'telefone'])
      await http()
        .patch(`/idosos/${proprioId}`)
        .auth(proprio.token, { type: 'bearer' })
        .send({ [campo]: null })
        .expect(400);
  });

  it('desfaz toda a edição se CPF conflitar e impede alterações de vínculo próprio e campos indevidos', async () => {
    await http()
      .patch(`/responsaveis/${proprio.perfilId}`)
      .auth(proprio.token, { type: 'bearer' })
      .send({ usuario: { nome: 'Não deve salvar' }, cpf: cpfs[3] })
      .expect(409);
    expect((await me(proprio.token)).nome).toBe('José Silva');
    await http()
      .patch(`/responsaveis/${responsavel.perfilId}`)
      .auth(responsavel.token, { type: 'bearer' })
      .send({ idoso: { observacoes: 'Sem vínculo próprio' } })
      .expect(400);
    await http()
      .patch(`/idosos/${idosoId}`)
      .auth(responsavel.token, { type: 'bearer' })
      .send({ usuarioId: outro.id })
      .expect(400);
    await http()
      .patch(`/responsaveis/${proprio.perfilId}`)
      .auth(proprio.token, { type: 'bearer' })
      .send({ idoso: { id: idosoId, observacoes: 'Outro idoso' } })
      .expect(400);
    await http()
      .post('/idosos')
      .auth(responsavel.token, { type: 'bearer' })
      .send({
        nome: 'Vínculo forjado',
        dataNascimento: '1950-05-20',
        parentesco: 'PROPRIO',
        endereco,
      })
      .expect(400);
    await http()
      .patch(`/responsaveis/${responsavel.perfilId}/idosos/${idosoId}`)
      .auth(responsavel.token, { type: 'bearer' })
      .send({ parentesco: 'PROPRIO' })
      .expect(400);
    await http()
      .patch(`/responsaveis/${proprio.perfilId}/idosos/${proprioId}`)
      .auth(proprio.token, { type: 'bearer' })
      .send({ parentesco: 'OUTRO' })
      .expect(400);
  });
});
