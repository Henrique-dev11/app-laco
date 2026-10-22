# Serviços e contratações — MVP

## O que mudou

O cuidador passa por dados pessoais, documentos/acesso, **Selecionar serviços** e **Configurar meus serviços**, antes da revisão final. A seleção permite catálogo padrão e serviços personalizados, sem pedir preço ou duração. A configuração exige preço-base e duração positiva de cada item e aceita horas ou minutos. A revisão exibe os nomes e valores antes de enviar o cadastro inteiro, incluindo o PDF, em uma transação.

Em **Perfil → Configurar meus serviços**, o cuidador altera preços e durações, adiciona serviços e pausa/reativa ofertas. Cada alteração tem confirmação por botão e retorno de sucesso ou erro.

O responsável escolhe o idoso vinculado, consulta as ofertas de cuidadores aprovados, seleciona um serviço e revisa preço/duração antes de confirmar. Pode acrescentar observações. Se preço ou duração mudarem entre a consulta e o envio, a API responde 409 e o app atualiza a busca para uma nova revisão. O cuidador aceita ou recusa no histórico, e o responsável acompanha o resultado.

Mantidos os status SOLICITADA, ACEITA, RECUSADA, CANCELADA e CONCLUIDA, as permissões por participante, aprovação administrativa, cancelamento, código de conclusão, avaliações e regras de agenda de São Paulo.

## Modelo e migration

Migration: `api/prisma/migrations/20261021230000_servicos_referencia/migration.sql`.

- `Servico.catalogo` diferencia os serviços padrão dos personalizados. Ambos reutilizam `Servico` e `CuidadorServico`; nenhuma tabela foi criada. Personalizados são criados junto da oferta, pertencem a ela e ficam fora de `/servicos`. Outros cuidadores não podem associar o ID de um serviço personalizado à própria oferta. Nomes iguais são permitidos entre personalizados de cuidadores diferentes; duplicações no próprio cadastro/perfil são rejeitadas.
- `Servico.precoSugerido` e `duracaoSugeridaMinutos` são opcionais. As telas mostram e preenchem sugestões quando existirem. Administradores podem defini-las pelo POST/PATCH `/servicos` existente. O seed não inventa preços de mercado e acrescenta **Acompanhamento domiciliar**, preservando os demais serviços.
- O antigo índice único global de nome é substituído por índice único parcial para `catalogo = true`, mantido no SQL da migration, e índice de consulta por nome no Prisma.
- `Contratacao.nomeServico`, `precoReferencia` e `duracaoMinutos` registram as condições da solicitação. `valorAcordado` começa com o preço-base obtido pelo servidor e continua independente da oferta. Nenhum cliente pode impor um valor arbitrário pelo endpoint de criação.
- A agenda usa a duração da contratação. O histórico e a agenda mostram o nome registrado, mesmo que o catálogo seja renomeado.
- O backfill dos contratos anteriores preserva `valorAcordado`; usa a duração já agendada quando houver, ou a duração da oferta no momento da migration. Não existe histórico suficiente para recuperar uma duração antiga que tenha sido alterada antes de haver agendamento.
- Validações: preços de R$ 0,01 até R$ 99.999.999,99, no máximo duas casas; duração inteira de 1 a 1440 minutos; cadastro com 1 a 50 serviços; nomes personalizados de até 150 caracteres. Permanecem as restrições existentes de atendimento terminar no mesmo dia e estar dentro da disponibilidade.

A migration foi aplicada ao banco local nesta implementação. Em outro ambiente, execute em `api/`:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

## API e compatibilidade

Rotas existentes mantidas:

- `GET /servicos`: catálogo padrão ativo, com sugestões opcionais.
- `POST /auth/cadastro`: campos existentes, mais `servicosPersonalizados?: { nome, descricao?, preco, duracaoMinutos }[]`. Cuidadores podem enviar `servicoIds: []` e `ofertas: []` quando tiverem personalizados configurados. Preferências de responsáveis e idosos continuam exigindo serviços padrão.
- `GET /cuidadores/:cuidadorId/servicos`: ofertas, incluindo sugestões do catálogo.
- `POST /cuidadores/:cuidadorId/servicos/:servicoId`: oferece serviço padrão.
- `PATCH /cuidadores/:cuidadorId/servicos/:servicoId`: edita preço/duração/ativo, inclusive de personalizado próprio.
- `POST /contratacoes`: mantém campos existentes e aceita `precoReferenciaEsperado?` e `duracaoEsperadaMinutos?` para detectar uma oferta desatualizada. Clientes anteriores que não enviam esses campos continuam usando a oferta atual.
- Listagem, detalhe, mudança de status, código de conclusão e agendamento de contratações continuam nas mesmas rotas.

