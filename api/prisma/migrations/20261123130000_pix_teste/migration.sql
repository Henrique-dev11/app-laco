ALTER TABLE "PropostaAtendimento" ADD COLUMN "pixOrdemId" TEXT, ADD COLUMN "pixReferencia" TEXT;
CREATE UNIQUE INDEX "PropostaAtendimento_pixOrdemId_key" ON "PropostaAtendimento"("pixOrdemId");
CREATE UNIQUE INDEX "PropostaAtendimento_pixReferencia_key" ON "PropostaAtendimento"("pixReferencia");
