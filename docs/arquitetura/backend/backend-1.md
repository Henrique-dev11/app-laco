Anotações da arquitetura do Backend

Antes de eu inicar o backend fiz uma arquitetura e organização para não ter dificuldades na hora de colocar as tb no prisma.

Como estamos usando o git/github, criaremos um branch próprio para o backend e nela colocaremos todo nosso back lá. Contudo o codigo que utilizei é 

```
git switch -c feature/backend-base
```

Utilizamos o nome "feature" que significa funcionamento. Saimos de documentação para funionalidades. Depois faça a verificação se o branch foi criado. `git branch`.

Agora iniciaremos a verificação do node.js e npm. 
Como NestJS depende do ecossistema Node.js, execute:

```
node --version
```

e:

```
npm --version
```

Não quero que instalemos nada antes de saber o que já existe na sua máquina.

Se ambos retornarem versões normalmente, podemos continuar.

## CRIANDO O Backend no NestJS

Estando na pasta raiz do projeto coloque o primeiro comando que criará a pasta api. 
execute:

```
npx @nestjs/cli new api --package-manager npm --skip-git
```

`npx` Executa um pacote Node sem você precisar instalar a CLI globalmente,

`@nestjs/cli` É a ferramenta oficial de linha de comando NestJS.

###### `--package-manager npm` Estamos dizendo explicitamente:

> use npm para administrar as dependências.

Assim evitamos o CLI perguntar se queremos:

```
npm
yarn
pnpm
```

`--skip-git` Ele e de extrema importancia pelo fato de não criaremos o arquivo .git, por que já está criado.

Depois da instalação fazer a verificação do backend:
```
npm run build
npm run start:dev
```
OBSERVAÇÃO: Caso o pacote @nestjs/observe for instalado podemos desistala-lo por enquanto.
REMOVA: 
```
npm uninstall @nestjs/observe
```
Faça a alteraçao no `scr/app.module.ts` e remova as importações e exportações do @nestjs/observe, em seguida retire do `src/main.ts` a importação e a const.
```
import { NestFactory } from '@nestjs/core';

import { AppModule} from './app.module.js';

  

async function bootstrap() {

const app = await NestFactory.create(AppModule);

await app.listen(process.env.PORT ?? 3000);

}

await bootstrap();
```


## Primeiro commit do backend
### Veja exatamente o que o Git encontrou

Na raiz `app-laco/`:

```
git status
```

ou, numa versão mais compacta:

```
git status --short
```

Você deverá ver vários arquivos dentro de `api/`.

Por exemplo:

```
?? api/package.json
?? api/package-lock.json
?? api/src/
?? api/tsconfig.json
```
or 
`??`

O que deve entra no Git? 
Arquivos como estes devem ser versionados:
```

api/package.json
api/package-lock.json

api/src/
api/test/

api/nest-cli.json
api/tsconfig.json
api/tsconfig.build.json

api/eslint.config.mjs
api/.prettierrc
```
O que não deve entra são a pasta `node_modulos` e `dist`

Depois adicionar o backend para o Staging Area: `git add api/`, em seguida fazemos o nosso primeiro commit: `git commit -m "feat: inicia backend com NestJS"`, o "feat" para indentificar que e funcional.

Verifique com o `git log --oneline -3`,  contudo faça o push do branch. `git push -u origin feature/backend-base`