# Configuração do .env no Laço

O `.env` guarda configurações do ambiente: portas, endereço da API e credenciais do banco. O `.env.example` é um modelo versionado para orientar a configuração de outra máquina. Editar o exemplo não muda os valores carregados pela aplicação.

Na verificação desta sessão, `.env`, `api/.env` e `mobile/.env` já existiam. `web/.env` ainda não existia. Os valores reais desses arquivos não foram exibidos nem alterados.

## Arquivos e responsabilidades

| Arquivo | Quem lê | Configurações |
| --- | --- | --- |
| `.env` na raiz | Docker Compose | Nome, usuário, senha e porta do PostgreSQL |
| `api/.env` | NestJS e Prisma | Conexão com o banco, porta da API e origens web permitidas |
| `mobile/.env` | Expo | Endereço público da API para o app |
| `web/.env` | Servidor Node do web | Porta/endereço do painel e endereço da API usado pelo servidor |

Cada parte já tem o carregamento das variáveis implementado. Não é necessário instalar outra biblioteca para usar esses arquivos.

## Configurar o painel que está aberto no IDE

Na raiz do projeto, crie o arquivo que falta:

```bash
cp web/.env.example web/.env
```

Execute esse comando somente se `web/.env` ainda não existir. Para um computador que executa tanto a API quanto o painel, mantenha:

```dotenv
WEB_PORT=5173
WEB_HOST=127.0.0.1
API_URL=http://127.0.0.1:3000
```

- `WEB_PORT`: porta onde o site/painel será servido.
- `WEB_HOST`: endereço de escuta; `127.0.0.1` permite acesso pelo próprio computador.
- `API_URL`: endereço que o servidor web utiliza para encaminhar as requisições à API NestJS.

O painel também possui esses valores como padrão no código. Por isso consegue iniciar sem `web/.env`. Reinicie `npm run dev` depois de editar o arquivo.

Acesso: `http://localhost:5173/admin`. A API precisa estar rodando na porta 3000.

## Banco e API

Exemplo ilustrativo da `.env` na raiz:

```dotenv
POSTGRES_DB=pj_laco
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SUA_SENHA_LOCAL
POSTGRES_PORT=5432
```

Exemplo correspondente de `api/.env`:

```dotenv
DATABASE_URL="postgresql://postgres:SUA_SENHA_LOCAL@localhost:5432/pj_laco?schema=public"
PORT=3000
CORS_ORIGINS=http://localhost:8081,http://localhost:19006
```

`SUA_SENHA_LOCAL` é um marcador; substitua pela senha do banco daquele ambiente. Nome, usuário, senha e porta da URL precisam coincidir com o banco. A senha do banco é diferente da senha da conta administrativa do Laço.

Se o banco atual já funciona, preserve as credenciais existentes. Alterar `POSTGRES_PASSWORD` no arquivo não muda automaticamente a senha de um PostgreSQL já inicializado com dados. Isso está descrito na [documentação da imagem oficial PostgreSQL](https://hub.docker.com/_/postgres).

Senhas com caracteres especiais devem ser codificadas no trecho da URL, por exemplo `@` vira `%40`; a senha original do banco continua a mesma. Referência: [URLs de conexão Prisma](https://www.prisma.io/docs/orm/v7/reference/connection-urls).

`CORS_ORIGINS` permite as origens dos navegadores que acessam diretamente a API. O aplicativo nativo não depende de CORS. O painel local encaminha as chamadas por `/api`, na mesma origem do web, e não exige incluir a porta 5173 nessa lista para esse fluxo.

## Aplicativo no celular

Se o app roda no navegador do mesmo computador da API:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Se o app roda num celular físico, use o IP de rede do computador:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

`192.168.1.100` é apenas um exemplo. No Linux, `hostname -I` ajuda a localizar os endereços da máquina. Use o endereço da conexão Wi-Fi/rede usada pelo celular. Os dispositivos precisam conseguir se comunicar pela rede, e a porta 3000 precisa estar acessível.

No celular, `localhost` aponta para o próprio celular. No emulador Android padrão, o endereço do computador é `http://10.0.2.2:3000`.

O Expo incorpora variáveis `EXPO_PUBLIC_*` ao aplicativo; elas são visíveis a quem recebe o app. Esse arquivo contém apenas a URL pública, nunca a senha do PostgreSQL ou segredos privados. Faça um recarregamento completo após mudar a URL. Referência: [variáveis de ambiente Expo](https://docs.expo.dev/guides/environment-variables/).

## Mostrar o painel em outro dispositivo da mesma rede

Em `web/.env`, altere:

```dotenv
WEB_HOST=0.0.0.0
```

Reinicie o web e abra `http://IP_DO_COMPUTADOR:5173/admin` no outro dispositivo. `0.0.0.0` é o endereço de escuta, não o endereço a digitar no navegador. `API_URL` pode continuar em `127.0.0.1:3000` quando web e API rodam no mesmo computador.

## Iniciar para a apresentação

Na raiz:

```bash
docker compose up -d db
```

Em um terminal, dentro de `api/`:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

Se ainda não tiver uma conta administrativa, execute `npm run admin:criar` em outro terminal dentro de `api/`, com o banco iniciado.

Em outro terminal, dentro de `web/`:

```bash
npm run dev
```

Em outro terminal, dentro de `mobile/`:

```bash
npm run start
```

Os `.env` estão ignorados pelo Git. Compartilhe os `.env.example` com a equipe e configure as credenciais próprias em cada máquina. Não abra arquivos com credenciais na tela compartilhada da apresentação.
