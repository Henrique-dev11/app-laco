# Dashboard administrativa

## Escopo e navegação

A dashboard mantém HTML, CSS e JavaScript do projeto `web/`, a sessão administrativa existente e o proxy `/api`. Não há novas dependências de frontend, migrations ou alterações nos cadastros atuais.

O menu oferece:

- **Visão geral:** totais de cuidadores, responsáveis, idosos, independentes e contratações, além das contagens por status e gráficos iniciais.
- **Gerenciamento de usuários:** cuidadores, responsáveis, idosos independentes e idosos em telas próprias, com busca por nome, filtros, paginação e detalhes.
- **Contratações:** consulta por serviço/participante, status e período; detalhes das condições e do agendamento. O acompanhamento usa a mesma página, evitando duplicação.
- **Relatórios e desempenho:** valores contratados, estatísticas de serviços e crescimento de cuidadores/responsáveis.
- **Minha conta e acesso:** identificação do administrador e orientação sobre os controles disponíveis. Não foram inventadas configurações ou gestão de administradores que o backend não oferece.

Aprovar, rejeitar, bloquear, reativar, consultar fotos e baixar o currículo do cuidador continuam funcionando. Após uma alteração, a listagem e o detalhe são consultados novamente.

## Definições dos indicadores

- Os totais da visão geral são globais, calculados no banco. Os gráficos usam o intervalo de relatório selecionado; a página informa as datas.
- Independentes são idosos com algum vínculo de parentesco **`PROPRIO`**, correspondente ao autocuidado já existente. São um subconjunto do total de idosos e usam o perfil de acesso de responsável. Não existe um novo login de idoso.
- Idosos não têm coluna de status de conta. A listagem de idosos mostra **vinculado / sem vínculo**; a de independentes mostra a situação da conta de autocuidado. Não há um status fictício `ATIVO` para o idoso.
- **Valor contratado:** soma de `valorAcordado` das contratações atualmente `ACEITA` ou `CONCLUIDA` no período.
- **Valor concluído:** soma das concluídas. **Aceitas em aberto:** soma das aceitas ainda não concluídas.
- **Valor total registrado:** soma de todos os status, incluindo pedidos pendentes, recusas e cancelamentos. Aparece separado do valor contratado.
- **Ticket médio concluído:** média dos valores das contratações concluídas, com arredondamento para centavos; zero quando não há concluídas.
- **Quantidade por período:** inclui todos os status e é identificada dessa forma.
- **Serviços mais contratados:** ranking de até dez serviços pela quantidade de contratações aceitas/concluídas. A tabela também informa o número de solicitações em todos os status e o valor contratado. A agregação usa o ID do serviço, preservando os valores registrados nos contratos.
- **Crescimento:** novos perfis de cuidador e responsável pela data de criação. Os responsáveis incluem autocuidado.

Não há controle de pagamentos no schema. Estes números não são vendas pagas, faturamento recebido ou repasses. Uma contratação concluída também não é evidência de pagamento.

## Períodos e consistência

As datas de início e fim são inclusivas no fuso `America/Sao_Paulo`; o backend converte o fim para o início exclusivo do próximo dia. A referência temporal dos contratos é **`createdAt`**, combinada com o status atual. Portanto, cancelar depois uma contratação altera o volume contratado do período em que ela foi criada; o relatório não reconstrói um histórico de mudanças de status.

Agrupamentos: dia, semana com início na segunda-feira, mês ou ano. Intervalos parciais contam somente os registros dentro do recorte. O backend preenche períodos sem movimento com zero. O limite de consulta é 731 dias inclusivos e o padrão são os últimos trinta dias.

Valores são agregados no PostgreSQL com tipos decimais e tratados com `Prisma.Decimal`. O frontend apenas formata e desenha os resultados. Contagens e páginas usam transações com leitura consistente; os relatórios não carregam todos os contratos para calculá-los no navegador.

