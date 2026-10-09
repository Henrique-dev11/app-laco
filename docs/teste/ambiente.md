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
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

---

## 2. Criar nova migration (desenvolvimento)

Ao realizar alterações no schema do Prisma durante o desenvolvimento:

```bash
npx prisma migrate dev
```

---

## 3. Configuração em outra máquina / novo ambiente

Ao clonar o repositório ou puxar novas atualizações:

```bash
git pull
cd api
npm ci
npx prisma migrate deploy
npx prisma generate
```

Na raiz do projeto:

```bash
docker compose up -d
```

> Futuro: esses dados de teste poderão ser automatizados diretamente via Prisma Seed:

```bash
npx prisma db seed
```