Git e GitHub — Guia Inicial do Projeto Laço

Este documento registra os principais comandos de Git e GitHub utilizados na configuração inicial do projeto Laço.

O objetivo é manter um histórico simples para consulta durante o desenvolvimento.

G0 — Verificar e configurar o Git

Primeiro, verificamos se o Git está instalado:

git --version

Resultado esperado:

git version 2.x.x

Também pode ser utilizado:

git -v
Configurar o autor dos commits

Definimos o nome que aparecerá nos commits:

git config --global user.name "Henrique-dev11"

O nome não precisa ser igual ao usuário do GitHub. Também poderia ser, por exemplo:

git config --global user.name "Cauê Henrique"

Depois configuramos o e-mail:

git config --global user.email "seu-email@email.com"

Para verificar:

git config --global user.name
git config --global user.email

Essas configurações serão utilizadas pelo Git para identificar o autor dos commits.

G1 — Inicializar o repositório

O Git foi inicializado na pasta raiz do projeto, permitindo que API, aplicativo, web e documentação sejam controlados pelo mesmo repositório.

Dentro da raiz:

git init -b main
O que faz?
git init

transforma a pasta atual em um repositório Git.

Já:

-b main

define main como a branch inicial.

O comando:

git init -b main

não cria um projeto no GitHub, não envia arquivos para a internet e não cria commits.

Ele apenas cria o repositório Git local.

Internamente será criada a pasta oculta:

.git/

Ela contém informações como histórico, commits, branches e configurações do repositório.

G2 — Verificar o estado do repositório

Utilizamos:

git status

Esse é um dos comandos mais importantes do Git.

Ele responde basicamente:

Qual é o estado atual do meu repositório?

No começo apareceu algo semelhante a:

On branch main

No commits yet

nothing to commit

Isso significa:

branch atual = main
commits = nenhum
alterações = nenhuma

Durante todo o projeto utilizaremos git status para verificar o que está acontecendo antes de executar outras operações.

G3 — Criar o .gitignore

Criamos:

.gitignore

para informar ao Git quais arquivos não devem ser versionados.

Para editar pelo terminal:

nano .gitignore

Configuração inicial:

# Dependências Node
node_modules/

# Variáveis de ambiente
.env
.env.*
!.env.example

# Build
dist/
build/

# Testes
coverage/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Expo / React Native
.expo/

# Sistema operacional
.DS_Store
Thumbs.db

# Arquivos temporários
*.tmp
*.temp

No Nano:

Ctrl + O
Enter
Ctrl + X

significa:

Ctrl + O → salvar
Enter    → confirmar
Ctrl + X → sair
Por que .gitignore é importante?

Por exemplo:

node_modules/

impede o versionamento das dependências instaladas pelo Node.

Já:

.env

é especialmente importante porque futuramente esse arquivo poderá conter:

DATABASE_URL
JWT_SECRET
tokens
chaves
senhas

Essas informações não devem ser enviadas ao GitHub.

A regra:

*.log

usa * como coringa e ignora arquivos como:

api.log
error.log
npm.log

E:

.env.*

ignora:

.env.local
.env.production
.env.development

Porém:

!.env.example

cria uma exceção.

Isso permite versionar:

.env.example

sem versionar os arquivos contendo dados reais.

Importante:

O .gitignore não apaga arquivos. Ele apenas informa ao Git que aqueles arquivos não devem ser versionados.

G4 — README e primeiro commit

O README.md apresenta o projeto para quem acessar o repositório.

Normalmente contém informações como:

Nome do projeto
Objetivo
Descrição
Tecnologias
Estrutura
Como executar
Status do desenvolvimento

Depois de criar o README.md, usamos:

git status

Inicialmente os arquivos apareceram como:

Untracked files:

.gitignore
README.md

Untracked significa:

O arquivo existe no computador, mas o Git ainda não está acompanhando suas versões.

git add — preparar arquivos

Utilizamos:

git add .gitignore README.md

Esse comando coloca os arquivos na Staging Area.

O fluxo é:

Working Directory
       │
       │ git add
       ▼
 Staging Area
       │
       │ git commit
       ▼
 Repositório Git
Working Directory

É onde trabalhamos normalmente:

README.md
.gitignore
códigos
documentos
Staging Area

Representa os arquivos escolhidos para participar do próximo commit.

Por exemplo:

git add README.md