## Endpoints novos

Todos são protegidos por sessão e `@AdminOnly()`, aceitando apenas `ADMIN` e `SUPER_ADMIN`.

| Método | Endpoint | Finalidade |
| --- | --- | --- |
| GET | `/admin/resumo` | Contagens globais, status e pendências de verificação |
| GET | `/admin/usuarios/cuidadores` | Busca, verificação, situação e paginação |
| GET | `/admin/usuarios/responsaveis` | Busca, situação, vínculo e paginação |
| GET | `/admin/usuarios/independentes` | Idosos de autocuidado, busca, conta e paginação |
| GET | `/admin/usuarios/idosos` | Busca, vínculo e paginação |
| GET | `/admin/usuarios/:categoria/:id` | Detalhe da categoria selecionada |
| GET | `/admin/contratacoes` | Consulta e paginação por serviço, participantes, status e datas |
| GET | `/admin/contratacoes/:id` | Condições e agendamento, sem código/hash de conclusão |
| GET | `/admin/relatorios` | Agregados financeiros, séries, status, serviços e crescimento |

Listagens retornam `{ dados, total, pagina, limite, paginas }`. Parâmetros: `busca`, `pagina` (padrão 1), `limite` (padrão 20, máximo 100), `situacao`, `verificacao`, `vinculo` ou `status`, conforme a tela. Os filtros de nome consideram nome completo e nome social, sem diferenciar maiúsculas e minúsculas.

Relatórios aceitam `inicio=AAAA-MM-DD`, `fim=AAAA-MM-DD` e `agrupamento=dia|semana|mes|ano`. A listagem de contratos aceita o mesmo início/fim e seu filtro de status. Categorias, limites, nomes, enums e datas são validados no backend.

As rotas anteriores `/admin/cuidadores`, `/admin/cuidadores/:id/verificacao`, `/admin/cuidadores/:id/conta` e `/admin/cuidadores/:id/curriculo` foram preservadas para compatibilidade. O painel novo usa a consulta paginada de usuários.

## Dados pessoais e segurança

A sessão é verificada antes de exibir o painel; perfis comuns são recusados e sessões expiradas limpam a interface. As permissões também são exigidas na API. Os dados nas tabelas e detalhes são inseridos com `textContent`, sem interpolar conteúdo do banco em HTML.

As listagens não retornam senhas, hashes, tokens, CPF ou dados de saúde. O detalhe do cuidador mantém CPF/endereço para a análise administrativa já existente. Os detalhes de responsáveis e idosos mostram apenas os campos necessários ao gerenciamento e seus vínculos; não retornam necessidades especiais ou prontuários. Contratações não expõem código/hash de conclusão nem tentativas. O download privado de currículo e de foto mantém a autenticação.

## Como executar e testar

```bash
cd api
npm run build
npm run start:dev
```

```bash
cd web
npm run dev
```

Abra `http://localhost:5173/admin`. Use uma conta administrativa do banco selecionado em `api/.env`; se precisar criá-la no desenvolvimento, use o comando interativo existente `npm run admin:criar` dentro de `api/`. Não é necessário migrar ou resetar o banco para esta melhoria.

