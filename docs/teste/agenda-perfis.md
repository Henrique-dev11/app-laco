# Disponibilidade, agenda, agendamento e perfis

## Problemas corrigidos

- A agenda consultava apenas `/agendamentos`; nunca consultava a recorrência semanal. Agora o cuidador vê disponibilidade semanal em cartões com fundo e borda distintos, além dos atendimentos confirmados ou cancelados.
- O histórico mostrava campos livres de data/hora, sem consultar capacidade real. Agora ele abre uma tela própria com calendário e horários calculados no servidor.
- O formulário de disponibilidade adicionava e ativava/desativava, mas não editava intervalos. Agora preenche o formulário com o intervalo escolhido e salva pelo PATCH existente.
- As listas buscavam os dados só ao montar. Agora recarregam quando a tela recebe foco e também oferecem atualização manual, cancelando respostas de telas que perderam foco.
- A API bloqueava POST e GET de idosos para responsáveis, e a criação não vinculava o novo idoso à conta. As rotas existentes agora criam o vínculo na mesma operação e listam apenas idosos autorizados.
- A edição de perfil cobria apenas nome/nome social. As novas telas carregam os dados do perfil, editam contato/endereço e, para cuidadores, informações profissionais. Atualizam usuário e perfil juntos, sem mudar senha, aprovação ou papel.

## Telas e funcionamento

**Disponibilidade:** múltiplas janelas por dia, edição, ativação e desativação. É uma recorrência semanal, não uma reserva. Alterar a recorrência não cancela atendimentos já confirmados.

**Agendar atendimento:** acessível no histórico de uma contratação ACEITA sem agendamento. O calendário habilita somente os dias com opções livres para a duração registrada no contrato. Ao escolher um dia, o responsável escolhe início e término e confirma. O servidor gera opções a cada 15 minutos a partir do início de cada intervalo, no mês escolhido, do mês atual até 12 meses à frente. A apresentação/interpretação usa `America/Sao_Paulo`, sem depender do fuso do navegador.

**Agenda:** disponibilidade semanal do cuidador separada visualmente dos atendimentos datados. Os atendimentos mostram idoso, cuidador, serviço, início, término e status. O responsável pode ver todos os seus atendimentos ou filtrar por idoso. O histórico continua com solicitações e alterações de status; para cancelar uma contratação, use o histórico. Cancelados continuam visíveis na agenda e não bloqueiam novas reservas.

**Editar perfil do cuidador / responsável:** nome, nome social, e-mail, telefones, CPF, nascimento e endereço; cuidador também edita biografia, experiência e registro profissional. A tela envia apenas os campos alterados, atualiza a sessão exibida e informa sucesso/erro. A alteração de senha existente permanece em endpoint separado, com bcrypt e revogação de sessões.

**Meus idosos:** acessível na Home e no Perfil. Lista apenas os idosos vinculados; permite adicionar, consultar, editar e buscar cuidador já selecionando aquele idoso. A edição também é acessível no detalhe do idoso. É possível copiar o endereço do responsável para o formulário; a criação grava um endereço próprio do idoso. Nome e nascimento/endereço são obrigatórios; CPF e telefone são opcionais. O vínculo usa o responsável da sessão, nunca um ID enviado pelo cliente.

## API

