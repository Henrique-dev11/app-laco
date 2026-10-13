# API do Laço

Backend NestJS com Prisma e PostgreSQL. Implementa cadastro transacional, sessão, perfis, serviços, cuidadores, contratação, disponibilidade e agenda com autorização por usuário.

## Desenvolvimento

Configure `.env` a partir de `.env.example` e inicie o PostgreSQL pelo Compose na raiz. Neste diretório:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

Use as versões de Node/npm declaradas em `package.json` para reproduzir o ambiente da equipe. O cliente Prisma gerado não é versionado; execute `db:generate` após instalar dependências.

O seed padrão prepara o catálogo. A criação opcional de administrador local exige credenciais próprias; consulte o [guia de integração](../docs/teste/integracao-frontend-banco.md).

Para criar um administrador de desenvolvimento pelo terminal, execute `npm run admin:criar`. O painel está em `web/admin/`; execute `npm run dev` em `web/` e acesse `http://localhost:5173/admin`. Consulte o [README do painel](../web/README.md) para aprovar, rejeitar e bloquear cuidadores.

## Testes

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

A suíte e2e cria e remove um banco temporário exclusivo, com migrations completas. A conexão de `TEST_DATABASE_URL`, ou `DATABASE_URL` quando não informada, precisa permitir criação de bancos. Os registros do banco de desenvolvimento não são usados nos testes.

## Autenticação e endpoints

Cadastro: `POST /auth/cadastro`. Login: `POST /auth/login`. Perfil atual: `GET /auth/me`. Logout: `POST /auth/logout`. Chamadas privadas exigem `Authorization: Bearer TOKEN`; sessão expirada exige novo login. A senha é armazenada com bcrypt e o token da sessão é armazenado como hash.

`GET /servicos` e `GET /catalogo/cuidadores` são públicos. Listas de dados pessoais e aprovação de cuidadores são administrativas. Contratações e agendamentos são filtrados por participante. Cadastro de cuidador recebe multipart com `dados` (JSON) e `curriculo` (PDF até 5 MB).

A proteção de horários concorrentes usa a extensão PostgreSQL `btree_gist`. A agenda segue `America/Sao_Paulo`; um atendimento deve terminar no mesmo dia e a contratação precisa ter sido aceita.

Confira o [roteiro de testes manuais](../docs/teste/teste-banco.md) e o [guia completo de execução e integração](../docs/teste/integracao-frontend-banco.md).