1. Entre como administrador. Compare os cartões da visão geral com os cadastros e as contratações existentes. Abra os status pelos cartões.
2. Em **Cuidadores**, pesquise um nome, combine verificação e situação e avance/volte as páginas. Confira telefone, data, serviços e situação. Abra o perfil, baixe o currículo se houver e teste uma alteração autorizada de verificação/conta.
3. Em **Responsáveis**, filtre por vínculo/situação e abra um registro. Consulte um idoso pela tabela do detalhe e navegue de volta ao responsável correspondente.
4. Em **Idosos independentes**, confira apenas os vínculos de autocuidado; filtre a situação da conta. Em **Idosos**, teste com/sem vínculo e confira idade, datas e responsáveis.
5. Em **Contratações**, filtre status e período. Busque um serviço ou participante e confira o detalhe, valor acordado e agendamento.
6. Em **Valores contratados**, selecione um período conhecido e teste dia, semana, mês e ano. Compare o valor contratado com a soma das aceitas/concluídas, e o total registrado com todos os status. Abra a tabela equivalente aos gráficos.
7. Confira **Estatísticas de serviços** e **Crescimento de usuários** para o mesmo intervalo. Teste um período vazio: os dados devem ficar zerados, sem exemplos fictícios.
8. Teste uma data inválida, intervalo invertido e maior que 731 dias. A API deve rejeitar; corrija o filtro ou use Atualizar para repetir uma consulta que falhou.
9. Reduza a janela para largura de celular. O menu pode ser rolado horizontalmente; tabelas e gráficos rolam dentro dos seus painéis sem alargar a página.
10. Tente entrar com conta comum e consultar `/admin/resumo` ou `/admin/relatorios` usando sua sessão: o acesso deve ser negado. Uma sessão expirada deve retornar ao login e remover os dados exibidos.

## Arquivos criados e modificados

Criados:

- `api/src/admin/admin.{controller,dto,module,service}.ts`.
- `api/test/admin-dashboard.e2e-spec.ts`.
- Este guia.

Modificados:

- `api/src/app.module.ts`: registro do módulo administrativo.
- `web/admin/index.html`: navegação, área de conteúdo e diálogos existentes.
- `web/admin/assets/admin.js`: páginas, consultas, filtros, paginação, detalhes e gráficos SVG.
- `web/admin/assets/admin.css`: layout, indicadores, relatórios e adaptação a celular.
- `web/admin/assets/api.js`: métodos administrativos e serialização de filtros.
- `web/test/api.test.mjs`: testes das novas consultas, preservando os testes anteriores.
- `web/README.md`: execução e documentação da nova dashboard.

Nenhuma mudança em `api/prisma/schema.prisma` ou migrations. Nenhuma dependência nova instalada.

## Verificações executadas

- API: build e lint aprovados; 22 testes unitários aprovados.
- Integração com PostgreSQL temporário: 62 testes, incluindo oito novos cenários administrativos. Cobrem autenticação/permissão, contagens reais, paginação, filtros, vínculos, detalhes, centavos, limites do dia em São Paulo, agrupamentos, períodos vazios e preservação de aprovação/bloqueio.
- Web: verificação sintática e seis testes do cliente/servidor, incluindo parâmetros e proteção de arquivos privados.
- Firefox headless, em 1440×1000 e 390×844, com respostas sintéticas exclusivas do teste de interface: login, indicadores, quatro categorias, pesquisa, paginação, detalhes e navegação por vínculos, aprovação, contratos, quatro agrupamentos, relatórios, erro/recuperação, expiração e rejeição de perfil comum. Sem erros JavaScript. A integração com dados reais é validada separadamente pela suíte PostgreSQL; não foram inseridos dados fictícios na dashboard ou no banco do usuário.
- Capturas de inspeção local em `/tmp/laco-admin-desktop.png`, `/tmp/laco-admin-financeiro.png`, `/tmp/laco-admin-mobile.png` e `/tmp/laco-admin-mobile-lista.png`.
- `git diff --check` aprovado.

## Melhorias adicionais por prioridade (não implementadas)

1. **Alta:** módulo de pagamentos com confirmação e conciliação, antes de disponibilizar indicadores de receita recebida; trilha de auditoria das ações administrativas antes de ampliar alterações sensíveis pelo painel.
2. **Média:** índices e medições de desempenho conforme o volume real crescer; exportação de relatórios com autorização e registro de acesso; histórico de status para análises retrospectivas por data de conclusão/cancelamento.
3. **Baixa:** permissões administrativas mais granulares e preferências de filtros salvas. Não há criação automática de perfis, novas configurações ou novos poderes administrativos nesta entrega.
