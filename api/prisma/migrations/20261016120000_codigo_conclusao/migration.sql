-- AlterTable
ALTER TABLE "Contratacao" ADD COLUMN     "codigoConclusaoHash" TEXT,
ADD COLUMN     "tentativasCodigo" INTEGER NOT NULL DEFAULT 0;
