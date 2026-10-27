# API do Laço

Backend NestJS com Prisma 7 e PostgreSQL 17. O roteiro para preparar uma nova
máquina está em [instalação](../docs/instalacao.md).

Com o banco disponível e `api/.env` configurado, execute nesta pasta:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

A API responde em **http://localhost:3000**. Os scripts de banco já usam
`prisma7.config.ts`. O seed prepara o catálogo de serviços.

Para criar uma conta administrativa de desenvolvimento, execute
`npm run admin:criar` em um terminal interativo nesta pasta. O painel está em
**http://localhost:5173/admin**, após iniciar o módulo `web/`.

- [Variáveis e conexão com o banco](../docs/configuracao.md)
- [Atualização, migrations e testes](../docs/desenvolvimento.md)
- [Solução de problemas](../docs/solucao-de-problemas.md)
