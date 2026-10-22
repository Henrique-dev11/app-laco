A implementação de novas tabelas ficaram aqui.

Uma delas e a relação do idoso responsável

## Avaliacao

Implementada em `api/prisma/schema.prisma`.

- id PK
- contratacaoId FK (única: uma avaliação por contratação)
- responsavelId FK (quem avaliou)
- cuidadorId FK (quem foi avaliado, copiado do serviço contratado para consultar a nota média sem joins)
- nota (1 a 5, com CHECK no banco)
- comentario (opcional, até 1000 caracteres)
- createdAt

Diferença em relação ao MER v2: a avaliação se liga à **contratação** (`idAgendamento` virou `contratacaoId`), porque uma contratação concluída pode não ter agendamento. Só é possível avaliar contratações com status `CONCLUIDA`.
