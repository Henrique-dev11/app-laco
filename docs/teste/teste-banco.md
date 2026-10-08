# Guia de Testes da API

Comandos e dados usados para preparar um banco de desenvolvimento e testar os principais endpoints da API do Laço.

**Base da API:**
```text
http://localhost:3000
```

---

### 1. Preparar o ambiente

Na raiz do projeto:
```bash
docker compose up -d
```

Dentro de `api/`:
```bash
npm ci
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

Ao criar uma migration nova durante o desenvolvimento:
```bash
npx prisma migrate dev
```

---

### 2. Criar usuário responsável
```bash
curl -i \
  -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Responsavel",
    "email": "responsavel@teste.com",
    "senha": "Senha123!",
    "tipoUsuario": "RESPONSAVEL"
  }'
```

**Anotar o ID retornado:**
* `usuarioResponsavelId` = 

---

### 3. Criar perfil responsável
> **Nota:** Use o `usuarioId` criado anteriormente.

```bash
curl -i \
  -X POST http://localhost:3000/responsaveis \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": 1,
    "telefone": "11999999999",
    "cpf": "12345678901",
    "dataNascimento": "1985-05-20",
    "endereco": {
      "rua": "Rua das Flores",
      "numero": "100",
      "complemento": "Casa",
      "bairro": "Centro",
      "cidade": "Sao Paulo",
      "estado": "SP",
      "cep": "01001000"
    }
  }'
```

**Anotar:**
* `responsavelId` = 

---

### 4. Criar idoso
```bash
curl -i \
  -X POST http://localhost:3000/idosos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Dona Ana",
    "dataNascimento": "1945-08-10",
    "sexo": "Feminino",
    "telefone": "11977777777",
    "cpf": "98765432100",
    "observacoes": "Prefere atendimento pela manhã.",
    "necessidadesEspeciais": "Mobilidade reduzida.",
    "endereco": {
      "rua": "Rua das Palmeiras",
      "numero": "250",
      "complemento": "Apto 12",
      "bairro": "Centro",
      "cidade": "Sao Paulo",
      "estado": "SP",
      "cep": "01002000"
    }
  }'
```

**Anotar:**
* `idosoId` = 

---

### 5. Vincular responsável ao idoso
> **Nota:** Use os IDs cadastrados anteriormente.

```bash
curl -i \
  -X POST http://localhost:3000/responsaveis/1/idosos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "parentesco": "FILHA",
    "responsavelPrincipal": true
  }'
```

---

### 6. Criar usuário cuidador
```bash
curl -i \
  -X POST http://localhost:3000/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Carlos Cuidador",
    "email": "cuidador@teste.com",
    "senha": "Senha123!",
    "tipoUsuario": "CUIDADOR"
  }'
```

**Anotar:**
* `usuarioCuidadorId` = 

---

### 7. Criar perfil cuidador
> **Nota:** Use o `usuarioId` correspondente ao cuidador.

```bash
curl -i \
  -X POST http://localhost:3000/cuidadores \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": 2,
    "telefone": "11966666666",
    "cpf": "11122233344",
    "dataNascimento": "1990-06-15",
    "biografia": "Cuidador dedicado ao atendimento de idosos.",
    "experienciaProfissional": "Experiência em acompanhamento domiciliar.",
    "registroProfissional": "REG-12345",
    "endereco": {
      "rua": "Rua dos Cuidadores",
      "numero": "150",
      "complemento": "Apto 10",
      "bairro": "Centro",
      "cidade": "Sao Paulo",
      "estado": "SP",
      "cep": "01004000"
    }
  }'
```

**Anotar:**
* `cuidadorId` = 

---

### 8. Criar serviço
```bash
curl -i \
  -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Acompanhamento domiciliar",
    "descricao": "Acompanhamento e auxílio ao idoso em sua residência."
  }'
```

**Anotar:**
* `servicoId` = 

#### Outros serviços para teste:
```bash
curl -i \
  -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Companhia",
    "descricao": "Serviço de companhia e acompanhamento do idoso."
  }'
```

```bash
curl -i \
  -X POST http://localhost:3000/servicos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Acompanhamento em consultas",
    "descricao": "Acompanhamento do idoso em consultas e compromissos médicos."
  }'
```

---

### 9. Vincular serviço ao cuidador
> **Nota:** Use o `cuidadorId` e o `servicoId` cadastrados.

```bash
curl -i \
  -X POST http://localhost:3000/cuidadores/1/servicos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "preco": 35.00,
    "duracaoMinutos": 60
  }'
```

* **Resultado esperado:** `201 Created`

Se o mesmo serviço for vinculado novamente ao mesmo cuidador:
* **Resultado esperado:** `409 Conflict`

**Anotar:**
* `cuidadorServicoId` = 

---

### 10. Consultar dados cadastrados

* **Usuários:**
  ```bash
  curl http://localhost:3000/usuarios
  ```
* **Responsáveis:**
  ```bash
  curl http://localhost:3000/responsaveis
  ```
* **Idosos:**
  ```bash
  curl http://localhost:3000/idosos
  ```
* **Cuidadores:**
  ```bash
  curl http://localhost:3000/cuidadores
  ```
* **Serviços:**
  ```bash
  curl http://localhost:3000/servicos
  ```

---

### IDs usados nos testes
Preencher após preparar o banco de dados:

* `usuarioResponsavelId` = 
* `responsavelId` = 
* `idosoId` = 
* `usuarioCuidadorId` = 
* `cuidadorId` = 
* `servicoId` = 
* `cuidadorServicoId` = 

---

### Banco em outra máquina
Fluxo básico para novos ambientes:

```bash
git pull
cd api
npm ci
npx prisma migrate deploy
npx prisma generate
```

Na raiz:
```bash
docker compose up -d
```

Depois, execute os cadastros listados neste arquivo para preparar os dados de teste locais.

No futuro, esses dados poderão ser automatizados diretamente com um seed do Prisma:
```bash
npx prisma db seed
```

---

# Próxima fase: finalizar `CuidadorServico`

Agora que temos as bases estabelecidas:

```text
Cuidador ✓
Servico ✓
CuidadorServico POST ✓
```
