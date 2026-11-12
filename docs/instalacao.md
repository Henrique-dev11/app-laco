# Instalar e executar o Laço

Este roteiro prepara uma máquina de desenvolvimento com banco, API, aplicativo
e painel administrativo. Cada máquina que usa o Docker local tem seu próprio
banco; os dados de usuários não são transportados pelo Git.

## 1. Preparar as ferramentas

| Ferramenta              | Versão usada pelo projeto                                     |
| ----------------------- | ------------------------------------------------------------- |
| Node.js                 | `24.21.0`, conforme [`.nvmrc`](../.nvmrc)                     |
| npm                     | `11.19.0`, conforme [`api/package.json`](../api/package.json) |
| Docker e Docker Compose | Compose com o comando `docker compose`                        |
| Git                     | Para clonar e atualizar o repositório                         |
| Expo Go                 | Compatível com SDK **58**, para testar no celular             |

Instale o [Docker Desktop ou o plugin Compose para Linux](https://docs.docker.com/compose/install/)
e mantenha o Docker em execução. No Windows, também é possível trabalhar pelo
WSL2 com a integração do Docker Desktop habilitada.

## 2. Clonar e selecionar o Node

```sh
git clone https://github.com/Henrique-dev11/app-laco.git
cd app-laco
```

Linux/macOS com [nvm](https://github.com/nvm-sh/nvm):

```sh
nvm install
nvm use
```

Windows com [NVM for Windows](https://github.com/nvm-windows/nvm):

```powershell
nvm install 24.21.0
nvm use 24.21.0
```

Confira as versões e o Compose:

```sh
node --version
npm --version
docker compose version
```

Se necessário, alinhe o npm com `npm install -g npm@11.19.0`.

## 3. Configurar os arquivos de ambiente

Na primeira instalação, copie os exemplos a partir da raiz:

```sh
cp .env.example .env
cp api/.env.example api/.env
cp mobile/.env.example mobile/.env
cp web/.env.example web/.env
```

No PowerShell, pode usar `Copy-Item` no lugar de `cp`. Em instalações já
configuradas, preserve os arquivos `.env` existentes.

Antes de continuar, ajuste:

1. `.env`: nome, usuário, senha e porta do PostgreSQL local.
2. `api/.env`: `DATABASE_URL` com esses mesmos dados.
3. `mobile/.env`: `EXPO_PUBLIC_API_URL` apontando para a API. Para celular,
   use o IP do computador na rede, por exemplo `http://192.168.1.10:3000`.
4. `web/.env`: os valores padrão atendem ao painel no próprio computador.

Os exemplos usam uma senha provisória; escolha sua senha local e mantenha a
URL do banco correspondente. Consulte [configuração](configuracao.md) para
ver os campos e os endereços usados em cada dispositivo.

## 4. Subir o banco e a API

Na raiz:

```sh
docker compose up -d --wait db
docker compose ps
```

O serviço `db` deve ficar saudável. No mesmo terminal, prepare a API:

```sh
cd api
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

`db:migrate` aplica as migrations existentes. `db:seed` prepara o catálogo
de serviços sem duplicá-los; as contas são criadas pelo aplicativo.
Os scripts Prisma já selecionam `prisma7.config.ts`.

Mantenha a API aberta. Em outro terminal, confira:

```sh
curl http://localhost:3000/
curl http://localhost:3000/servicos
```

A primeira chamada deve retornar `Hello World!`; a segunda, o catálogo JSON.

## 5. Abrir o aplicativo

Em outro terminal, a partir da raiz:

```sh
cd mobile
npm ci
npm run start:go
```

Mantenha computador e celular no mesmo Wi-Fi. No iPhone, leia o QR Code pela
Câmera; no Android, pelo Expo Go. Use o QR Code da instância atual do Metro.
Para abrir a versão web do aplicativo, pressione `w` nesse terminal.

No iPhone físico, entre na mesma conta Expo no CLI e no Expo Go. Se ainda
precisar autenticar o CLI, execute `npx expo login` em `mobile/` antes de
iniciar o servidor. A conta Expo é separada do login do Laço; veja a
[orientação oficial](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).

Se o QR Code der timeout, siga [solução de problemas](solucao-de-problemas.md).

## 6. Abrir o painel e criar o administrador

Em outro terminal, a partir da raiz:

```sh
cd web
npm run dev
```

O painel não tem dependências npm externas. Acesse
**http://localhost:5173/admin**; a raiz **http://localhost:5173/** serve o site
público de `web/site/`.

Para criar o primeiro administrador local, abra um terminal interativo em
`api/` e execute:

```sh
npm run admin:criar
```

Informe nome, e-mail e senha de 12 a 72 bytes. O comando cria uma conta nova
de desenvolvimento; escolha um e-mail ainda não cadastrado. Entre no painel
com essas credenciais. Responsáveis e cuidadores se cadastram pelo app.

Para um cuidador aparecer na busca, cadastre-o pelo app e, no painel, abra
**Cuidadores → Ver perfil → Aprovar e ativar**. Depois, atualize a situação
do cadastro no aplicativo.

## 7. Encerrar e voltar a trabalhar

Use `Ctrl+C` nos terminais da API, do Metro e do painel. Para parar o banco,
execute `docker compose stop db` na raiz; o volume guarda os dados.

Na próxima execução, use `docker compose up -d --wait db` e os comandos
`start:dev`, `start:go` e `dev` nas respectivas pastas. Após receber código
novo, siga [desenvolvimento](desenvolvimento.md).
