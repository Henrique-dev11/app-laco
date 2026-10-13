ALTER TABLE "Usuario" ADD COLUMN "nomeSocial" VARCHAR(150), ADD COLUMN "telefone2" VARCHAR(20), ADD COLUMN "termosAceitosEm" TIMESTAMP(3);
ALTER TABLE "Idoso" ADD COLUMN "nomeSocial" VARCHAR(150);
CREATE TABLE "Sessao" (
  "id" TEXT NOT NULL, "tokenHash" CHAR(64) NOT NULL, "usuarioId" INTEGER NOT NULL,
  "expiraEm" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Sessao_tokenHash_key" ON "Sessao"("tokenHash");
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");
CREATE INDEX "Sessao_expiraEm_idx" ON "Sessao"("expiraEm");
CREATE TABLE "Curriculo" (
  "id" SERIAL NOT NULL, "cuidadorId" INTEGER NOT NULL, "nome" VARCHAR(255) NOT NULL, "conteudo" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Curriculo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Curriculo_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Curriculo_cuidadorId_key" ON "Curriculo"("cuidadorId");
CREATE TABLE "PreferenciaServico" (
  "usuarioId" INTEGER NOT NULL, "servicoId" INTEGER NOT NULL,
  CONSTRAINT "PreferenciaServico_pkey" PRIMARY KEY ("usuarioId", "servicoId"),
  CONSTRAINT "PreferenciaServico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PreferenciaServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
