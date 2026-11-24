# Financeiro simulado para a demonstração do Laço

A v11 usa Expo e React Native, NestJS com Prisma e PostgreSQL, e um painel
administrativo em JavaScript. O fluxo de propostas mantém o agrupamento de
serviços em visitas e o histórico de contratos existentes. A simulação vale
para novos atendimentos criados com `FINANCEIRO_SIMULADO=1`. Contratos
anteriores seguem o fluxo de conclusão que já usavam.

Na API local, configure `FINANCEIRO_SIMULADO=1` e
`FINANCEIRO_COMISSAO_PONTOS=1000` para 10% ou `0` para desativar a comissão.
As operações são internas e a simulação fica desativada com
`NODE_ENV=production`. O QR contém uma referência textual do Laço, em
formato diferente do usado por bancos. A carteira é calculada a partir do
registro de movimentações, em vez de guardar um saldo independente.

```sh
npm --prefix api ci
npm --prefix api run db:generate
npm --prefix api run db:migrate
npm --prefix api run db:seed:usuarios
npm --prefix api run db:seed:financeiro
npm --prefix api run start:dev
```

Abra o app a partir da pasta `mobile` da v11 e inicie o painel na pasta
`web` com `npm run dev`. O seed usa somente um banco local e preserva os
cenários já cadastrados.

## Roteiro para a banca

1. Entre como `responsavel41@exemplo.test` e como
   `cuidador41@exemplo.test`, em aparelhos ou sessões diferentes. Use a senha
   de desenvolvimento definida pelo seed de usuários.
2. Abra **Histórico → Acompanhar visita e pagamento** na contratação de
   acompanhamento domiciliar de seis horas. O exemplo começa aceito. Para
   demonstrar também a solicitação, use a busca de cuidadores e escolha a
   oferta de seis horas. Aceite a solicitação na conta do cuidador.
3. No responsável, abra o QR demonstrativo e confirme os R$ 150,00. Mostre
   o comprovante e os R$ 135,00 pendentes na carteira. Agende a visita no
   aplicativo. Propostas aceitas já podem ter horário reservado antes
   do pagamento, mas passam a exibir **Agendado** após a retenção.
4. Gere o código de início na conta do responsável e informe-o no cuidador.
   Solicite a confirmação da conclusão pelo cuidador. Emita o segundo
   código na conta do responsável e valide-o pelo cuidador.
5. Confira os R$ 135,00 disponíveis, a comissão de R$ 15,00, o histórico e
   um saque virtual. Volte ao histórico para avaliar o atendimento.
6. No painel **Pagamentos simulados**, mostre o reembolso do par 42 e a
   contestação do par 43. Use a conta administrativa para decidir a
   contestação com uma justificativa. O atendimento demonstrativo 41
   também pode ser cancelado antes do início para mostrar um reembolso.

## API e banco

- `GET /financeiro/visitas/:id` retorna o estágio do atendimento e o
  pagamento. Os POSTs `/qr`, `/pagar`, `/codigo`, `/validar` e `/acao`
  abaixo desse caminho executam as ações de cada perfil.
- `GET /financeiro/pagamentos` lista pagamentos e comprovantes.
  `GET /financeiro/carteira` retorna saldo e movimentações. Os POSTs
  `/financeiro/carteira/referencia` e `/financeiro/carteira/saques`
  preparam e registram um saque com uma chave de idempotência.
- `GET /financeiro/admin/movimentos` é administrativo.
  `POST /financeiro/admin/visitas/:id/resolver` exige administrador e
  justificativa para reembolsar ou liberar uma contestação.
- A migration cria `PagamentoSimulado`, `CodigoAtendimento` e
  `MovimentoSimulado`. Pagamentos são únicos por visita. Os códigos são
  exclusivos para cada etapa, expiram em 15 minutos e são bloqueados após
  cinco tentativas incorretas. É permitido reemitir após 30 segundos.
  A conclusão e o lançamento de crédito são gravados juntos.
- Uma contestação mantém o valor pendente. O fim do horário, sozinho, não
  libera o valor. Cancelar antes de iniciar reembolsa um valor retido.
  Depois de iniciar, abra contestação para tratamento administrativo.

Os históricos exibem até 100 registros recentes. O comprovante é exibido
no app, com identificador, horário e valor. Exportação, notificações
automáticas e filtros financeiros avançados são melhorias futuras.

## Notificações de pagamento

A API registra um aviso no sino do cuidador ao reter o pagamento e outro ao liberar o valor. O push é opcional para cada sessão do cuidador e usa uma fila na API.

Para habilitar o push localmente, vincule a build instalada ao projeto Expo, configure FCM v1 no Android e APNs no iOS e defina `EXPO_PUSH_ATIVO=1` na API. Use `EXPO_PUBLIC_EAS_PROJECT_ID` no mobile quando o identificador vier do ambiente em vez da configuração Expo da build. Se o projeto habilitou autenticação adicional para os envios, configure `EXPO_PUSH_ACCESS_TOKEN` somente no servidor. No app, ative a opção em **Notificações** e aceite a permissão do aparelho. O sino funciona também na web e no Expo Go.

[Configuração oficial do Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/)
