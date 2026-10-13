-- O banco também impede sobreposição quando duas requisições chegam simultaneamente.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Disponibilidade" ADD CONSTRAINT "disponibilidade_sem_sobreposicao"
EXCLUDE USING gist (
  "cuidadorId" WITH =,
  "diaSemana" WITH =,
  numrange(EXTRACT(EPOCH FROM "horaInicio")::numeric, EXTRACT(EPOCH FROM "horaFim")::numeric, '[)') WITH &&
) WHERE ("ativo");
