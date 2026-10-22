# Propostas de atendimento no chat

## Fluxo implementado

O cuidador abre a conversa existente, toca no ícone de documento **à esquerda do campo de mensagens** e escolhe **Criar proposta de atendimento**. Na tela própria seleciona o idoso vinculado ao responsável, adiciona os serviços do seu perfil, negocia preço e duração, seleciona datas pelo calendário e revisa o resumo antes de enviar.

Cada item representa um serviço, com um preço e uma duração por atendimento, e pode ter várias datas. O total soma o preço de cada item multiplicado pela quantidade de datas. Serviços diferentes no mesmo dia precisam ter intervalos sequenciais, sem sobreposição.

O cartão fica pendente no chat. Apenas o responsável da conversa pode aceitar, solicitar alterações ou recusar. Ao aceitar, a API revalida todos os dados e confirma as contratações e reservas **na mesma transação**. Se qualquer horário estiver ocupado, nenhuma sessão é confirmada e a proposta continua pendente.

As agendas existentes são usadas por ambos os perfis, com idoso, cuidador, serviço, início, término, duração, valor, observações e status. Propostas pendentes não entram na agenda. Cancelar uma contratação pelo histórico desativa o agendamento e atualiza o status nas duas agendas e no cartão, mantendo as condições originalmente aceitas.

## Contratação existente e duração negociada

O formulário lista contratações `SOLICITADA` ou `ACEITA` ainda sem agendamento, do mesmo responsável, idoso e serviço. Quando há uma única opção para o item, ela é pré-selecionada. O cuidador pode escolher o vínculo ou indicar que se trata de novos atendimentos; o responsável vê essa escolha no cartão.

No aceite, a primeira data de cada item atualiza a contratação vinculada. As demais datas geram contratações no módulo existente, uma por atendimento. Todas ficam relacionadas ao item da proposta. Contratações agendadas, encerradas ou já formalizadas por outra proposta não podem ser reutilizadas.

A duração negociada passa a valer na contratação vinculada **somente depois do aceite**. Por exemplo, uma solicitação original de cinco horas pode ser renegociada para quatro horas, cabendo na disponibilidade das 08h às 12h. O preço e a duração do perfil do cuidador não são alterados. O contrato guarda o valor negociado e o preço-base registrado no envio, independentemente de mudanças posteriores no perfil.

## Preparação local

A migration `20261022180000_propostas_chat` foi aplicada ao banco **`pj_laco_integra_caue`**, preservando os registros anteriores. Nenhum reset foi executado. O banco antigo `pj_laco` não foi alterado.

Reinicie a API para carregar o código e o Prisma Client atualizados. Em outra máquina, aplique as migrations antes de iniciar:

```bash
cd api
npm run db:generate
npm run db:migrate
npm run start:dev
```

```bash
cd mobile
npm start
```

A regra atual do chat foi preservada: responsável e cuidador precisam ter uma contratação entre si para conversar. O cuidador deve estar aprovado e ativo, com serviços ativos e disponibilidade cadastrada. O login de autocuidado continua usando o perfil de responsável existente.

## Teste manual completo

