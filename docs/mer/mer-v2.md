Usuarios
Obs: 
Vamos unifar, Invés de opitar por fazer várias tabelas de cuidadores, familiar e idoso. Nisso, seria mais fácil fazer uma unica tabela Usuarios com as mesma informações básicas de Usuario, como: Nome, E-mail e etc.


**Usuario**
- idUsuario PK
- nome
- email UNIQUE
- senhaHash
- tipoUsuario
- status
- createdAt
- updatedAt


Responsavel, como criamos a tebala Usuarios algumas informações ficaram lá. Aqui vai ser a tebala do responsavel do idoso.
**Responsavel**
- idResponsavel PK
- idUsuario FK
- cpf UNIQUE
- dataNascimento
- idEndereco FK

Cuidador, as informações de serviços e validação ficaram em uma outra tabela.
**Cuidador**
- idCuidador PK
- idUsuario FK
- cpf UNIQUE
- dataNascimento
- bio
- experiencia
- registroProfissional
- statusVerificacao
- idEndereco FK

Idoso, Não necessariamente o idoso pode ter cadastero mais e importante
**Idoso**
- idIdoso PK
- nome
- cpf
- dataNascimento
- observacoes
- necessidadesEspeciais
- idEndereco FK
- createdAt
- updatedAt

Essa tabela seria responsavel pelo responsavel do idoso, por que ele poderá gerencia mais de 1 idoso. Exemplo: Mãe e Pai.
**ResponsavelIdoso**
- idResponsavelIdoso PK
- idResponsavel FK
- idIdoso FK
- parentesco
- responsavelPrincipal

**Endereco**
- idEndereco PK
- cep
- logradouro
- numero
- complemento
- bairro
- cidade
- estado
- pontoReferencia

Caso tenha algum atributo para adiconar
**Serviço**
- idServico PK
- nome
- descricao
- tipoServico
- ativo

um cuidador pode oferecer vários serviços, e um mesmo serviço pode ser oferecido por vários cuidadores
**CuidadorServiço**
- idCuidadorServico PK
- idCuidador FK
- idServico FK
- valorHora
- ativo
UNIQUE(idCuidador, idServico)

Mostraria a disponibilidade do cuidador
**DISPONIBILIDADE**

- idDisponibilidade PK
- idCuidador FK
- diaSemana
- horaInicio
- horaFim
- ativo

**CONTRATACAO**
- idContratacao PK
- idResponsavel FK
- idIdoso FK
- idCuidador FK
- idServico FK
- dataInicio
- dataFim
- status
- valorTotal
- observacoes
- createdAt


**AGENDAMENTO**
- idAgendamento PK
- idContratacao FK
- data
- horaInicio
- horaFim
- status
- observacoes

**AVALIACAO**
- idAvaliacao PK
- idAgendamento FK
- nota
- comentario
- createdAt


Um conceito que pensei inves de usar a tbResponsavel, trocamos para tbCliente. Pelo fato que o idoso pode ser responsavel por ele mesmo, na interface do app terá "Familiar" ou "Idoso", mas no backend entenderá como ambos sera cliente.

No cadastro do cliente, o aplicativo pode perguntar:

```
Para quem você procura cuidados?

( ) Para mim
( ) Para outra pessoa
```

Se escolher **“para mim”**, esse usuário também terá um perfil de idoso.

Se escolher **“para outra pessoa”**, ele cadastra o idoso que será atendido.

Isso resolve os dois casos sem criar dois sistemas diferentes. 


IDENTIDADE
├── Usuario
├── Cliente
└── Cuidador


IDOSO
├── Idoso
└── ClienteIdoso


PROFISSIONAL
├── Curriculo
├── Servico
├── CuidadorServico
└── Disponibilidade


CONTRATAÇÃO
├── Agendamento
├── Contrato
└── Pagamento


COMUNICAÇÃO
├── Conversa
└── Mensagem


QUALIDADE
└── Avaliacao


LOCALIZAÇÃO
└── Endereco


E deixaria como evolução futura:

```
Laudos
Rotina detalhada do idoso
Medicamentos
Notificações avançadas
Videochamada
Cursos separados
Certificações separadas
Pagamento real
```



**Critério de aprovação deste conceito:** você precisa conseguir explicar com suas palavras que `ClienteIdoso` e `CuidadorServico` existem para resolver relacionamentos **N:N**.


# Guardar `valorAcordado` na contratação

Mesmo que `CuidadorServico` tenha:

```
preco = 80
```

imagine que amanhã João altere para:

```
preco = 100
```

Uma contratação antiga não deve mudar de R$ 80 para R$ 100 retroativamente.

Por isso eu adicionaria:

```
Contratacao
----------------
valorAcordado
```

No momento da contratação:

```
CuidadorServico.preco = 80

        ↓ copia

Contratacao.valorAcordado = 80
```

Depois João pode alterar seu preço sem modificar o histórico.

Esse é um detalhe pequeno, mas bastante profissional.


Definaremos o ``status
### `Usuario`

```
ATIVO
BLOQUEADO
INATIVO
```

### `Cuidador`

Se você mantiver verificação:

```
PENDENTE
APROVADO
REJEITADO
```

### `Contratacao`

```
SOLICITADA
ACEITA
REJEITADA
CANCELADA
FINALIZADA
```

### `Agendamento`

```
AGENDADO
EM_ANDAMENTO
CONCLUIDO
CANCELADO
```

