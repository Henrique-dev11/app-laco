# Integração do frontend com o banco — implementação de desenvolvimento

A integração usa **Expo → Axios → NestJS → Prisma → PostgreSQL**. O aplicativo acessa a API; credenciais do banco ficam no backend.

## O que está implementado

- Cadastro transacional de responsável, cuidador e idoso que utiliza sua própria conta.
- Endereço completo, nome social, telefone secundário, aceite de termos e preferências de serviços persistidos.
- Cadastro de cuidador com ofertas (preço/duração) e currículo PDF de até 5 MB, gravados na mesma transação.
- Login com bcrypt e sessão de sete dias. O banco armazena o hash do token; logout o revoga e troca de senha revoga todas as sessões do usuário.
- Sessão guardada com SecureStore em Android/iOS; no navegador, sessionStorage somente durante a aba.
- Navegação privada condicionada à sessão, sem botão de acesso de demonstração.
- Perfil recuperado da API, edição de nome/nome social, serviços reais, busca de cuidadores aprovados, contratação e histórico filtrados por participante.
- Definição de disponibilidade semanal e agendamento por data/hora após aceitação da contratação.
- Exclusões no PostgreSQL impedem sobreposição de disponibilidades e reservas, inclusive com requisições simultâneas.
- Cancelar uma contratação desativa sua reserva e libera o horário.
- Seed idempotente do catálogo e criação opcional de administrador de desenvolvimento.

O perfil **Idoso** cria um usuário `RESPONSAVEL`, seu perfil e seu registro de idoso, vinculados com `PROPRIO`. O responsável que cadastra outra pessoa informa parentesco e escolhe se ela mora no mesmo endereço. Cuidadores novos começam `PENDENTE`; só aparecem na busca após aprovação administrativa.

## 1. Preparar o banco e a API

Configure `.env` na raiz usando `.env.example`, sem sobrescrever arquivos locais existentes. A raiz fornece `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_PORT` ao Compose.

Na raiz:

```bash
docker compose up -d db
```

Configure `api/.env` usando `api/.env.example`. A `DATABASE_URL` precisa corresponder aos dados do Compose. `PORT` é 3000 por padrão. `CORS_ORIGINS` é uma lista separada por vírgulas para as origens do navegador (por padrão, localhost nas portas 8081 e 19006). A conexão nativa do celular não depende de CORS.

Em `api/`:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

As migrations adicionam tabelas e campos e preservam os registros existentes. O banco local desta sessão recebeu as três migrations novas, totalizando **sete migrations aplicadas**, e o catálogo foi preparado. Para outra máquina, execute os comandos acima.

A proteção de sobreposição utiliza a extensão PostgreSQL `btree_gist`. O usuário que aplica migrations precisa poder instalá-la; o usuário `postgres` do ambiente local possui essa permissão. Em um banco antigo com horários sobrepostos, a nova restrição recusará a migration até os conflitos serem resolvidos.

`db:generate` deve ser executado após instalar dependências ou alterar o schema, pois o cliente gerado não é versionado. Para evoluir o modelo em desenvolvimento:

```bash
npx prisma migrate dev --config prisma7.config.ts --name nome_da_alteracao
npm run db:generate
```

## 2. Configurar e iniciar o aplicativo

Em `mobile/.env`, configure `EXPO_PUBLIC_API_URL`:

| Onde roda o aplicativo | URL |
| --- | --- |
| Navegador no computador da API | `http://localhost:3000` |
| Emulador Android padrão | `http://10.0.2.2:3000` |
| Celular na mesma rede | `http://IP_DO_COMPUTADOR:3000` |

No celular, localhost é o próprio aparelho. Verifique a rede e o acesso à porta 3000. O túnel do Expo não publica automaticamente a API. Se abrir o aplicativo web pelo IP da rede, inclua sua origem em `CORS_ORIGINS`.

Em `mobile/`:

```bash
npm ci
npm run start
```