1. Como responsável, solicite um serviço de cuidador aprovado. Como cuidador, abra a conversa em **Mensagens**.
2. Toque no ícone à esquerda da digitação. Confira a opção **Criar proposta de atendimento** e abra a tela.
3. Selecione o idoso. Adicione um serviço e confira o preço e a duração iniciais do perfil. Altere o valor negociado e a duração em minutos ou horas. A mudança de duração limpa as datas anteriores para nova seleção.
4. Confira a contratação vinculada ao item. Adicione outro serviço se necessário. Uma mesma contratação não pode ser vinculada a dois itens.
5. Toque em **Selecionar datas e horários**. Selecione dias destacados e horários livres. Adicione várias datas. Datas ocupadas, horários sobrepostos aos outros itens da proposta e intervalos já selecionados não podem ser escolhidos.
6. Se nenhuma data aparecer, confira a duração: um serviço de cinco horas não cabe em uma disponibilidade de quatro horas. O calendário também exclui datas passadas e reservas existentes.
7. Confira o resumo de horários, observações e total. Toque em **Revisar proposta** e depois **Enviar proposta**. Verifique o cartão no chat de ambos; ele deve estar **Aguardando confirmação**, sem novos atendimentos na agenda.
8. Como responsável, teste **Solicitar alterações**, preenchendo os ajustes. Como cuidador, toque em **Criar nova versão**. Os dados são reaproveitados; o envio recebe outra versão. A anterior preserva sua resposta. Teste também a recusa, que não cria contratos nem reservas.
9. Envie uma nova versão válida e aceite como responsável. Abra a agenda de ambos: todas as sessões devem aparecer, com os dados negociados. Abra o histórico: a contratação vinculada deve ter sido reutilizada e os demais atendimentos devem estar vinculados à proposta.
10. Tente aceitar a mesma proposta em duas sessões simultaneamente. Apenas uma confirmação deve ocorrer; a outra recebe conflito, sem duplicar contratos ou reservas.
11. Envie uma proposta com data livre e reserve esse horário em outra contratação antes do aceite. O aceite deve falhar, mantendo a proposta pendente e sem criar parte dos atendimentos. Envie uma nova versão com outras datas.
12. Altere o preço-base do perfil e confira que o cartão e os contratos aceitos mantêm os preços negociados. Cancele uma contratação em **Histórico** e atualize as agendas: o atendimento deve aparecer cancelado nos dois perfis. O cartão preserva os termos e mostra a contratação cancelada.
13. Teste outro responsável sem participação: ele não pode consultar contexto, horários ou propostas nem confirmar atendimentos. O cuidador não pode responder à própria proposta. Remover o vínculo do responsável com o idoso impede a confirmação.

## Modelos e regras no banco

- `PropostaAtendimento`: responsável, cuidador, idoso, negociação, versão, status, total decimal, observações, resposta e datas de envio/decisão.
- `ItemPropostaAtendimento`: oferta original, snapshot do nome e preço-base, valor negociado, duração, datas e contratação de origem opcional.
- `Mensagem.propostaId`: relaciona o cartão à conversa direta existente; mensagens anteriores continuam válidas.
- `Contratacao.itemPropostaId` e `sessaoProposta`: identificam a sessão confirmada e impedem duplicá-la.
- Status: `PENDENTE`, `ACEITA`, `RECUSADA`, `ALTERACOES_SOLICITADAS`, `SUBSTITUIDA`.
- Índices únicos garantem uma versão por negociação e no máximo uma proposta pendente/aceita na mesma negociação.
- Propostas aceitas e recusadas não possuem endpoint de edição. Revisões criam novos registros, preservando os anteriores. Revisões de propostas aceitas são bloqueadas.
- Valores usam `Decimal(10,2)` e cálculos com `Prisma.Decimal`; o formulário calcula em centavos inteiros. Preço e total são enviados como strings decimais.
- Datas são instantes ISO com offset e ficam em `TIMESTAMPTZ(3)`. Disponibilidade e apresentação usam `America/Sao_Paulo`.
- A confirmação mantém travas nas contratações de origem e no cuidador. O vínculo com o idoso também fica protegido contra remoção durante a transação. A restrição de sobreposição existente no PostgreSQL permanece como proteção adicional.

## Endpoints adicionados

Prefixo: `/mensagens/conversas/:usuarioId/propostas`, onde `usuarioId` é o outro participante.

| Método | Complemento | Uso |
| --- | --- | --- |
| GET | `/contexto` | Idosos vinculados ao responsável, ofertas ativas e contratos reutilizáveis |
| GET | `/horarios?mes=AAAA-MM&duracaoMinutos=120` | Dias e horários livres para a duração negociada |
| GET | nenhum | Histórico completo das propostas entre os participantes, com status dos contratos e reservas |
| POST | nenhum | Criar proposta ou nova versão (`anteriorId`) |
| POST | `/:id/resposta` | `ACEITA`, `RECUSADA` ou `ALTERACOES_SOLICITADAS`, com resposta opcional; alterações exigem descrição |

Exemplo de envio:

```json
{
  "idosoId": 1,
  "total": "240.00",
  "observacoes": "Acompanhamento pela manhã",
  "itens": [{
    "cuidadorServicoId": 1,
    "contratacaoOrigemId": 1,
    "preco": "120.00",
    "duracaoMinutos": 240,
    "inicios": ["2026-11-02T08:00:00-03:00", "2026-11-04T08:00:00-03:00"]
  }]
}
```

