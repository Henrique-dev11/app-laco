CREATE TABLE "Agendamento" (
  "id" SERIAL NOT NULL, "contratacaoId" INTEGER NOT NULL, "cuidadorId" INTEGER NOT NULL,
  "inicio" TIMESTAMPTZ(3) NOT NULL, "fim" TIMESTAMPTZ(3) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Agendamento_contratacaoId_fkey" FOREIGN KEY ("contratacaoId") REFERENCES "Contratacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Agendamento_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "agendamento_intervalo_valido" CHECK ("fim" > "inicio")
);
CREATE UNIQUE INDEX "Agendamento_contratacaoId_key" ON "Agendamento"("contratacaoId");
CREATE INDEX "Agendamento_cuidadorId_inicio_idx" ON "Agendamento"("cuidadorId", "inicio");
ALTER TABLE "Agendamento" ADD CONSTRAINT "agendamento_sem_sobreposicao"
EXCLUDE USING gist ("cuidadorId" WITH =, tstzrange("inicio", "fim", '[)') WITH &&) WHERE ("ativo");
