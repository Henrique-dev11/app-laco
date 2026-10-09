-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO');

-- CreateTable
CREATE TABLE "Disponibilidade" (
    "id" SERIAL NOT NULL,
    "cuidadorId" INTEGER NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horaInicio" TIME(0) NOT NULL,
    "horaFim" TIME(0) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disponibilidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Disponibilidade_cuidadorId_diaSemana_horaInicio_horaFim_key" ON "Disponibilidade"("cuidadorId", "diaSemana", "horaInicio", "horaFim");

-- AddForeignKey
ALTER TABLE "Disponibilidade" ADD CONSTRAINT "Disponibilidade_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