O exemplo exige disponibilidade real nas datas escolhidas. `contratacaoOrigemId`, `anteriorId` e `observacoes` são opcionais. Os IDs devem pertencer aos participantes e às ofertas da conversa. Todas as rotas exigem sessão; o serviço também impede acesso administrativo irrestrito às propostas.

## Arquivos criados e modificados

Criados:

- `api/src/proposta/proposta.{controller,dto,module,service}.ts`.
- `api/src/contratacao/agenda-disponivel.ts`: consulta e validação de disponibilidade compartilhadas.
- `api/prisma/migrations/20261022180000_propostas_chat/migration.sql`.
- `api/test/propostas-chat.e2e-spec.ts`.
- `mobile/src/screens/CriarPropostaScreen.tsx`.
- `mobile/src/components/PropostaCard.tsx`.
- `mobile/src/services/propostas.ts`, `mobile/src/utils/propostas.ts` e `mobile/test/propostas.test.mjs`.
- Este guia.

Modificados:

- `api/prisma/schema.prisma`: modelos e relações novos.
- `api/src/app.module.ts`, `api/src/auth/session.guard.ts`: registro e autorização do módulo.
- `api/src/mensagem/{mensagem.service,mensagem.controller,mensagem.module}.ts`: referência ao cartão e reaproveitamento da autorização existente.
- `api/src/contratacao/{contratacao.service,contratacao.module,agenda.controller}.ts`: compartilhamento do agendamento transacional, origem das condições e dados completos das agendas.
- `mobile/src/screens/ConversaScreen.tsx`: ícone, acesso ao formulário, cartões e atualização de status.
- `mobile/src/screens/{Agenda,Historico}Screen.tsx`: condições negociadas e origem da contratação.
- `mobile/src/services/mensagens.ts`: referência à proposta na mensagem.
- `mobile/src/types/navigation.ts`, `mobile/src/routes/AppRoutes.tsx`: nova tela no navegador existente.

## Verificação e limites

Comandos:

```bash
cd api
npm run build
npm run lint
npm test
npm run test:e2e
```

```bash
cd mobile
npm run typecheck
npm run lint
npm test
npx expo export --platform web --output-dir /tmp/laco-propostas-web
```

O runner E2E cria e remove somente um banco temporário `laco_test_*`. A suíte nova cobre chat e dados do formulário, autorização, horários de cinco e duas horas, decimais, fuso, datas passadas, sobreposição, cartões pendentes, solicitações de alteração, recusa, versões, aceite concorrente, reaproveitamento da contratação, snapshots de preços, reservas e dados nas duas agendas, conflitos posteriores ao envio, cancelamento e revogação de vínculo.

Limites atuais:

- Até dez itens, trinta datas por item e sessenta atendimentos por proposta; duração de um a 720 minutos. O calendário oferece horários em passos de quinze minutos, do mês atual até os próximos doze meses.
- Alterações em uma contratação já confirmada devem preservar a proposta aceita: cancele o atendimento e formalize as novas condições em outra proposta. Não há edição silenciosa de termos aceitos.
- Propostas enviadas são persistidas; rascunhos não enviados ficam na memória.
- O chat continua dependendo de contratação prévia entre os participantes. A conversa atualiza por polling a cada quatro segundos após a consulta anterior; a agenda em foco atualiza automaticamente a cada dez segundos.
- A abertura pelo ícone, a aparência dos cartões e a interação com o calendário devem ser conferidas em aparelho/emulador pelo roteiro acima. A exportação web verifica o empacotamento; não substitui teste visual ou cliques em dispositivo.


Resultados da validação nesta implementação:

- API: build, lint e validação Prisma aprovados; 22 testes unitários e 54 testes E2E aprovados (oito cenários novos de propostas).
- Mobile: TypeScript e testes aprovados; lint sem erros, com um aviso preexistente de `require()` em `services/notificacoes.ts`.
- Exportação web concluída em `/tmp/laco-propostas-web`.
- Migration aplicada ao banco da branch, com contagem de usuários, contratações e mensagens preservada.
- Conferência visual/cliques em aparelho ou emulador permanecem como teste manual pelo roteiro acima.