Recarregue o aplicativo após mudar a URL. A dependência `expo-secure-store` e seu plugin já foram adicionados ao projeto. A senha fica somente no formulário; nunca é persistida no aparelho.

## 3. Criar conta e verificar persistência

1. Abra **Criar conta** e escolha responsável, cuidador ou idoso.
2. Preencha os dados reais do formulário e um CPF com dígitos verificadores válidos. Use somente dados fictícios no desenvolvimento.
3. Informe endereço completo, selecione serviços do catálogo e aceite os termos.
4. Para cuidador, informe preço e duração de cada serviço e selecione um PDF de até 5 MB.
5. Para responsável, informe o idoso, parentesco e seu endereço.
6. Revise e confirme. A tela só mostra sucesso após a API salvar o conjunto de registros.
7. Entre com e-mail e senha. Feche/reabra o aplicativo e confira o perfil.
8. Edite o nome social, salve e confira novamente após atualizar os dados.

Falhas de validação ou gravação não apagam o formulário. Se o cadastro já foi salvo mas a resposta se perdeu, uma nova tentativa pode retornar conflito; entre usando as credenciais cadastradas.

## 4. Preparar um administrador local

O seed padrão cria somente serviços. Para criar uma conta administrativa local, informe credenciais próprias pelo terminal em `api/`:

```bash
read -r -p 'E-mail do administrador local: ' SEED_ADMIN_EMAIL
read -r -s -p 'Senha local (12 a 72 bytes): ' SEED_ADMIN_PASSWORD
export SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD
npm run db:seed
unset SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD
```

Esse fluxo é recusado em `NODE_ENV=production` e não promove nem troca a senha de contas já existentes. Não existe senha administrativa fixa no código.

Faça login pela API com essa conta e use seu token para aprovar um cuidador:

```bash
curl -i -X PATCH http://localhost:3000/cuidadores/ID_DO_CUIDADOR/verificacao \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"statusVerificacao":"APROVADO"}'
```

O ID pode ser consultado em `GET /cuidadores` com o token administrativo. O painel administrativo local está em `web/admin/`. Para criar o administrador, execute `npm run admin:criar` em `api/`; para abrir o painel, execute `npm run dev` em `web/` e acesse `http://localhost:5173/admin`. Consulte [o README do painel](../../web/README.md).

## 5. Testar contratação e agenda

1. Entre como cuidador e defina horários em **Disponibilidade**.
2. Depois da aprovação, entre como responsável, abra **Buscar cuidador**, escolha o idoso e solicite um serviço.
3. Entre como cuidador e aceite a solicitação em **Contratações**.
4. Entre como responsável e, na contratação aceita, informe data e hora de início dentro da disponibilidade exibida.
5. Confira **Agenda** nas duas contas. A duração vem da oferta e os horários são apresentados em `America/Sao_Paulo`.
6. Tente reservar o mesmo cuidador no mesmo intervalo para outra contratação: a API retorna `409`.
7. Cancele a contratação e confira a reserva cancelada na agenda; o horário fica disponível novamente.

Esta versão permite um agendamento por contratação, no mesmo dia, com precisão de minutos. Para outro atendimento, crie outra contratação. Reagendamento direto ainda não foi implementado.

## Contratos principais da API