A única rota adicional é `POST /cuidadores/:cuidadorId/servicos`, necessária para criar, depois do cadastro, um personalizado e sua oferta na mesma transação. Usa `{ nome, descricao?, preco, duracaoMinutos }` e as mesmas permissões de edição por cuidador.

## Roteiro manual

1. Mantenha a API aberta com `npm run start:dev` em `api/`. Em outro terminal, execute `npm run web` em `mobile/`. Para o navegador local, `mobile/.env` usa `EXPO_PUBLIC_API_URL=http://localhost:3000`.
2. Inicie um novo cadastro de cuidador, preencha os dados/documentos, senha e termos, e anexe um PDF válido de até 5 MB.
3. Na seleção, marque Companhia e acrescente um serviço personalizado, como Leitura e conversa. Confirme que não há campos de preço/duração nesta etapa.
4. Na configuração, informe, por exemplo, R$ 50,00 e 1,5 horas em Companhia; R$ 30,00 e 45 minutos no personalizado. Volte à seleção e avance novamente: os valores dos itens mantidos devem permanecer.
5. Tente preço zero ou duração em branco: o avanço deve ser bloqueado. Revise o resumo e confirme o cadastro. É possível testar também cadastro só com personalizados.
6. Entre como cuidador. Em Perfil → Configurar meus serviços, confira os dados salvos e faça uma alteração. Recarregue os dados para verificar a persistência. Teste adicionar outro serviço e pausar/reativar uma oferta.
7. Aprove o cuidador pelo painel administrativo existente (`web/`, `/admin`). Antes da aprovação ele permanece fora da busca pública.
8. Entre como responsável com um idoso vinculado. Na busca, confira os serviços padrão e personalizados do cuidador, com referências de preço/duração. Selecione um serviço, revise e confirme.
9. No histórico, confirme SOLICITADA, idoso, valor, duração e observações. O responsável não deve conseguir aceitar a própria solicitação.
10. Como cuidador, altere o preço/duração da oferta depois da solicitação. O contrato anterior deve manter seus valores; uma nova solicitação deve usar os novos.
11. Aceite pelo histórico do cuidador e confira ACEITA no responsável. Defina disponibilidade e agende pelo responsável: o intervalo deve usar a duração registrada no contrato. Recuse outra solicitação e confira RECUSADA; não é permitido voltar de RECUSADA para ACEITA.
12. Teste a oferta desatualizada: selecione e revise no responsável; antes de confirmar, altere a oferta no cuidador. Ao confirmar, a busca deve atualizar e pedir nova revisão. Nenhum contrato deve ser criado nessa tentativa.
13. Pause uma oferta e confira que ela desaparece da busca e que uma solicitação antiga ainda não enviada é rejeitada. Teste com outro responsável: não deve acessar nem modificar contratos alheios ou contratar para idosos sem vínculo.

## Verificações automatizadas

Em `api/`: `npm run build`, `npm run lint`, `npm test`, `npm run test:e2e`.

A suíte e2e usa um banco temporário `laco_test_*`, aplica as migrations e remove o banco ao final, sem usar os registros de desenvolvimento. Inclui cadastro misto e apenas personalizado, permissões, validações, oferta desatualizada, preços/durações preservados, contratação personalizada e agendamento com a duração original. Os cenários existentes de sessão, aprovação, agenda, conclusão e avaliações continuam cobertos.

Em `mobile/`: `npm run typecheck`, `npm run lint`, `npm test`. Os testes de ofertas verificam conversão de horas/minutos, moeda com vírgula, precisão e campos inválidos. `npx expo export --platform web --output-dir /tmp/laco-servicos-web` verifica o bundle web. A navegação visual completa deve ser conferida pelo roteiro acima; compilação e testes HTTP não substituem essa conferência.

## Preparação para negociação

A oferta em `CuidadorServico` permanece uma referência para novas solicitações. A contratação tem identidade própria, participantes e idoso definidos, preço inicial separado do valor acordado, nome e duração registrados, observações e agendamento existentes. Um futuro chat pode se vincular ao ID da contratação e autorizar os mesmos participantes.

Não há chat nem endpoint de negociação neste MVP. Uma proposta futura deve ter aceite explícito de ambos, histórico de alterações e atualização transacional do valor/duração/agendamento, preservando a referência inicial e verificando disponibilidade. Se uma negociação incluir vários serviços, os itens/propostas deverão ser modelados nessa implementação futura; o MVP mantém um serviço por contratação.

## Arquivos alterados ou adicionados

