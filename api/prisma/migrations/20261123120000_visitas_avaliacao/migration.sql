ALTER TABLE "Contratacao" ADD COLUMN "visitaId" INTEGER;
CREATE INDEX "Contratacao_visitaId_idx" ON "Contratacao"("visitaId");
CREATE TABLE "AvaliacaoResponsavel" (
  "id" SERIAL PRIMARY KEY,
  "contratacaoId" INTEGER NOT NULL UNIQUE REFERENCES "Contratacao"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nota" INTEGER NOT NULL CHECK ("nota" BETWEEN 1 AND 5),
  "comentario" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