| Método e rota | Mudança |
| --- | --- |
| `GET /contratacoes/:id/horarios?mes=YYYY-MM` | Única rota nova: horários livres para a contratação, com `mes`, `fuso`, `duracaoMinutos`, `intervaloMinutos` e `datas: [{ data, horarios: [{ inicio, fim, horaInicio, horaFim }] }]`. Apenas o responsável participante ou administrador. |
| `POST /contratacoes/:id/agendamento` | Rota mantida. Revalida status, aprovação, oferta, futuro, duração, disponibilidade e conflito. Usa a mesma trava de cuidador da edição de disponibilidade. |
| `GET /agendamentos?idosoId=ID` | Filtro opcional por idoso, preservando o filtro por participante. Inclui o ID e nome social do idoso. Continua retornando uma lista de atendimentos, sem misturar recorrências. |
| `POST /cuidadores/:cuidadorId/disponibilidades` | Rota mantida; gravação serializada por cuidador. |
| `PATCH /disponibilidades/:id` | Edição/ativação serializada e validação de valores nulos e sobreposição. |
| `GET /cuidadores/:cuidadorId/disponibilidades` | Rota existente reutilizada na agenda e na edição. Horas continuam no formato HH:MM. |
| `POST /idosos` | Responsável cria idoso e vínculo automaticamente, sem cadastro órfão. Campo opcional `parentesco` usa o enum existente; padrão OUTRO. Nome social também aceito. Administradores preservam o acesso anterior. |
| `GET /idosos` | Responsável vê apenas seus idosos; administrador mantém a consulta completa. |
| `PATCH /idosos/:id` | Inclui nome social, validações de CPF/nascimento, endereço parcial e campos obrigatórios. CPF e telefone opcionais podem ser apagados com null. Acesso exige vínculo ou administração. |
| `PATCH /responsaveis/:id` e `PATCH /cuidadores/:id` | Mantêm os campos anteriores e aceitam `usuario?: { nome?, nomeSocial?, email?, telefone2? }` para atualização atômica com perfil/endereço. Não aceitam senha, papel ou status nesse objeto. |
| `PATCH /usuarios/:id` | Aceita também telefone secundário, preservando edição própria. |

Os endpoints antigos de detalhe e vínculo continuam disponíveis com autorização. Um responsável não pode se vincular arbitrariamente a um idoso de outra conta. O filtro por idoso da agenda não amplia permissões: são exibidos os contratos em que o usuário já participa.

## Banco de dados

Não foi necessário alterar o schema nem criar outra migration nesta etapa. São reutilizados `Disponibilidade`, `Agendamento`, `Contratacao`, `ResponsavelIdoso`, perfis, usuários e endereços.

Permanecem os índices/constraints de exclusão PostgreSQL que impedem sobreposição de disponibilidades e de agendamentos, inclusive sob concorrência. A nova trava coordena edição de recorrência e reserva. Os status e a duração registrada na contratação continuam sendo usados; uma oferta editada não muda a duração contratada.

Nenhum reset foi executado. Os testes de integração usam exclusivamente um banco temporário `laco_test_*`, com migrations completas, e removem esse banco ao final. A migration de referências de serviços criada na etapa anterior continua necessária em instalações que ainda não a aplicaram.

## Roteiro manual

Inicie a API em `api/` com `npm run start:dev` e o mobile web em `mobile/` com `npm run web`, mantendo cada processo em seu terminal. Para navegador no computador, mantenha a API em `http://localhost:3000` no `.env` do mobile. Use um cuidador aprovado e um responsável de desenvolvimento.

