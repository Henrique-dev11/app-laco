# Laço

O **Laço** é uma plataforma desenvolvida como projeto de TCC com o objetivo de conectar cuidadores de idosos e pessoas que procuram serviços de cuidado.

O projeto será composto por um aplicativo mobile e uma aplicação web, ambos utilizando o mesmo backend por meio de uma API REST.

## Objetivo

Permitir que usuários encontrem cuidadores, consultem serviços e disponibilidades, realizem agendamentos e acompanhem atendimentos.

A plataforma também contará com uma área web para cuidadores e administração do sistema.

## Estrutura do projeto

```text
app-web-laco/
├── api/
├── mobile/
├── web/
├── docs/
└── README.md
```

* `api/` — Backend e API REST
* `mobile/` — Aplicativo mobile
* `web/` — Aplicação web e painel administrativo
* `docs/` — Documentação do projeto

## Tecnologias

### Mobile

* React Native
* Expo
* TypeScript

### Backend

* Node.js
* NestJS
* Prisma ORM

### Banco de Dados

* PostgreSQL

### Ferramentas

* Docker
* Git
* GitHub
* Visual Studio Code

## Arquitetura

```text
Mobile ─────┐
            │
            ▼
         API REST
            │
            ▼
         Backend
            │
            ▼
       PostgreSQL
            ▲
            │
            │
Web ────────┘
```

O aplicativo mobile e a aplicação web utilizarão a mesma API e o mesmo banco de dados.

## Status

Projeto em desenvolvimento.

Atualmente estamos trabalhando na organização do projeto, arquitetura, modelagem do banco de dados e estruturação do backend.

## Projeto acadêmico

Projeto desenvolvido como TCC do curso de **Desenvolvimento de Sistemas**.
