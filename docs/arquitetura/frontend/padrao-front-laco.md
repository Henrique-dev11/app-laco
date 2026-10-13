# Padrão visual do aplicativo Laço

A referência local é `/home/cafe/Documentos/front-laco`. O Figma informado pelo projeto é [o arquivo de referência](https://www.figma.com/design/ONGctkLruSxz3f59wiMTlQ/Sem-t%C3%ADtulo?node-id=0-1). O link não pôde ser inspecionado nesta sessão; o código e os assets locais foram usados como base visual.

Ao integrar uma funcionalidade com a API, preserve logo, tipografia, cores, espaçamentos, cartões e navegação da referência. Alterar a fonte dos dados não exige substituir o layout da tela.

## Componentes a reutilizar

- `theme/index.ts`: paleta original do Laço.
- `Button`, `FormField`, `Notice` e `QuickAccessCard`: botões, campos e cartões do projeto.
- `ScreenLayout` e `RegistrationLayout`: telas públicas e etapas de cadastro.
- `StepHeader`: progresso do cadastro.
- `AppScreenLayout`: cabeçalho roxo, conteúdo em cartões e barra inferior para telas autenticadas.
- `BottomNavigation`: mesma barra visual da home, com indicação da aba ativa.
- `theme/appStyles.ts`: cartões, textos, etiquetas e nomes legíveis para os status.

Login e home recuperam o layout do `front-laco`; o cadastro mantém seus componentes originais e os campos adicionais necessários ao banco. Perfil, serviços, busca, histórico, agenda, disponibilidade e detalhes do idoso seguem os mesmos estilos.

Os exemplos visuais da referência são substituídos por dados da API. Estados vazios ou de erro são exibidos quando não existe informação salva. A home não inventa atendimentos ou idosos para preencher cartões.

Google/Facebook e recuperação de senha permanecem visíveis no padrão original, com indicação de que ainda não estão disponíveis. Cadastro, sessão e permissões continuam funcionais.

O painel administrativo é independente em `web/admin/`; o futuro site público pode ser adicionado em `web/site/`. Consulte [as instruções do painel](../../../web/README.md).
