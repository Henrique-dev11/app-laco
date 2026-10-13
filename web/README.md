# Painel administrativo do Laço

MVP funcional em HTML, CSS e JavaScript, usando a mesma API e o mesmo PostgreSQL do aplicativo. O visual usa as cores, o logo e os componentes visuais do `front-laco`.

## Executar

Em um terminal, dentro de `api/`:

```bash
npm run db:generate
npm run db:migrate
npm run start:dev
```

Em outro terminal, dentro de `web/`:

```bash
npm run dev
```

Abra **http://localhost:5173/admin**. O painel não tem dependências npm externas; não é necessário instalar um framework para executá-lo. Usa Node 24 ou superior, como o backend.

Opcionalmente crie `web/.env` a partir de `.env.example`. `WEB_PORT` configura a porta do painel, `WEB_HOST` o endereço de escuta e `API_URL` o endereço da API. Por padrão, o servidor encaminha `/api/*` para `http://127.0.0.1:3000`, mantendo as chamadas do navegador na mesma origem. Nunca coloque a senha do banco no JavaScript do site.

## Criar o administrador local

Dentro de `api/`, em um terminal interativo:

```bash
npm run admin:criar
```

Informe seu nome, e-mail e senha de 12 a 72 bytes. A senha é digitada de forma oculta e gravada com hash. O comando é destinado ao desenvolvimento e não altera nem promove contas existentes. Use essas credenciais no painel. O seed anterior com `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` também continua disponível.

O cadastro público do aplicativo não cria administradores. Contas de responsável ou cuidador são recusadas pelo painel e pelos endpoints administrativos da API.

## Ativar um cuidador

1. O cuidador cadastra sua conta, serviços e currículo pelo aplicativo. O perfil começa **Pendente**.
2. Entre no painel com a conta administrativa.
3. Abra **Ver perfil** para consultar dados, endereço, serviços e baixar o PDF.
4. Se estiver tudo correto, clique em **Aprovar e ativar** e confirme.
5. O perfil recebe `APROVADO`, a conta fica `ATIVO` e o cuidador aparece na busca do aplicativo.

O cuidador já pode entrar no app para acompanhar seu cadastro enquanto aguarda a análise. Na home, **Atualizar situação do meu cadastro** recupera a aprovação.

**Rejeitar perfil** retira o cuidador da busca e mantém o acesso à conta. **Bloquear acesso** impede novos logins e revoga as sessões existentes. **Reativar acesso** permite entrar novamente; a verificação continua separada, e o perfil precisa estar aprovado para aparecer na busca.

## Organização para adicionar seu site pronto

```text
web/
├── admin/
│   ├── index.html
│   └── assets/
│       ├── admin.css
│       ├── admin.js
│       ├── api.js
│       └── logo-laco.png
├── site/
│   └── index.html
├── scripts/server.mjs
├── test/api.test.mjs
├── .env.example
└── package.json
```

Coloque o site pronto em **`web/site/`**, substituindo o `index.html` provisório e incluindo seus arquivos CSS, JavaScript e imagens. A raiz **http://localhost:5173/** serve esse site. O painel fica separado em **`/admin`**, e suas rotas e arquivos não precisam ser substituídos.

Se seu site pronto usar um framework, você pode integrar `admin/` ao projeto ou servir sua saída estática em `site/`. Não sobrescreva os arquivos de `admin/` nem as chamadas de `admin/assets/api.js` se quiser manter a aprovação funcionando. Os arquivos de ambiente e os scripts do servidor não são publicados pelo servidor estático.

Para hospedar externamente, configure um servidor/reverse proxy com `/api` apontando para sua API em HTTPS. Esta implementação está preparada para execução local; o PostgreSQL não é acessado pelo navegador.

## Verificação

```bash
npm run check
npm test
```

Os testes do cliente verificam sessão, erros, PDF e logout; os testes do servidor verificam a entrega da página e o bloqueio a arquivos privados. A suíte do backend também testa que somente administradores podem listar, aprovar, rejeitar, bloquear e baixar currículos.

O painel foi inspecionado em navegador em resoluções de computador e celular, usando registros fictícios de teste. O backend foi validado separadamente em PostgreSQL temporário com os endpoints reais.
