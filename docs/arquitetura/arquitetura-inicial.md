Arquitetura Inicial — Laço

O Laço será composto por três partes principais:

    Aplicativo mobile
    Aplicação web
    Backend compartilhado

O aplicativo e o site utilizarão a mesma API REST.
Arquitetura geral
text

Mobile  ─┐
         ├── API REST (NestJS) ─── Prisma ─── PostgreSQL
Web    ──┘

Mobile

O aplicativo será utilizado principalmente por clientes e cuidadores.

Tecnologias planejadas:

    React Native
    Expo
    TypeScript

Web

A aplicação web será utilizada principalmente por:

    Cuidadores
    Administradores
    Superadministrador

Backend

O backend será centralizado e utilizado tanto pelo aplicativo quanto pelo site.

Tecnologias:

    NestJS
    TypeScript
    Prisma
    PostgreSQL
    Docker

Perfis de usuário

O sistema terá inicialmente os seguintes perfis:

    CLIENTE
    CUIDADOR
    ADMIN
    SUPER_ADMIN

O SUPER_ADMIN será responsável por criar e gerenciar outros administradores.
Banco de dados

O banco será relacional e utilizará PostgreSQL.

Se quiser, posso deixar esse texto com um tom mais técnico e profissional para documentação.