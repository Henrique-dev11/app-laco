# Solução de problemas ao executar

Os passos de instalação estão em [instalação](instalacao.md); os endereços e
variáveis, em [configuração](configuracao.md).

## Banco não conecta ou migrations falham

Na raiz, confira `docker compose ps` e `docker compose logs db`. O serviço
deve estar saudável. Compare usuário, senha, porta e nome do banco entre
`.env` e `api/.env`.

Se a porta 5432 estiver ocupada por outro PostgreSQL, escolha outra
`POSTGRES_PORT` e ajuste a porta em `DATABASE_URL`. Se o volume já existia,
use as credenciais com que foi inicializado: editar `.env` não altera a
senha gravada no banco.

Execute os scripts Prisma dentro de `api/`. Para conferir o schema:

```sh
npx prisma validate --config prisma7.config.ts
```

Se faltar o cliente gerado, execute `npm run db:generate`. Para tabelas novas,
use `npm run db:migrate`. As migrations usam a extensão `btree_gist`; um
PostgreSQL externo precisa permitir sua instalação no banco.

## Versão do Node ou instalação de pacotes

Compare `node --version` e `npm --version` com [os requisitos](instalacao.md).
Selecione o Node da `.nvmrc` e rode `npm ci` na pasta do módulo afetado.
Se acabou de instalar Node ou nvm, reabra o terminal para atualizar o PATH.

## A porta já está em uso

Confira os terminais abertos: API usa 3000, Metro costuma usar 8081 e painel
usa 5173. Reutilize a instância correta ou encerre-a com `Ctrl+C` antes de
iniciar outra. O Metro pode oferecer outra porta; o QR Code e as origens de
CORS precisam corresponder à instância usada.

## Expo Go: “The request timed out”

1. Mantenha computador e celular no mesmo Wi-Fi, com comunicação entre eles.
2. Confira o IP/porta exibidos no QR Code atual.
3. No navegador do celular, abra `http://IP_DO_COMPUTADOR:PORTA_DO_METRO/status`.
   Deve aparecer `packager-status:running`.
4. Abra também `http://IP_DO_COMPUTADOR:3000/`. Deve aparecer `Hello World!`.
5. Se não abrirem, confira a permissão de Rede Local do Expo Go no iPhone,
   VPN, firewall e isolamento de clientes do roteador.

Uma resposta obtida no computador não comprova o acesso pelo celular. Já foi
identificado neste projeto bloqueio do UFW às portas do Metro. Em Linux com
UFW, consulte `sudo ufw status numbered`.

Exemplo de liberação restrita à rede local, **se** a interface for `wlan0` e
a rede for `192.168.1.0/24`; adapte ambos à sua máquina:

```sh
sudo ufw allow in on wlan0 proto tcp from 192.168.1.0/24 to any port 3000,8081,8082 comment 'Laco desenvolvimento'
```

No Windows, permita o Node/Expo na rede privada nas configurações do firewall.
Para remover posteriormente a regra do exemplo UFW:

```sh
sudo ufw delete allow in on wlan0 proto tcp from 192.168.1.0/24 to any port 3000,8081,8082
```

Referência: [sintaxe do UFW](https://manpages.ubuntu.com/manpages/resolute/man8/ufw.8.html).

O [túnel do Expo](https://docs.expo.dev/more/expo-cli/#tunneling) encaminha o
Metro. Ele não publica a API local automaticamente: a API ainda precisa ser
acessível pelo celular.

## Expo Go: versão, conta ou cache

O projeto usa SDK **58**. Use uma versão do Expo Go compatível. Se a loja do
Android não oferecer a versão necessária, consulte a distribuição oficial
em [expo.dev/go](https://expo.dev/go). Confira o SDK antes de atualizar as
dependências do projeto.

No iPhone físico, CLI e Expo Go precisam estar na mesma conta Expo. Em
`mobile/`, use `npx expo login` e `npx expo whoami` para conferir a autenticação.
Essa conta é separada do cadastro do Laço.

Após atualizar dependências ou mudar `mobile/.env`, pare o Metro e execute:

```sh
npm run start:go -- --clear
```

Notificações push têm limitações no Expo Go. O projeto usa avisos internos
nesse ambiente; recursos nativos fora do Expo Go exigem uma build própria.

## O app abre, mas não acessa a API

Confira `EXPO_PUBLIC_API_URL`: no celular físico, use o IP do computador,
não `localhost`. Teste a URL no navegador do aparelho. Se o IP da rede mudou,
atualize `mobile/.env` e reinicie o Metro.

Se apenas o Expo Web apresentar erro de CORS, inclua sua origem exata em
`api/.env`, separada por vírgula, e reinicie a API. Os detalhes estão em
[configuração](configuracao.md).

## Painel com erro de conexão ou acesso negado

Se houver erro 502 em `/api/*`, confira se a API está aberta e se
`web/.env` aponta para ela. Reinicie o servidor do painel após mudar esse
arquivo.

O login do painel exige uma conta `ADMIN`. Crie uma conta local com
`npm run admin:criar` em `api/`. Um cuidador só aparece na busca depois de
aprovação e ativação pelo painel; o seed prepara o catálogo de serviços.
