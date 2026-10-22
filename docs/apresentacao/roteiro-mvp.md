# Apresentação do MVP Laço

## Explicação para pessoas que não conhecem o projeto

> O Laço é uma plataforma que conecta cuidadores de idosos e pessoas que procuram cuidado. O responsável pode cadastrar o idoso, encontrar cuidadores com perfil aprovado pela equipe, solicitar serviços e agendar atendimentos. O cuidador cadastra seus serviços, preços e horários e acompanha as solicitações. A equipe administrativa analisa os cadastros e currículos pelo painel web. A versão atual já salva as informações no banco e permite demonstrar esse fluxo completo.

O projeto é um **MVP funcional em desenvolvimento**: uma primeira versão que implementa o fluxo principal e permite validar sua utilização. O protótipo visual evoluiu para telas que gravam e recuperam dados reais.

## O que está implementado

| Área | Entrega atual |
| --- | --- |
| Cadastro | Responsável, cuidador e idoso que usa a própria conta; endereço, nome social, telefone secundário, aceite de termos e serviços |
| Persistência | Cadastro transacional: usuário, perfil e vínculos obrigatórios são gravados juntos |
| Acesso | Login, sessão com expiração, logout, hash de senha e permissões por usuário/papel |
| Perfil | Consulta dos dados salvos e edição de nome/nome social; detalhes do idoso vinculado |
| Serviços | Catálogo real; ofertas do cuidador com preço e duração; preferências do usuário |
| Currículo | Envio de PDF de até 5 MB no cadastro do cuidador e download autorizado |
| Administração | Login administrativo, busca/filtros dos cadastros, análise, aprovação, rejeição, bloqueio e reativação |
| Busca | Consulta de cuidadores aprovados e com conta ativa, com resposta pública reduzida |
| Contratações | Solicitação, aceitação, recusa, cancelamento, conclusão e histórico por participante |
| Disponibilidade | Horários semanais do cuidador; criação, desativação e reativação |
| Agenda | Atendimento por data/hora após aceitação; controle de reservas sobrepostas e liberação do horário cancelado |
| Visual | Interface baseada no `front-laco`, com componentes e navegação consistentes nas telas complementares |

O perfil **Idoso** usa uma conta de responsável ligada ao próprio registro de idoso, com parentesco `PROPRIO`. Não foi criado um tipo separado `IDOSO` na autenticação.

O cuidador pode entrar e acompanhar seu cadastro enquanto está pendente. **Aprovar e ativar** libera seu perfil na busca. A aprovação é uma análise administrativa do cadastro; não representa uma certificação profissional externa.

## Explicação técnica, se perguntarem

```text
Aplicativo React Native/Expo ─┐
                             ├→ API NestJS → Prisma → PostgreSQL
Painel web administrativo ───┘
```

O aplicativo e o painel compartilham a mesma API. Ela valida as informações, verifica as permissões e realiza as operações no banco. O PostgreSQL é executado em Docker no desenvolvimento. O painel usa HTML, CSS e JavaScript com um servidor Node.

Uma fala possível:

> A interface apresenta as informações e envia as ações à API. A API aplica as regras, como permitir que cada participante acompanhe suas próprias contratações. O banco mantém os registros mesmo quando fechamos o aplicativo. As migrations organizam as mudanças na estrutura do banco, e os testes verificam os fluxos e as permissões.

Para explicar o `.env`:

> Cada ambiente pode ter endereços, portas e credenciais diferentes. Guardamos essas configurações em arquivos de ambiente para configurar a máquina sem alterar as telas ou as regras do sistema. O aplicativo recebe apenas o endereço público da API; as credenciais do banco ficam no servidor.

## Demonstração sugerida

Prepare uma conta responsável com um idoso, uma conta cuidador com currículo e serviços e uma conta administrativa. Use informações fictícias e confira o login de todas as contas antes da apresentação.

1. **Apresente a home:** mostre os perfis e explique a finalidade do Laço.
2. **Entre como cuidador:** mostre o perfil salvo e o estado pendente; defina uma disponibilidade futura compatível com o dia da demonstração.
3. **Abra o painel:** consulte o cuidador, baixe seu currículo e use **Aprovar e ativar**.
4. **Entre como responsável:** encontre o cuidador na busca e solicite o serviço para o idoso vinculado.
5. **Entre como cuidador:** aceite a solicitação no histórico.
6. **Volte à conta responsável:** escolha data e hora dentro da disponibilidade e mostre a agenda.
7. **Mostre persistência:** feche/reabra o app ou atualize a página e recupere os dados salvos.

Se houver tempo, demonstre o cancelamento liberando o horário ou uma tentativa de agendamento sobreposto sendo recusada.

Reserve um horário futuro no mesmo dia e use o fuso de São Paulo, como informado nas telas. Cada contratação tem um agendamento nesta versão. Tenha um vídeo ou capturas do fluxo como apoio caso a rede do local não permita comunicação entre celular e computador.

## Evidências de validação

Na etapa anterior, passaram 20 testes de integração da API em PostgreSQL temporário, quatro testes do web, o teste unitário, build, lint e TypeScript. Foram geradas exportações web e Android. A interface e os fluxos do painel foram inspecionados em navegador com registros fictícios; o backend foi testado separadamente com os endpoints reais.

Não confunda exportação Android com publicação de um aplicativo na Play Store. Para apresentar pelo celular, faça antes o roteiro completo no aparelho que será utilizado.

## O que continua em desenvolvimento

Mensagens, notificações, avaliações, pagamento simulado, recuperação de senha e autenticação com Google/Facebook ainda não estão implementados. O site público em `web/site/` é provisório; o painel em `web/admin/` já funciona. Reagendamento direto, hospedagem pública e preparação operacional também são próximas etapas.

Uma forma de encerrar:

> Nesta etapa, entregamos o fluxo central de cadastro, análise administrativa, busca, contratação e agenda, com persistência no banco. As próximas entregas ampliam a comunicação entre os participantes e completam os recursos previstos para o MVP.

Para preparar a execução, consulte [configuração de ambiente](../ferramentas/configuracao-env.md) e [instruções do painel](../../web/README.md).