1. **Recorrência e agenda do cuidador:** em Disponibilidade, adicione segunda-feira 08:00–12:00, segunda-feira 13:00–17:00 e sábado 08:00–12:00. Abra Agenda: as três janelas devem aparecer como recorrência, sem criar atendimentos. Volte, edite um intervalo e confira a atualização ao retornar à agenda. Desative/reative e confira os rótulos.
2. **Validações de disponibilidade:** tente final menor/igual ao início, hora inválida e intervalo sobreposto. Deve haver erro e nenhuma gravação inválida. Intervalos adjacentes são permitidos.
3. **Múltiplos idosos:** no responsável, abra Meus idosos → Adicionar idoso, preencha e salve. Repita para outro idoso. Abra detalhes e edição, altere nome social/endereço/necessidades e salve. Reabra para confirmar persistência. Use Buscar cuidador para este idoso e confira a seleção.
4. **Contratação e calendário:** solicite serviço de duração 240 minutos para um dos idosos. O cuidador deve aceitar no histórico. No responsável, abra Histórico → Agendar atendimento. Selecione uma segunda ou sábado futuros. Para a janela 08:00–12:00, só 08:00 deve ser oferecido. Na segunda com segunda janela, 13:00 também deve aparecer. Dias sem disponibilidade e horários passados ficam indisponíveis.
5. **Confirmação nas duas agendas:** confirme 08:00–12:00. Abra Agenda no responsável e no cuidador: idoso, serviço e horário devem coincidir. No responsável, filtre pelo idoso contratado e depois pelo outro: o atendimento deve aparecer apenas no filtro correto.
6. **Concorrência e conflito:** em duas sessões, selecione o mesmo horário para contratos distintos do mesmo cuidador. Confirme ambos: apenas um deve ser salvo. O outro recebe mensagem e a lista é consultada novamente. Nenhum atendimento pode ultrapassar o fim da janela.
7. **Cancelamento:** cancele a contratação pelo histórico. Volte às duas agendas: o registro deve estar cancelado. Em outra contratação aceita e ainda sem reserva, o horário liberado deve voltar a ser oferecido. Alterar/desativar a recorrência não apaga um atendimento já confirmado.
8. **Perfis:** em Perfil → Editar meus dados, altere telefone, nome social e um campo do endereço, salve e volte. Reabra para confirmar. No cuidador, faça o mesmo com dados profissionais. Nome em branco, CPF inválido, nascimento futuro e endereço obrigatório vazio devem ser rejeitados. E-mail duplicado deve apresentar conflito sem salvar parcialmente o endereço.
9. **Permissões:** com outro responsável, não devem aparecer idosos ou atendimentos da primeira conta, nem ser possível alterar seus perfis/idosos ou consultar horários de contratos alheios. O cuidador não agenda em nome do responsável.
10. **Retorno às telas:** após cadastro/edição/agendamento/cancelamento, volte à lista, histórico e agenda; os dados devem recarregar. Mudanças feitas por outro dispositivo podem ser consultadas pelo botão Atualizar ou ao reabrir a tela; não foi implementado push em tempo real.

## Verificações automatizadas

Em `api/`:

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

Os testes incluem cálculo em São Paulo, limites e janelas múltiplas, dias compatíveis, duração de 240 minutos, horários passados, reserva concorrente, ambas as agendas, filtro por idoso, cancelamento liberando horário, dois idosos por responsável, persistência de perfil/endereço e autorização. Os cenários anteriores de cadastro, serviços, conclusão e avaliação também continuam na suíte.

Em `mobile/`:

```bash
npm run typecheck
npm run lint
npm test
npx expo export --platform web --output-dir /tmp/laco-agenda-web
```

Os testes do mobile cobrem calendário bissexto, mudança de mês/ano, data de São Paulo e envio parcial de edições, além dos testes anteriores de preço/duração. O bundle verifica a integração dos componentes e imports. Não foi realizada navegação visual completa em navegador/aparelho; use o roteiro acima para essa conferência.

Resultado da verificação: build e lint da API aprovados; 22 testes unitários e 46 testes de integração aprovados; TypeScript, lint, testes do mobile e exportação web aprovados.

## Arquivos desta etapa

