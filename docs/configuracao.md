# Configuração do ambiente

Comece pela [instalação](instalacao.md). Cada módulo lê seu próprio `.env`.
Os exemplos podem ser versionados; os arquivos com valores locais ficam fora
do Git, conforme [`.gitignore`](../.gitignore).

## Banco: `.env` na raiz

Copie [`.env.example`](../.env.example) para `.env`.

| Variável            | Uso                                               |
| ------------------- | ------------------------------------------------- |
| `POSTGRES_DB`       | Nome do banco criado no primeiro início do volume |
| `POSTGRES_USER`     | Usuário do PostgreSQL                             |
| `POSTGRES_PASSWORD` | Senha local desse usuário                         |
| `POSTGRES_PORT`     | Porta publicada no computador; exemplo: `5432`    |

O [Compose](../compose.yaml) executa PostgreSQL 17 e guarda os dados no volume
`postgres_data`. Com um volume já inicializado, mudar essas variáveis não
renomeia o banco nem altera as credenciais existentes.

## API: `api/.env`

Copie [`api/.env.example`](../api/.env.example). Formato da conexão:

```dotenv
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/NOME_DO_BANCO?schema=public"
PORT=3000
CORS_ORIGINS=http://localhost:8081,http://localhost:19006
```

Substitua os marcadores pelos dados do `.env` da raiz. A API roda no
computador e acessa a porta publicada pelo Docker. Se alterar `POSTGRES_PORT`,
atualize a porta da URL. Uma instância PostgreSQL já disponível também pode
ser usada, ajustando `DATABASE_URL` e dispensando o banco do Compose.

Caracteres especiais da senha devem ser codificados na URL: por exemplo,
`@` vira `%40`. A senha original continua sendo usada em `POSTGRES_PASSWORD`.
Consulte a [referência de URLs do Prisma](https://www.prisma.io/docs/orm/v7/reference/connection-urls).

`CORS_ORIGINS` aceita origens de navegador separadas por vírgula, sem barra
final. Inclua a origem do Expo Web se usar outro IP ou porta, como
`http://192.168.1.10:8081`. As chamadas nativas do Expo Go não dependem de CORS.

O administrador local pode ser criado com `npm run admin:criar`. As variáveis
opcionais `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` permitem criá-lo pelo
seed de desenvolvimento; se usadas, informe ambas. A senha deve ter de 12 a
72 bytes. Não existe uma senha administrativa padrão para distribuir.

## Aplicativo: `mobile/.env`

Copie [`mobile/.env.example`](../mobile/.env.example) e substitua `SEU-IP`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

O IP acima é ilustrativo. Use o IPv4 do computador que executa a API:

| Onde o aplicativo roda                         | Endereço da API                |
| ---------------------------------------------- | ------------------------------ |
| Expo Web no mesmo computador                   | `http://localhost:3000`        |
| iPhone/Android físico no mesmo Wi-Fi           | `http://IP_DO_COMPUTADOR:3000` |
| Emulador Android padrão, com API no computador | `http://10.0.2.2:3000`         |

No celular, `localhost` aponta para o próprio aparelho. Consulte o IP com
`ipconfig` no Windows, `ip -4 address` no Linux ou nas configurações de rede
do macOS. O IP pode mudar ao trocar de Wi-Fi.

Após alterar o endereço, pare o Metro e execute em `mobile/`:

```sh
npm run start:go -- --clear
```

Variáveis `EXPO_PUBLIC_*` entram no aplicativo distribuído. Use nelas somente
configuração pública, como a URL da API; credenciais do banco ficam na API.

## Painel: `web/.env`

Copie [`web/.env.example`](../web/.env.example). Os valores padrão são:

```dotenv
WEB_PORT=5173
WEB_HOST=127.0.0.1
API_URL=http://127.0.0.1:3000
```

O servidor do painel encaminha `/api/*` para `API_URL`. O navegador usa a mesma
origem do painel. `API_URL` é lida pelo servidor Node, não é uma conexão do
navegador com o banco.

Para acessar o painel de outro dispositivo no mesmo Wi-Fi, configure
`WEB_HOST=0.0.0.0`, reinicie `npm run dev` e abra
`http://IP_DO_COMPUTADOR:5173/admin`. Libere essa porta para a rede local se o
firewall exigir. A API pode continuar em `127.0.0.1` no `.env` do painel,
pois o proxy roda no computador.