- [`api/README.md`](../../api/README.md)
- [`api/prisma/migrations/20261021230000_servicos_referencia/migration.sql`](../../api/prisma/migrations/20261021230000_servicos_referencia/migration.sql)
- [`api/prisma/schema.prisma`](../../api/prisma/schema.prisma)
- [`api/prisma/seed.mjs`](../../api/prisma/seed.mjs)
- [`api/src/auth/auth.service.ts`](../../api/src/auth/auth.service.ts)
- [`api/src/auth/cadastro.dto.ts`](../../api/src/auth/cadastro.dto.ts)
- [`api/src/contratacao/agenda.controller.ts`](../../api/src/contratacao/agenda.controller.ts)
- [`api/src/contratacao/contratacao.service.ts`](../../api/src/contratacao/contratacao.service.ts)
- [`api/src/contratacao/dto/create-contratacao.dto.ts`](../../api/src/contratacao/dto/create-contratacao.dto.ts)
- [`api/src/cuidador-servico/cuidador-servico.controller.ts`](../../api/src/cuidador-servico/cuidador-servico.controller.ts)
- [`api/src/cuidador-servico/cuidador-servico.service.ts`](../../api/src/cuidador-servico/cuidador-servico.service.ts)
- [`api/src/cuidador-servico/dto/create-cuidador-servico.dto.ts`](../../api/src/cuidador-servico/dto/create-cuidador-servico.dto.ts)
- [`api/src/cuidador-servico/dto/create-personalizado.dto.ts`](../../api/src/cuidador-servico/dto/create-personalizado.dto.ts)
- [`api/src/cuidador-servico/dto/update-cuidador-servico.dto.ts`](../../api/src/cuidador-servico/dto/update-cuidador-servico.dto.ts)
- [`api/src/servico/dto/create-servico.dto.ts`](../../api/src/servico/dto/create-servico.dto.ts)
- [`api/src/servico/dto/update-servico.dto.ts`](../../api/src/servico/dto/update-servico.dto.ts)
- [`api/src/servico/servico.service.ts`](../../api/src/servico/servico.service.ts)
- [`api/test/avaliacao.e2e-spec.ts`](../../api/test/avaliacao.e2e-spec.ts)
- [`api/test/servicos-contratacoes.e2e-spec.ts`](../../api/test/servicos-contratacoes.e2e-spec.ts)
- [`docs/teste/servicos-contratacoes.md`](../../docs/teste/servicos-contratacoes.md)
- [`mobile/package.json`](../../mobile/package.json)
- [`mobile/src/components/ServiceConfigFields.tsx`](../../mobile/src/components/ServiceConfigFields.tsx)
- [`mobile/src/components/ServiceSelector.tsx`](../../mobile/src/components/ServiceSelector.tsx)
- [`mobile/src/components/registration/DocumentStep.tsx`](../../mobile/src/components/registration/DocumentStep.tsx)
- [`mobile/src/constants/cadastro.ts`](../../mobile/src/constants/cadastro.ts)
- [`mobile/src/routes/AppRoutes.tsx`](../../mobile/src/routes/AppRoutes.tsx)
- [`mobile/src/screens/AgendaScreen.tsx`](../../mobile/src/screens/AgendaScreen.tsx)
- [`mobile/src/screens/BuscarCuidadorScreen.tsx`](../../mobile/src/screens/BuscarCuidadorScreen.tsx)
- [`mobile/src/screens/CadastroPreviewScreen.tsx`](../../mobile/src/screens/CadastroPreviewScreen.tsx)
- [`mobile/src/screens/ConfigurarServicosScreen.tsx`](../../mobile/src/screens/ConfigurarServicosScreen.tsx)
- [`mobile/src/screens/HistoricoScreen.tsx`](../../mobile/src/screens/HistoricoScreen.tsx)
- [`mobile/src/screens/MeusServicosScreen.tsx`](../../mobile/src/screens/MeusServicosScreen.tsx)
- [`mobile/src/screens/PerfilScreen.tsx`](../../mobile/src/screens/PerfilScreen.tsx)
- [`mobile/src/services/cadastro.ts`](../../mobile/src/services/cadastro.ts)
- [`mobile/src/types/auth.ts`](../../mobile/src/types/auth.ts)
- [`mobile/src/types/cadastro.ts`](../../mobile/src/types/cadastro.ts)
- [`mobile/src/types/navigation.ts`](../../mobile/src/types/navigation.ts)
- [`mobile/src/types/servico.ts`](../../mobile/src/types/servico.ts)
- [`mobile/src/utils/ofertas.ts`](../../mobile/src/utils/ofertas.ts)
- [`mobile/test/ofertas.test.mjs`](../../mobile/test/ofertas.test.mjs)