| Método e caminho | Acesso / comportamento |
| --- | --- |
| `GET /` | Público; resposta básica da API |
| `GET /servicos` | Público; catálogo ativo |
| `GET /catalogo/cuidadores` | Público; até 100 cuidadores aprovados, sem CPF/e-mail/endereço completo |
| `POST /auth/cadastro` | Público; JSON para responsável/idoso, multipart para cuidador (`dados` JSON + `curriculo`) |
| `POST /auth/login` | Público; retorna token, expiração e usuário seguro |
| `GET /auth/me` | Sessão; perfil completo do próprio usuário |
| `POST /auth/logout` | Sessão; revoga a sessão atual |
| `GET /auth/curriculo` | Cuidador; download do próprio PDF |
| `GET/PATCH /usuarios/:id` | Próprio usuário ou administrador |
| `GET /responsaveis/:id/idosos` | Próprio responsável ou administrador |
| `POST/GET /cuidadores/:id/disponibilidades` | Leitura com sessão; criação apenas pelo dono/admin |
| `PATCH /disponibilidades/:id` | Dono/admin; reativação também valida sobreposição |
| `PATCH /cuidadores/:id/verificacao` | Administrador |
| `POST /contratacoes` | Responsável dono do perfil; exige vínculo ao idoso e oferta elegível |
| `GET /contratacoes` | Filtrado pelo participante; administrador vê todas |
| `PATCH /contratacoes/:id/status` | Participante; aceitar/recusar/concluir exige cuidador; cancelamento pelos participantes |
| `POST /contratacoes/:id/agendamento` | Responsável/admin; contratação aceita e horário disponível |
| `GET /agendamentos` | Filtrado pelo participante; administrador vê todos |

Listas completas de usuários, responsáveis, cuidadores e idosos são administrativas. Cadastros legados por endpoints separados deixaram de ser públicos. O aplicativo utiliza o cadastro transacional.

Todas as chamadas privadas usam `Authorization: Bearer TOKEN`. E-mail/CPF/vínculo duplicado e sobreposição retornam `409`; dados inválidos retornam `400`; sessão ausente/expirada retorna `401`; acesso não autorizado retorna `403`. Login/cadastro possuem limite de 30 tentativas por IP a cada 15 minutos, em memória, adequado ao desenvolvimento com uma instância.

## Validações realizadas

- API: build, lint e teste unitário.
- Integração HTTP/PostgreSQL: 20 testes passando, cobrindo cadastro, hash de senha, sessão, rollback, duplicidade concorrente, privacidade, próprio idoso, PDF, aprovação, contratação, disponibilidade concorrente, agendamento concorrente, cancelamento e revogação de sessão.
- Mobile: TypeScript, lint e exportações web e Android concluídos.
- Banco local: migrations e seed aplicados sem apagar os registros existentes.

Executar em `api/`:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

`test:e2e` cria um banco temporário com nome aleatório `laco_test_*`, aplica migrations, executa a suíte e remove somente esse banco ao terminar. Exige permissão de criação de banco. Use `TEST_DATABASE_URL` se precisar de um servidor PostgreSQL separado; o banco de desenvolvimento não é usado para os dados dos testes.

Em `mobile/`:

```bash
npm run typecheck
npm run lint
```

Não foi realizada validação visual/tátil em aparelho físico. Faça o roteiro acima no celular antes da apresentação.

## O que continua para as próximas etapas

Mensagens, notificações e pagamento simulado precisam de implementação própria. As avaliações já estão na API (ver `api/README.md`); falta a tela no aplicativo e, se necessário, a moderação no painel administrativo. O painel administrativo de aprovação já está implementado em `web/admin/`; o site público completo pode ser adicionado em `web/site/`. O MVP continua prevendo pagamento simulado. O currículo é armazenado no PostgreSQL para desenvolvimento; uma implantação maior deve avaliar armazenamento privado de arquivos, análise do PDF e política de retenção.

A auditoria npm do mobile registrou 22 alertas (7 moderados e 15 altos), ligados à árvore existente de Expo/React Native. O relatório sugere também downgrades incompatíveis com SDK 57; não foi aplicado `audit fix --force`. Revisar as dependências compatíveis antes de publicar. Não foram configurados deploy, backup, monitoramento ou serviço distribuído de limite de login.

Referências usadas: [SecureStore do Expo](https://docs.expo.dev/versions/latest/sdk/securestore/), [transações Prisma](https://www.prisma.io/docs/orm/fundamentals/transactions), [guards NestJS](https://docs.nestjs.com/guards).
