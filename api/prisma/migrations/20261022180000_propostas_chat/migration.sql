-- CreateEnum
CREATE TYPE "StatusPropostaAtendimento" AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'ALTERACOES_SOLICITADAS', 'SUBSTITUIDA');

-- AlterTable
ALTER TABLE "Contratacao" ADD COLUMN     "itemPropostaId" INTEGER,
ADD COLUMN     "sessaoProposta" INTEGER;

-- AlterTable
ALTER TABLE "Mensagem" ADD COLUMN     "propostaId" INTEGER;

-- CreateTable
CREATE TABLE "PropostaAtendimento" (
    "id" SERIAL NOT NULL,
    "negociacaoId" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "responsavelId" INTEGER NOT NULL,
    "cuidadorId" INTEGER NOT NULL,
    "idosoId" INTEGER NOT NULL,
    "status" "StatusPropostaAtendimento" NOT NULL DEFAULT 'PENDENTE',
    "total" DECIMAL(10,2) NOT NULL,
    "observacoes" VARCHAR(2000),
    "resposta" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondidaEm" TIMESTAMP(3),

    CONSTRAINT "PropostaAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPropostaAtendimento" (
    "id" SERIAL NOT NULL,
    "propostaId" INTEGER NOT NULL,
    "cuidadorServicoId" INTEGER NOT NULL,
    "contratacaoOrigemId" INTEGER,
    "nomeServico" VARCHAR(150) NOT NULL,
    "precoReferencia" DECIMAL(10,2) NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "inicios" TIMESTAMPTZ(3)[],

    CONSTRAINT "ItemPropostaAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropostaAtendimento_responsavelId_cuidadorId_id_idx" ON "PropostaAtendimento"("responsavelId", "cuidadorId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PropostaAtendimento_negociacaoId_versao_key" ON "PropostaAtendimento"("negociacaoId", "versao");

-- CreateIndex
CREATE UNIQUE INDEX "Contratacao_itemPropostaId_sessaoProposta_key" ON "Contratacao"("itemPropostaId", "sessaoProposta");

-- CreateIndex
CREATE UNIQUE INDEX "Mensagem_propostaId_key" ON "Mensagem"("propostaId");

-- AddForeignKey
ALTER TABLE "Contratacao" ADD CONSTRAINT "Contratacao_itemPropostaId_fkey" FOREIGN KEY ("itemPropostaId") REFERENCES "ItemPropostaAtendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensagem" ADD CONSTRAINT "Mensagem_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "PropostaAtendimento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaAtendimento" ADD CONSTRAINT "PropostaAtendimento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaAtendimento" ADD CONSTRAINT "PropostaAtendimento_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropostaAtendimento" ADD CONSTRAINT "PropostaAtendimento_idosoId_fkey" FOREIGN KEY ("idosoId") REFERENCES "Idoso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPropostaAtendimento" ADD CONSTRAINT "ItemPropostaAtendimento_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "PropostaAtendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPropostaAtendimento" ADD CONSTRAINT "ItemPropostaAtendimento_cuidadorServicoId_fkey" FOREIGN KEY ("cuidadorServicoId") REFERENCES "CuidadorServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPropostaAtendimento" ADD CONSTRAINT "ItemPropostaAtendimento_contratacaoOrigemId_fkey" FOREIGN KEY ("contratacaoOrigemId") REFERENCES "Contratacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "PropostaAtendimento" ADD CONSTRAINT "proposta_total_positivo" CHECK ("total" > 0);
ALTER TABLE "ItemPropostaAtendimento" ADD CONSTRAINT "item_proposta_valido" CHECK ("preco" > 0 AND "duracaoMinutos" BETWEEN 1 AND 720 AND cardinality("inicios") BETWEEN 1 AND 30);
CREATE UNIQUE INDEX "proposta_pendente_negociacao" ON "PropostaAtendimento"("negociacaoId") WHERE "status" = 'PENDENTE';
CREATE UNIQUE INDEX "proposta_aceita_negociacao" ON "PropostaAtendimento"("negociacaoId") WHERE "status" = 'ACEITA';
