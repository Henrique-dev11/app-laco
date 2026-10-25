import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PrismaExceptionFilter } from '../src/prisma/prisma-exception.filter.js';
import { hashToken } from '../src/auth/auth.service.js';

const endereco = {
  rua: 'Rua Perfil',
  numero: '12',
  complemento: 'Casa',
  bairro: 'Centro',
  cidade: 'Recife',
  estado: 'PE',
  cep: '50000000',
};
const senha = 'PerfilSeguro123!';

describe('Edição unificada de perfil', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let responsavel: { id: number; perfilId: number; token: string };
  let cuidador: typeof responsavel;
  let outro: typeof responsavel;
  const http = () => request(app.getHttpServer());

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
    app.useGlobalFilters(new PrismaExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    async function criar(cuidador: boolean, numero: number) {
      const perfil = {
        telefone: '81999998888',
        cpf: ['52998224725', '11144477735', '12345678909'][numero],
        dataNascimento: new Date('1980-05-20'),
        endereco: { create: endereco },
      };
      const usuario = await prisma.usuario.create({
        data: {
          nome: 'Pessoa do Perfil',
          nomeSocial: 'Nome social',
          telefone2: '8133334444',
          email: `perfil-${numero}@teste.local`,
          senhaHash: await bcrypt.hash(senha, 4),
          tipoUsuario: cuidador ? 'CUIDADOR' : 'RESPONSAVEL',
          ...(cuidador
            ? {
                cuidador: {
                  create: {
                    ...perfil,
                    biografia: 'Biografia original',
                    experienciaProfissional: 'Experiência original',
                    registroProfissional: '123',
                  },
                },
              }
            : { responsavel: { create: perfil } }),
        },
        include: { responsavel: true, cuidador: true },
      });
      const token = randomBytes(32).toString('hex');
      await prisma.sessao.create({
        data: {
          usuarioId: usuario.id,
          tokenHash: hashToken(token),
          expiraEm: new Date(Date.now() + 3600_000),
        },
      });
      return {
        id: usuario.id,
        perfilId: (usuario.cuidador ?? usuario.responsavel)!.id,
        token,
      };
    }
    responsavel = await criar(false, 0);
    cuidador = await criar(true, 1);
    outro = await criar(false, 2);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('persiste dados, contato e endereço do responsável sem exigir os demais campos', async () => {
    await http()
      .patch(`/responsaveis/${responsavel.perfilId}`)
      .auth(responsavel.token, { type: 'bearer' })
      .send({
        usuario: { nome: 'Nome Atualizado', nomeSocial: '', telefone2: null },
        telefone: '81988887777',
        endereco: { numero: '45', complemento: '' },
      })
      .expect(200);
    const { body } = await http()
      .get('/auth/me')
      .auth(responsavel.token, { type: 'bearer' })
      .expect(200);
    expect(body).toMatchObject({
      nome: 'Nome Atualizado',
      nomeSocial: '',
      telefone2: null,
      email: 'perfil-0@teste.local',
    });
    expect(body.responsavel).toMatchObject({
      cpf: '52998224725',
      telefone: '81988887777',
      endereco: { ...endereco, numero: '45', complemento: '' },
    });
    expect(body.responsavel.dataNascimento).toBe('1980-05-20T00:00:00.000Z');
  });

  it('preserva os campos específicos do cuidador na atualização parcial', async () => {
    await http()
      .patch(`/cuidadores/${cuidador.perfilId}`)
      .auth(cuidador.token, { type: 'bearer' })
      .send({
        usuario: { nomeSocial: 'Cuidadora' },
        biografia: '',
        experienciaProfissional: 'Dez anos',
        registroProfissional: '456',
        endereco: { cep: '50010000' },
      })
      .expect(200);
    const { body } = await http()
      .get('/auth/me')
      .auth(cuidador.token, { type: 'bearer' })
      .expect(200);
    expect(body.nomeSocial).toBe('Cuidadora');
    expect(body.cuidador).toMatchObject({
      biografia: '',
      experienciaProfissional: 'Dez anos',
      registroProfissional: '456',
      cpf: '11144477735',
      endereco: { ...endereco, cep: '50010000' },
    });
  });

  it('normaliza e-mail, permite acesso pelo novo endereço e rejeita duplicação sem sobrescrever dados', async () => {
    const path = `/responsaveis/${responsavel.perfilId}`;
    await http()
      .patch(path)
      .auth(responsavel.token, { type: 'bearer' })
      .send({ usuario: { email: ' NOVO-PERFIL@TESTE.LOCAL ' } })
      .expect(200);
    await http()
      .post('/auth/login')
      .send({ email: 'novo-perfil@teste.local', senha })
      .expect(200);
    await http()
      .patch(path)
      .auth(responsavel.token, { type: 'bearer' })
      .send({
        usuario: { email: 'perfil-2@teste.local', nome: 'Não deve salvar' },
        endereco: { numero: '99' },
      })
      .expect(409);
    const { body } = await http()
      .get('/auth/me')
      .auth(responsavel.token, { type: 'bearer' })
      .expect(200);
    expect(body.email).toBe('novo-perfil@teste.local');
    expect(body.nome).toBe('Nome Atualizado');
    expect(body.responsavel.endereco.numero).toBe('45');
  });

  it('bloqueia edição de outro perfil, campos administrativos e CPF ou data inválidos', async () => {
    await http()
      .patch(`/responsaveis/${responsavel.perfilId}`)
      .auth(outro.token, { type: 'bearer' })
      .send({ usuario: { nome: 'Intruso' } })
      .expect(403);
    await http()
      .patch(`/cuidadores/${cuidador.perfilId}`)
      .auth(responsavel.token, { type: 'bearer' })
      .send({ biografia: 'Intruso' })
      .expect(403);
    const path = `/responsaveis/${responsavel.perfilId}`;
    await http().patch(path).send({ telefone: '81988887777' }).expect(401);
    for (const body of [
      { usuario: { id: outro.id } },
      { usuario: { tipoUsuario: 'ADMIN' } },
      { cpf: '11111111111' },
      { dataNascimento: '2030-01-01' },
      { telefone: '123' },
      { endereco: { cep: '123' } },
    ]) {
      await http()
        .patch(path)
        .auth(responsavel.token, { type: 'bearer' })
        .send(body)
        .expect(400);
    }
  });
});
