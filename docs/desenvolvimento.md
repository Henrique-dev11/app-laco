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


## Dados fictícios de desenvolvimento

Para popular o banco configurado no `api/.env` deste projeto, execute a partir
da raiz, com as migrations aplicadas:

```sh
npm --prefix api run db:seed:usuarios
npm --prefix api run db:seed:contratos
npm --prefix api run db:seed:fotos-idosos
npm --prefix api run db:seed:agenda-chats
```

Os comandos adicionam 50 cuidadores e 50 responsáveis com fotos sintéticas,
50 currículos PDF e idosos vinculados, contratos em cinco status, fotos para
idosos sem imagem, 10 novos agendamentos e conversas relacionadas ao serviço.
Preservam contas e dados existentes, sem duplicar registros ao repetir.
São exclusivos de desenvolvimento e recusam `NODE_ENV=production`.

Contas: `cuidador01@exemplo.test` até `cuidador50@exemplo.test`, e
`responsavel01@exemplo.test` até `responsavel50@exemplo.test`. Senha inicial:
`LacoFicticio2026!`. Opcionalmente, defina `SEED_DEMO_PASSWORD` em `api/.env`
antes da primeira execução (8 caracteres no mínimo e 72 bytes no máximo). A senha de contas existentes
não é substituída. Fotos e prompts ficam em `api/prisma/seed/fotos/README.md`.

### Compatibilidade com o chat anterior

As migrations `preservar_chat_legado` e `importar_chat_legado` permitem
atualizar bancos que receberam o chat experimental de outubro. O conteúdo
original continua em `MensagemLegado`, `Conversa`, `Proposta` e `PropostaItem`.
As mensagens são reapresentadas no chat atual; propostas antigas aparecem
como texto com valor, situação e serviços, mantendo os dados estruturados
nas tabelas anteriores. Horários ausentes não são inventados. Os contratos
anteriores mantêm os vínculos antigos em `propostaItemId` e
`sessaoPropostaLegado`. Não execute reset para atualizar esse banco.