- [`api/README.md`](../../api/README.md)
- [`api/src/auth/auth.service.ts`](../../api/src/auth/auth.service.ts)
- [`api/src/auth/session.guard.ts`](../../api/src/auth/session.guard.ts)
- [`api/src/common/pessoas.ts`](../../api/src/common/pessoas.ts)
- [`api/src/contratacao/agenda.controller.ts`](../../api/src/contratacao/agenda.controller.ts)
- [`api/src/contratacao/contratacao.controller.ts`](../../api/src/contratacao/contratacao.controller.ts)
- [`api/src/contratacao/contratacao.service.ts`](../../api/src/contratacao/contratacao.service.ts)
- [`api/src/contratacao/dto/agenda-query.dto.ts`](../../api/src/contratacao/dto/agenda-query.dto.ts)
- [`api/src/contratacao/dto/horarios.dto.ts`](../../api/src/contratacao/dto/horarios.dto.ts)
- [`api/src/contratacao/horarios.spec.ts`](../../api/src/contratacao/horarios.spec.ts)
- [`api/src/contratacao/horarios.ts`](../../api/src/contratacao/horarios.ts)
- [`api/src/cuidador/cuidador.service.ts`](../../api/src/cuidador/cuidador.service.ts)
- [`api/src/cuidador/dto/update-cuidador.dto.ts`](../../api/src/cuidador/dto/update-cuidador.dto.ts)
- [`api/src/disponibilidade/disponibilidade.service.ts`](../../api/src/disponibilidade/disponibilidade.service.ts)
- [`api/src/disponibilidade/dto/update-disponibilidade.dto.ts`](../../api/src/disponibilidade/dto/update-disponibilidade.dto.ts)
- [`api/src/idoso/dto/create-idoso.dto.ts`](../../api/src/idoso/dto/create-idoso.dto.ts)
- [`api/src/idoso/dto/update-idoso.dto.ts`](../../api/src/idoso/dto/update-idoso.dto.ts)
- [`api/src/idoso/idoso.controller.ts`](../../api/src/idoso/idoso.controller.ts)
- [`api/src/idoso/idoso.service.ts`](../../api/src/idoso/idoso.service.ts)
- [`api/src/responsavel/dto/create-endereco.dto.ts`](../../api/src/responsavel/dto/create-endereco.dto.ts)
- [`api/src/responsavel/dto/update-endereco.dto.ts`](../../api/src/responsavel/dto/update-endereco.dto.ts)
- [`api/src/responsavel/dto/update-responsavel.dto.ts`](../../api/src/responsavel/dto/update-responsavel.dto.ts)
- [`api/src/responsavel/responsavel.service.ts`](../../api/src/responsavel/responsavel.service.ts)
- [`api/src/usuario/dto/update-usuario.dto.ts`](../../api/src/usuario/dto/update-usuario.dto.ts)
- [`api/src/usuario/usuario.service.ts`](../../api/src/usuario/usuario.service.ts)
- [`api/test/agenda-perfis.e2e-spec.ts`](../../api/test/agenda-perfis.e2e-spec.ts)
- [`docs/teste/agenda-perfis.md`](../../docs/teste/agenda-perfis.md)
- [`mobile/src/components/CalendarioDisponivel.tsx`](../../mobile/src/components/CalendarioDisponivel.tsx)
- [`mobile/src/components/EnderecoForm.tsx`](../../mobile/src/components/EnderecoForm.tsx)
- [`mobile/src/hooks/useListaApi.ts`](../../mobile/src/hooks/useListaApi.ts)
- [`mobile/src/routes/AppRoutes.tsx`](../../mobile/src/routes/AppRoutes.tsx)
- [`mobile/src/screens/AgendaScreen.tsx`](../../mobile/src/screens/AgendaScreen.tsx)
- [`mobile/src/screens/AgendarAtendimentoScreen.tsx`](../../mobile/src/screens/AgendarAtendimentoScreen.tsx)
- [`mobile/src/screens/BuscarCuidadorScreen.tsx`](../../mobile/src/screens/BuscarCuidadorScreen.tsx)
- [`mobile/src/screens/DisponibilidadeScreen.tsx`](../../mobile/src/screens/DisponibilidadeScreen.tsx)
- [`mobile/src/screens/EditarPerfilScreen.tsx`](../../mobile/src/screens/EditarPerfilScreen.tsx)
- [`mobile/src/screens/HistoricoScreen.tsx`](../../mobile/src/screens/HistoricoScreen.tsx)
- [`mobile/src/screens/HomeScreen.tsx`](../../mobile/src/screens/HomeScreen.tsx)
- [`mobile/src/screens/IdosoDetalhesScreen.tsx`](../../mobile/src/screens/IdosoDetalhesScreen.tsx)
- [`mobile/src/screens/IdosoFormularioScreen.tsx`](../../mobile/src/screens/IdosoFormularioScreen.tsx)
- [`mobile/src/screens/MeusIdososScreen.tsx`](../../mobile/src/screens/MeusIdososScreen.tsx)
- [`mobile/src/screens/PerfilScreen.tsx`](../../mobile/src/screens/PerfilScreen.tsx)
- [`mobile/src/types/auth.ts`](../../mobile/src/types/auth.ts)
- [`mobile/src/types/navigation.ts`](../../mobile/src/types/navigation.ts)
- [`mobile/src/utils/calendario.ts`](../../mobile/src/utils/calendario.ts)
- [`mobile/src/utils/perfis.ts`](../../mobile/src/utils/perfis.ts)
- [`mobile/test/calendario-perfis.test.mjs`](../../mobile/test/calendario-perfis.test.mjs)
