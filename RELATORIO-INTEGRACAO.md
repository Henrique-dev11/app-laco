# Relatório de integração — app-que-meu + app-laco-main

Resultado: `app-laco-integrado/` (api + mobile + web + docs). Os dois projetos originais não foram alterados.
Nenhum commit/push foi feito.

## 1. Inventário e comparação

| Camada | app-laco-main (B) | app-que-meu (A) | Integrado |
|---|---|---|---|
| API NestJS (pasta) | `api/` | `api-laco/` | `api/` (nome do B, que é o dos docs) |
| API: código, rotas, auth, DTOs | 126 arquivos | idênticos ao B | idêntico |
| Banco: schema Prisma + 14 migrations + seed | sim | idênticos ao B | idêntico (sem migration nova) |
| Web (admin + site) e docs | sim | idênticos ao B | idêntico |
| Mobile: telas, rotas, serviços, motion, tema | base | B + evoluções | base A |
| Mobile: dependências (package.json) | igual | igual | igual |

Só o **mobile** diferia. Funcionalidades que existem só no A (mantidas): Home por perfil (cuidador / responsável / idoso),
fonte grande (`theme/tipografia.ts`, `fs()`/`lh()`), busca de CEP (ViaCEP) com aviso, barra de mensagem acima do teclado
(`useAlturaTeclado`), bloqueio de edição de CPF e data de nascimento, botões e campos maiores, testes `home` e `cep`.
Funcionalidades só do B: nenhuma que o A não tivesse — o A é uma versão posterior do B.

## 2. Conflitos analisados
- **Home**: B tinha uma tela única de 481 linhas; A dividiu por perfil. Mantida a do A e conferido item a item.
  O A havia perdido o atalho **"Ver serviços"** (tela `Servicos`) para cuidador e idoso; ele agora está nas duas Homes
  (era alcançável pelo B). Nada mais do B se perdeu.
- **Conversa / teclado**: B usa `KeyboardAvoidingView`; A usa `useAlturaTeclado` + padding (corrige Android com barra de navegação).
  São duas soluções para o mesmo problema; mantida a do A (a que atende o pedido de texto visível acima do teclado).
- **Endereço do idoso** (`ResponsavelScreens`): B listava campos soltos; A usa `EnderecoForm` com CEP automático. Mantido o do A.

## 3. Arquivos modificados em relação ao A
- `mobile/src/screens/home/HomeCuidador.tsx` — atalho "Ver serviços".
- `mobile/src/screens/home/HomeIdoso.tsx` — atalho grande "Ver serviços".
- Pasta `api-laco` renomeada para `api`.
- Removidos do pacote (gerados/locais): `node_modules`, `dist`, `src/generated/prisma`, `.expo`, `*.tsbuildinfo` e os arquivos `.env`.

## 4. Validação
| Verificação | Resultado |
|---|---|
| Mobile `tsc --noEmit` | 0 erros |
| Mobile `expo lint` | 0 erros, 1 aviso (já existia nos dois: `require()` em `services/notificacoes.ts`) |
| Mobile testes (`npm test`) | 38 de 38 passaram |
| API `tsc` do código de produção (`tsconfig.build.json`) | 0 erros |
| API `oxlint` | 0 erros, 0 avisos |
| API testes unitários (vitest) | 22 de 22 passaram |
| Web testes | 6 de 6 passaram |
| Front × back | 26 chamadas do mobile conferidas com as rotas da API: todas existem |

## 5. Não foi possível validar / pendências
- **Testes e2e da API** (`npm run test:e2e`): exigem PostgreSQL; não havia banco no ambiente. Rode localmente.
- **`prisma generate`**: o ambiente não acessa binaries.prisma.sh. Para a checagem de tipos usei o client gerado que veio no A (e removi do pacote).
  Rode `npm run db:generate` e `npm run db:migrate` na pasta `api`.
- `tsc` completo da API (com `test/`) acusa 26 erros só nos arquivos e2e (`any` implícito e `supertest/types`), nos dois originais também; não afetam a build.
- Não testei no aparelho/emulador (fonte grande, teclado, Home por perfil): só análise estática, tipos e testes.
- Os `.env` não vão no zip: use os seus (`api/.env`, `mobile/.env`) ou copie dos `.env.example`.
