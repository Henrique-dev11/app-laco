# Testar o banco e a integração do Laço

O aplicativo agora cadastra, autentica e consulta dados no PostgreSQL pela API. O roteiro completo de configuração, administrador, contratação e agenda está em [Integração do frontend com o banco](integracao-frontend-banco.md).

## 1. Preparar o ambiente

Configure `.env` da raiz, `api/.env` e `mobile/.env` conforme os respectivos exemplos, sem sobrescrever suas configurações existentes.

Na raiz:

```bash
docker compose up -d db
```

Em `api/`:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

Em `mobile/`, em outro terminal:

```bash
npm ci
npm run start
```

## 2. Consultar o catálogo público

```bash
curl -i http://localhost:3000/servicos
curl -i http://localhost:3000/catalogo/cuidadores
```

Os cuidadores aparecem apenas depois de aprovados. O catálogo não contém CPF, e-mail nem endereço completo.

## 3. Cadastrar pelo aplicativo

Use **Criar conta**, preencha o endereço completo e selecione serviços reais. O cuidador informa preços/durações e envia currículo PDF; o responsável informa o idoso e parentesco. Use dados fictícios com CPF válido nos testes.

O cadastro usa `POST /auth/cadastro` e uma transação única. `201` confirma a gravação. `400` indica dados inválidos e `409` indica duplicidade. O idoso que usa sua própria conta é cadastrado com vínculo `PROPRIO`.

## 4. Fazer login pela API

Substitua os dados pelo usuário de teste que cadastrou:

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"usuario@teste.local","senha":"SUA_SENHA_DE_TESTE"}'
```

Copie o `token` retornado para uma variável local sem gravá-lo no repositório:

```bash
read -r -p 'Token da sessão de teste: ' TOKEN
```

Consulte o próprio perfil e dados associados:

```bash
curl -i http://localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:3000/contratacoes -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:3000/agendamentos -H "Authorization: Bearer $TOKEN"
```

As listas de contratação/agenda são limitadas ao participante. As listas completas de usuários/perfis são administrativas. Sem token, endpoints privados retornam `401`; tentar acessar outro usuário retorna `403`.

## 5. Testar o fluxo entre duas contas

1. Cadastre responsável e cuidador.
2. Prepare administrador local pelo roteiro do [guia de integração](integracao-frontend-banco.md#4-preparar-um-administrador-local).
3. Aprove o cuidador e defina sua disponibilidade.
4. Solicite contratação pela conta responsável e aceite pela conta cuidador.
5. Agende pela conta responsável e confira nas duas agendas.
6. Cancele e verifique que o horário foi liberado.
7. Edite o perfil, feche/reabra o app e confirme a persistência.

## 6. Revogar a sessão

```bash
curl -i -X POST http://localhost:3000/auth/logout -H "Authorization: Bearer $TOKEN"
curl -i http://localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"
unset TOKEN
```

Resultados esperados: `204` no logout e `401` ao reutilizar a sessão.

## 7. Executar testes automatizados

Em `api/`:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

A suíte e2e utiliza um banco temporário exclusivo, criado e removido pelo runner. Ela testa gravação, rollback, conflitos simultâneos, sessão, permissões, PDF, aprovação, contratação e agenda. O usuário PostgreSQL precisa poder criar bancos. Nunca rode a suíte nova diretamente contra o banco de desenvolvimento.

Em `mobile/`:

```bash
npm run typecheck
npm run lint
```

## 8. Conferir migrations ou preparar outra máquina

Suba o banco antes de aplicar migrations. Em `api/`:

```bash
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npx prisma migrate status --config prisma7.config.ts
```

São sete migrations nesta implementação. `db:seed` pode ser repetido sem duplicar o catálogo. Para inspecionar registros localmente:

```bash
npx prisma studio --config prisma7.config.ts
```

Não é necessário apagar ou recriar o banco para conectar o frontend. Não use `migrate reset` nem remova o volume Docker para atualizar um ambiente com dados existentes.
