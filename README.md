# Laço

Plataforma para conectar cuidadores e pessoas que precisam de cuidado, com
aplicativo React Native/Expo, painel administrativo web e API NestJS com
PostgreSQL.

## Começar

1. [Instalação em uma nova máquina](docs/instalacao.md): ferramentas, banco,
   API, aplicativo, painel e primeiro administrador.
2. [Configuração](docs/configuracao.md): arquivos `.env`, endereços e acesso
   pelo celular.
3. [Desenvolvimento](docs/desenvolvimento.md): atualizar o projeto, trabalhar
   com dependências e migrations e executar testes.
4. [Solução de problemas](docs/solucao-de-problemas.md): banco, portas, Expo
   Go, firewall e acesso ao painel.

## Estrutura

| Pasta/arquivo                | Responsabilidade                               |
| ---------------------------- | ---------------------------------------------- |
| [api/](api/README.md)        | API NestJS, Prisma e migrations                |
| [mobile/](mobile/README.md)  | Aplicativo Expo SDK 58 para iOS, Android e web |
| [web/](web/README.md)        | Painel administrativo e site público           |
| [compose.yaml](compose.yaml) | PostgreSQL 17 para desenvolvimento local       |
| [docs/](docs/)               | Guias de instalação e trabalho da equipe       |

Use Node.js e npm nas versões registradas em [`.nvmrc`](.nvmrc) e
[`api/package.json`](api/package.json). API e aplicativo têm instalações npm
separadas; os comandos completos estão no guia de instalação.

## Endereços locais

| Serviço                     | Endereço padrão             |
| --------------------------- | --------------------------- |
| API                         | http://localhost:3000       |
| Metro / aplicativo Expo Web | http://localhost:8081       |
| Painel administrativo       | http://localhost:5173/admin |
| Site público                | http://localhost:5173       |

Para usar o aplicativo no celular, configure o IP do computador no `.env` do
mobile e mantenha os dispositivos no mesmo Wi-Fi.
