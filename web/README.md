# Painel administrativo do Laço

Painel administrativo em HTML, CSS e JavaScript, integrado à API NestJS e ao PostgreSQL do aplicativo. Mantém as cores e o logo do Laço, sem adicionar dependências de frontend.

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
3. No menu **Cuidadores**, pesquise o cadastro e abra **Ver perfil** para consultar dados, endereço, serviços e baixar o PDF.
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


## Dashboard, gerenciamento e relatórios

O painel abre em **Visão geral**, com contagens reais de cuidadores, responsáveis, idosos, autocuidado e contratações por status. O menu lateral oferece telas separadas para cuidadores, responsáveis, idosos independentes e idosos, além de contratações e relatórios. Em telas pequenas, a navegação vira uma faixa horizontal rolável.

As listagens pesquisam e paginam no backend. Cuidadores têm filtros de verificação e situação da conta; responsáveis têm filtros de situação e vínculo; idosos têm filtro de vínculo; independentes têm filtro da conta de autocuidado. As páginas de detalhes permitem navegar entre responsáveis e idosos. Aprovação, bloqueio, reativação, currículo e fotos de cuidadores continuam disponíveis.

Os relatórios apresentam valores contratados, quantidades, status, serviços e crescimento de cadastros. O período usa datas inclusivas no fuso de São Paulo e pode ser agrupado por dia, semana, mês ou ano. Cada gráfico SVG tem uma tabela equivalente com os valores completos. Não há biblioteca externa nem cálculo de estatísticas a partir de listagens no navegador.

**Valor contratado** corresponde à soma das contratações atualmente aceitas e concluídas. **Valor total registrado** inclui também solicitações, recusas e cancelamentos. Os valores não representam pagamentos recebidos: o projeto ainda não tem controle de pagamentos. A seleção temporal considera a data de criação da contratação e seu status atual, não a data de recebimento, conclusão ou agendamento.

O autocuidado já existe na modelagem: um idoso com vínculo `PROPRIO` é contado como independente. Esse grupo está incluído no total de idosos. Não foi criado outro tipo de conta.

Não houve alteração no Prisma ou migration para esta melhoria. Reinicie a API atualizada e recarregue o painel para acessar os novos endpoints. Consulte o [roteiro completo de testes e endpoints](../docs/teste/dashboard-admin.md).
