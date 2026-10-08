-- CreateTable
CREATE TABLE "Servico" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuidadorServico" (
    "id" SERIAL NOT NULL,
    "cuidadorId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuidadorServico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Servico_nome_key" ON "Servico"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "CuidadorServico_cuidadorId_servicoId_key" ON "CuidadorServico"("cuidadorId", "servicoId");

-- AddForeignKey
ALTER TABLE "CuidadorServico" ADD CONSTRAINT "CuidadorServico_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuidadorServico" ADD CONSTRAINT "CuidadorServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
