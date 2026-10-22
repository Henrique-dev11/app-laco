# Preparação do Ambiente de Testes

Este guia contém os comandos para subir o ambiente local, executar as migrations do Prisma e sincronizar a base em novas máquinas.

**Base da API:** `http://localhost:3000`

---

## 1. Subir o ambiente local

Na raiz do projeto:

```bash
docker compose up -d
```

Dentro do diretório `api/`:

```bash
npm ci
npm run db:migrate
npm run db:generate
npm run start:dev
```

---

## 2. Criar nova migration (desenvolvimento)

Ao realizar alterações no schema do Prisma durante o desenvolvimento:

```bash
npx prisma migrate dev --config prisma7.config.ts
```

---

## 3. Configuração em outra máquina / novo ambiente

Ao clonar o repositório ou puxar novas atualizações:

```bash
git pull
cd api
npm ci
npm run db:migrate
npm run db:generate
```

Na raiz do projeto:

```bash
docker compose up -d
```

> Futuro: esses dados de teste poderão ser automatizados diretamente via Prisma Seed:

```bash
npm run db:seed
```

## 4. Banco separado para `feature/integra-caue`

O ambiente local desta branch usa o banco **`pj_laco_integra_caue`** no mesmo PostgreSQL do Docker. O banco anterior, **`pj_laco`**, foi preservado: ele tem o modelo do chat de propostas, incompatível com o modelo de mensagens diretas desta branch.

A API seleciona o banco por `DATABASE_URL` em `api/.env`. Altere somente o nome do banco na URL, preservando usuário, senha, host, porta e parâmetros locais. Para esta branch, o caminho é `/pj_laco_integra_caue?schema=public`.

Na preparação deste ambiente foram executadas todas as migrations da branch e o seed do catálogo. O novo banco começa sem usuários, idosos ou contratações. Os cadastros anteriores continuam no banco antigo. Cadastre os perfis novamente, aprove o cuidador e crie uma contratação entre responsável e cuidador para testar as mensagens. Esta versão libera o chat somente entre pessoas com contratação entre si.

Para criar um administrador de teste no banco selecionado, use o comando interativo existente:

```bash
cd api
npm run admin:criar
```

A configuração anterior foi guardada em `api/.env.banco-anterior`, ignorado pelo Git. Nenhum reset foi executado. Não é necessário mudar o `.env` da raiz nem o `mobile/.env`: o banco separado usa o mesmo servidor PostgreSQL e o aplicativo continua acessando a mesma URL da API.

Depois de mudar o banco, reinicie a API:

```bash
cd api
npm run start:dev
```

O `.env` não é versionado e **não muda automaticamente ao trocar de branch**. Para voltar à configuração anterior, primeiro guarde a configuração desta branch e depois restaure o backup:

```bash
cd api
cp .env .env.integra-caue
cp .env.banco-anterior .env
```

Para retornar ao banco desta branch, restaure `api/.env.integra-caue` e reinicie a API. Não aplique migrations de modelos de mensagens diferentes ao mesmo banco.

Em outra máquina, crie primeiro um banco vazio com esse nome no PostgreSQL local, configure `api/.env` com suas próprias credenciais e execute:

```bash
cd api
npm run db:migrate
npm run db:generate
npm run db:seed
npm run start:dev
```
