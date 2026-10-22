-- CreateTable
CREATE TABLE "Avaliacao" (
  "id" SERIAL NOT NULL,
  "contratacaoId" INTEGER NOT NULL,
  "responsavelId" INTEGER NOT NULL,
  "cuidadorId" INTEGER NOT NULL,
  "nota" INTEGER NOT NULL,
  "comentario" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Avaliacao_contratacaoId_fkey" FOREIGN KEY ("contratacaoId") REFERENCES "Contratacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Avaliacao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Avaliacao_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "avaliacao_nota_valida" CHECK ("nota" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "Avaliacao_contratacaoId_key" ON "Avaliacao"("contratacaoId");
CREATE INDEX "Avaliacao_cuidadorId_createdAt_idx" ON "Avaliacao"("cuidadorId", "createdAt");
