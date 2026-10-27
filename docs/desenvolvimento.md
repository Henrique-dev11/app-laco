# Trabalhar no projeto

Para a primeira execução, siga [instalação](instalacao.md). As configurações
locais estão explicadas em [configuração](configuracao.md).

## Atualizar uma máquina já configurada

Confira `git status`, preserve seu trabalho e receba as alterações da branch
da equipe. A partir da raiz, com o banco disponível:

```sh
git pull --ff-only
docker compose up -d --wait db
npm --prefix api ci
npm --prefix api run db:generate
npm --prefix api run db:migrate
npm --prefix api run db:seed
npm --prefix mobile ci
```

Mantenha os `.env` locais e confira os `.env.example` quando receber variáveis
novas. Reinicie a API, o aplicativo e o painel. Não há instalação npm na raiz;
`api/` e `mobile/` têm seus próprios `package.json` e `package-lock.json`.
O painel `web/` usa apenas módulos nativos do Node.

## Dependências e banco

- Para reproduzir a instalação, use `npm ci` em `api/` e `mobile/`.
- Ao adicionar dependências ao app, use `npx expo install NOME_DO_PACOTE` em
  `mobile/`, mantendo a compatibilidade com o SDK 58.
- Versione os arquivos `package.json` e `package-lock.json` alterados.
- Para aplicar migrations recebidas, use `npm run db:migrate` em `api/`.
- O Prisma Client em `api/src/generated/prisma/` é gerado localmente com
  `npm run db:generate`.

Somente ao desenvolver uma alteração de schema, crie uma migration em `api/`:

```sh
npx prisma migrate dev --config prisma7.config.ts --name nome_da_alteracao
```

Use um banco de desenvolvimento dedicado para isso e versione o schema e a
migration. A instalação em outra máquina usa as migrations já recebidas.

## Verificações disponíveis

API, em `api/`:

```sh
npm run build
npm run lint
npm test
```

Para integração com PostgreSQL, execute `npm run test:e2e`. O runner cria um
banco temporário `laco_test_*` e o remove ao terminar. A conexão de
`TEST_DATABASE_URL`, ou de `DATABASE_URL` quando a primeira não estiver
definida, precisa permitir criar bancos no servidor de testes.

Aplicativo, em `mobile/`:

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
```

Painel, em `web/`:

```sh
npm run check
npm test
```

Para testar o empacotamento do app, execute em `mobile/`:

```sh
npx expo export --platform all --output-dir dist
```

## Testes visuais opcionais

`mobile/test/ui/motion.mjs` usa Firefox headless e uma API simulada para
verificar navegação, perfil, agenda, chat e propostas. Em Linux/macOS, com
Firefox disponível, execute em `mobile/`:

```sh
EXPO_PUBLIC_API_URL=http://127.0.0.1:8792/api CI=1 npx expo export --platform web --output-dir /tmp/laco-ui
EXPO_PUBLIC_API_URL=http://127.0.0.1:8792/api MOTION_WEB_DIR=/tmp/laco-ui node test/ui/motion.mjs
EXPO_PUBLIC_API_URL=http://127.0.0.1:8792/api MOTION_WEB_DIR=/tmp/laco-ui REDUCED_MOTION=1 node test/ui/motion.mjs
```

Se o Firefox estiver em outro caminho, defina `FIREFOX_BIN`. Esses comandos
usam a API simulada somente no build de teste e não modificam o `.env` local.
Teclado, câmera, área segura e fluidez das animações devem ser conferidos
também em iPhone/Android; a exportação e o navegador não executam esses
recursos nativos.

## Entregar uma alteração

Crie uma branch para a tarefa, implemente a mudança e execute as verificações
dos módulos afetados. Confira o diff, faça commit dos arquivos necessários e
abra um Pull Request descrevendo comportamento e testes.

Use os componentes e a paleta em `mobile/src/components/` e
`mobile/src/theme/`; as animações compartilhadas ficam em `mobile/src/motion/`.
Os testes ficam em `api/test/`, `mobile/test/` e `web/test/`.
Documente mudanças de configuração nos exemplos de ambiente e nestes guias,
mantendo os segredos e os arquivos gerados fora do Git.
