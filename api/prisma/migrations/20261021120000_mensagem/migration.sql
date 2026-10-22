-- CreateTable
CREATE TABLE "Mensagem" (
  "id" SERIAL NOT NULL,
  "remetenteId" INTEGER NOT NULL,
  "destinatarioId" INTEGER NOT NULL,
  "conteudo" VARCHAR(1000) NOT NULL,
  "lidaEm" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Mensagem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Mensagem_remetenteId_fkey" FOREIGN KEY ("remetenteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Mensagem_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Mensagem_remetenteId_destinatarioId_id_idx" ON "Mensagem"("remetenteId", "destinatarioId", "id");
CREATE INDEX "Mensagem_destinatarioId_remetenteId_lidaEm_idx" ON "Mensagem"("destinatarioId", "remetenteId", "lidaEm");
