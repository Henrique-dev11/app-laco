# Configuração do Ambiente — Projeto Laço

Este documento explica como preparar o ambiente de desenvolvimento do projeto Laço em uma nova máquina.

## 1. Tecnologias Utilizadas

### Backend
- **Node.js:** `24.21.0`
- **npm:** `11.19.0`
- **Framework:** NestJS
- **Linguagem:** TypeScript
- **ORM:** Prisma 7
- **Banco de Dados:** PostgreSQL 17
- **Infraestrutura:** Docker & Docker Compose

### Banco de Dados
- **Imagem:** PostgreSQL 17 Alpine (executado via Docker Compose)

---

## 2. Clonar o Projeto


```bash
git clone https://github.com/Henrique-dev11/app-laco.git
cd app-laco
git status
```

---

## 3. Configurar Node.js

O projeto exige versões específicas para garantir a estabilidade do ambiente de desenvolvimento.

| Ferramenta | Versão esperada | Comando de verificação |
| --- | --- | --- |
| Node.js | `v24.21.0` | `node --version` |
| npm | `11.19.0` | `npm --version` |

### Utilizando NVM

Se você utiliza o **NVM**, o projeto possui um arquivo `.nvmrc`.

Execute:

```bash
nvm install
nvm use
node --version
```

O NVM utilizará automaticamente a versão do Node.js definida no arquivo `.nvmrc`.

### Atualizar npm

Caso a versão instalada do npm seja diferente da requerida pelo projeto:

```bash
npm install -g npm@11.19.0
npm --version
```

---

## 4. Variáveis de Ambiente do Docker

Na raiz do projeto, crie o arquivo `.env` a partir do arquivo de exemplo:

```bash
cp .env.example .env
```

Confira e ajuste o arquivo `.env`.

Exemplo:

```env
POSTGRES_DB=pj_laco
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
```

> **Atenção:** o arquivo `.env` contém configurações locais e não deve ser enviado ao Git.

---

## 5. Iniciar PostgreSQL

Na raiz do projeto, execute o container do banco de dados:

```bash
docker compose up -d
```

Confira o estado dos serviços:

```bash
docker compose ps
```

O container:

```text
pj-laco-db
```

deverá apresentar o status:

```text
healthy
```

---

## 6. Preparar o Backend

Acesse a pasta da API:

```bash
cd api
```

Crie o arquivo `.env` da API, caso ele ainda não exista:

```bash
nano .env
```

Adicione a URL de conexão com o PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pj_laco?schema=public"
```

> O arquivo `api/.env` também não deve ser versionado.

---

## 7. Instalar Dependências

Para uma máquina nova ou após atualizações nas dependências do projeto, utilize:

```bash
npm ci
```

### Importante

Não utilize apenas:

```bash
npm install
```

para sincronizar as dependências em outra máquina.

O comando:

```bash
npm ci
```

utiliza o `package-lock.json` para instalar as versões registradas no projeto de maneira reproduzível.

Use:

```bash
npm install <pacote>
```

somente quando estiver adicionando uma nova dependência ao projeto.

Exemplo:

```bash
npm install @nestjs/config
```

Ao adicionar uma nova dependência, é esperado que estes arquivos sejam alterados:

```text
package.json
package-lock.json
```

Os dois devem ser versionados no Git.

---

## 8. Validar Prisma

Verifique se o schema do Prisma está válido:

```bash
npx prisma validate
```

Depois confira o estado das migrations:

```bash
npx prisma migrate status
```

---

## 9. Atualizar Banco de Dados

Para aplicar as migrations que já existem no projeto:

```bash
npx prisma migrate deploy
```

> **Nota:** não crie uma nova migration apenas para configurar uma máquina nova. As migrations existentes devem ser aplicadas com `prisma migrate deploy`.

---

## 10. Gerar Prisma Client

Gere o Prisma Client localmente:

```bash
npx prisma generate
```

O diretório gerado:

```text
src/generated/prisma/
```

não é versionado e deve ser recriado em cada instalação.

---

## 11. Compilar Backend

Para verificar se o backend está compilando corretamente:

```bash
npm run build
```

O comando deve finalizar sem erros.

---

## 12. Executar Backend

Inicie o servidor em modo de desenvolvimento:

```bash
npm run start:dev
```

A API ficará disponível em:

```text
http://localhost:3000
```

Para realizar um teste rápido:

```bash
curl http://localhost:3000
```

---

# 🚀 Fluxos Rápidos

## Nova Máquina

Considerando que **Git, Node.js, npm, Docker e Docker Compose** já estão instalados:

```bash
git clone https://github.com/Henrique-dev11/app-laco.git

cd app-laco

nvm install
nvm use

cp .env.example .env

docker compose up -d
docker compose ps

cd api

npm ci

npx prisma validate
npx prisma migrate deploy
npx prisma generate

npm run build
npm run start:dev
```

Também será necessário criar/configurar o arquivo:

```text
api/.env
```

com:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pj_laco?schema=public"
```

---

## Após um `git pull`

Para uma máquina que já possui o projeto configurado:

```bash
git switch main
git pull

cd api

npm ci
npx prisma migrate deploy
npx prisma generate

npm run build
npm run start:dev
```

O `npm ci` garante que as dependências locais estejam de acordo com o `package-lock.json` recebido pelo Git.

---

# 📁 Guia de Versionamento

| ❌ Não versionar | ✅ Versionar |
| --- | --- |
| `.env` | `.env.example` |
| `node_modules/` | `package.json` |
| `dist/` | `package-lock.json` |
| `src/generated/prisma/` | `prisma/schema.prisma` |
| `*.tsbuildinfo` | `prisma/migrations/` |
|  | `compose.yaml` |
|  | `.nvmrc` |

## Resumo

Arquivos gerados localmente, caches, dependências instaladas e informações sensíveis não devem ser enviados ao Git.

Já arquivos responsáveis por definir o ambiente, dependências, banco de dados e migrations devem ser versionados para que outras máquinas consigam reproduzir o projeto corretamente.