# Web do Laço

Painel administrativo em `admin/` e site público em `site/`, servidos por Node.
Este módulo usa somente dependências nativas e dispensa instalação npm.

Siga a [instalação](../docs/instalacao.md) para preparar API, banco e conta
administrativa. Depois execute nesta pasta:

```sh
npm run dev
```

- Painel: **http://localhost:5173/admin**.
- Site público: **http://localhost:5173/**; coloque seus arquivos em `site/`.

O servidor encaminha `/api/*` para a API configurada em `web/.env`. Para
aprovar um cuidador, entre como administrador e abra
**Cuidadores → Ver perfil → Aprovar e ativar**.

- [Configuração e acesso por outro dispositivo](../docs/configuracao.md)
- [Desenvolvimento e testes](../docs/desenvolvimento.md)
- [Solução de problemas](../docs/solucao-de-problemas.md)
