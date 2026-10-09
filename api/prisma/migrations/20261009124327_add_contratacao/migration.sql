-- CreateEnum
CREATE TYPE "StatusContratacao" AS ENUM ('SOLICITADA', 'ACEITA', 'RECUSADA', 'CANCELADA', 'CONCLUIDA');

-- CreateTable
CREATE TABLE "Contratacao" (
    "id" SERIAL NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "idosoId" INTEGER NOT NULL,
    "cuidadorServicoId" INTEGER NOT NULL,
    "valorAcordado" DECIMAL(10,2) NOT NULL,
    "status" "StatusContratacao" NOT NULL DEFAULT 'SOLICITADA',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contratacao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Contratacao" ADD CONSTRAINT "Contratacao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contratacao" ADD CONSTRAINT "Contratacao_idosoId_fkey" FOREIGN KEY ("idosoId") REFERENCES "Idoso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contratacao" ADD CONSTRAINT "Contratacao_cuidadorServicoId_fkey" FOREIGN KEY ("cuidadorServicoId") REFERENCES "CuidadorServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