prepara apenas o README.md.

Já:

git add .

prepara todas as alterações da pasta atual e suas subpastas que não estiverem ignoradas.

Por enquanto estamos utilizando arquivos específicos para entender melhor o processo.

Criar o primeiro commit

Depois do git add, executamos:

git commit -m "chore: inicia estrutura do projeto"

O:

-m

significa:

message

Portanto o comando registra uma nova versão do projeto com a mensagem:

chore: inicia estrutura do projeto
Conventional Commits

Estamos utilizando uma convenção simples para organizar as mensagens.

feat:
nova funcionalidade

fix:
correção de problema

docs:
documentação

refactor:
reorganização de código

test:
criação ou alteração de testes

chore:
configuração ou manutenção

Exemplos futuros:

git commit -m "feat: adiciona autenticação JWT"
git commit -m "feat: cria cadastro de cuidadores"
git commit -m "fix: corrige validação de email"
git commit -m "docs: adiciona MER do projeto"
Visualizar os commits

Utilizamos:

git log --oneline

Esse comando apresenta o histórico de maneira resumida.

Exemplo:

a81f293 chore: inicia estrutura do projeto

O código:

a81f293

é parte do identificador único daquele commit.

G5 — Conectar o projeto ao GitHub

Até esse momento o projeto existia somente localmente:

Computador
   ↓
Git

Depois criamos um repositório vazio no GitHub:

Computador                    GitHub
   Git        ────────────►   Repositório

No GitHub criamos o repositório sem adicionar README ou .gitignore, pois esses arquivos já existiam localmente.

Verificar repositórios remotos

Utilizamos:

git remote -v

Antes de configurar o GitHub, nenhuma informação deveria aparecer.

Adicionar o GitHub como remoto

Utilizamos:

git remote add origin URL_DO_REPOSITORIO

Exemplo:

git remote add origin https://github.com/usuario/app-web-laco.git

Aqui:

origin

é o nome dado ao repositório remoto principal.

Conceitualmente:

origin
   ↓
GitHub

Depois verificamos:

git remote -v

Resultado semelhante a:

origin  https://github.com/.../app-web-laco.git (fetch)
origin  https://github.com/.../app-web-laco.git (push)
Verificar branches

Utilizamos:

git branch

Resultado:

* main

O:

*

indica a branch atual.

Enviar o projeto para o GitHub

O primeiro envio foi feito utilizando:

git push -u origin main
Significado
git push
→ envia commits

origin
→ repositório remoto

main
→ branch que será enviada

-u
→ cria uma associação entre main e origin/main

Depois disso:

main local
     ↕
origin/main

ficam relacionadas.

Nos próximos envios normalmente será suficiente:

git push
Autenticação HTTPS

Como utilizamos uma URL:

https://github.com/...

a conexão utiliza HTTPS.

O GitHub não utiliza a senha normal da conta para operações Git via HTTPS.

Utilizamos um:

Personal Access Token — PAT

no lugar da senha.

Esse token deve permanecer privado.

Nunca devemos colocar um PAT em:

README
.env versionado
código
commit
documentação
mensagens

Se um token for exposto, ele deverá ser revogado no GitHub.

Fluxo básico que utilizaremos

O fluxo normal daqui para frente será:

Alterar arquivos
      ↓
git status
      ↓
git add
      ↓
git status
      ↓
git commit
      ↓
git push
      ↓
GitHub

Exemplo:

git status
git add README.md
git commit -m "docs: atualiza documentação"
git push
Comandos aprendidos até agora
Comando	Função
git --version	Verifica a versão instalada
git config --global user.name	Configura/verifica o autor
git config --global user.email	Configura/verifica o e-mail
git init -b main	Inicializa um repositório
git status	Verifica o estado atual
git add arquivo	Adiciona arquivo à Staging Area
git commit -m "..."	Registra uma versão
git log --oneline	Mostra o histórico resumido
git remote -v	Mostra os remotos
git remote add origin URL	Liga o repositório ao GitHub
git branch	Mostra as branches
git push -u origin main	Faz o primeiro envio da main
git push	Envia novos commits posteriormente
Estado atual
Git instalado/configurado          ✓
Repositório local                  ✓
.gitignore                         ✓
README                             ✓
Primeiro commit                    ✓
GitHub conectado                   ✓
Primeiro push                      ✓
main ↔ origin/main                 ✓