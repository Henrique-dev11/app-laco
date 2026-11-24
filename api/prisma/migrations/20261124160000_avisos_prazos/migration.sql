ALTER TABLE "Contratacao" ADD COLUMN "codigoConclusaoExpiraEm" TIMESTAMP(3);

CREATE TABLE "AvisoPagamento" (
  "id" SERIAL PRIMARY KEY,
  "pagamentoId" INTEGER NOT NULL REFERENCES "PagamentoSimulado"("id") ON DELETE CASCADE,
  "etapa" TEXT NOT NULL,
  "servicos" TEXT[] NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lidoEm" TIMESTAMP(3),
  UNIQUE ("pagamentoId", "etapa")
);
CREATE TABLE "DispositivoPush" (
  "id" SERIAL PRIMARY KEY,
  "sessaoId" TEXT NOT NULL REFERENCES "Sessao"("id") ON DELETE CASCADE,
  "token" TEXT NOT NULL UNIQUE
);
CREATE INDEX "DispositivoPush_sessaoId_idx" ON "DispositivoPush"("sessaoId");
CREATE TABLE "EntregaPush" (
  "id" SERIAL PRIMARY KEY,
  "avisoId" INTEGER NOT NULL REFERENCES "AvisoPagamento"("id") ON DELETE CASCADE,
  "dispositivoId" INTEGER NOT NULL REFERENCES "DispositivoPush"("id") ON DELETE CASCADE,
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "ticket" TEXT,
  "encerrada" BOOLEAN NOT NULL DEFAULT false,
  "proximaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("avisoId", "dispositivoId")
);
CREATE INDEX "EntregaPush_encerrada_proximaEm_idx" ON "EntregaPush"("encerrada", "proximaEm");
