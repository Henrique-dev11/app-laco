-- CreateEnum
CREATE TYPE "StatusPagamentoSimulado" AS ENUM ('PENDENTE', 'RETIDO', 'LIBERADO', 'REEMBOLSADO', 'CANCELADO', 'EM_CONTESTACAO');

-- CreateEnum
CREATE TYPE "TipoMovimentoSimulado" AS ENUM ('RETENCAO', 'LIBERACAO', 'REEMBOLSO', 'SAQUE');

-- CreateEnum
CREATE TYPE "EtapaCodigoAtendimento" AS ENUM ('INICIO', 'FIM');

-- AlterTable
ALTER TABLE "Contratacao" ADD COLUMN     "financeiroSimulado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PagamentoSimulado" (
    "id" SERIAL NOT NULL,
    "contratacaoId" INTEGER NOT NULL,
    "cuidadorId" INTEGER NOT NULL,
    "status" "StatusPagamentoSimulado" NOT NULL DEFAULT 'PENDENTE',
    "bruto" DECIMAL(16,2) NOT NULL,
    "comissao" DECIMAL(16,2) NOT NULL,
    "liquido" DECIMAL(16,2) NOT NULL,
    "inicioEm" TIMESTAMP(3),
    "validacaoEm" TIMESTAMP(3),
    "fimEm" TIMESTAMP(3),
    "motivoContestacao" VARCHAR(1000),
    "contestadoPorId" INTEGER,
    "motivoResolucao" VARCHAR(1000),
    "resolvidoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagamentoSimulado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoAtendimento" (
    "id" SERIAL NOT NULL,
    "pagamentoId" INTEGER NOT NULL,
    "etapa" "EtapaCodigoAtendimento" NOT NULL,
    "hash" TEXT NOT NULL,
    "emitidoEm" TIMESTAMP(3) NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "tentativas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CodigoAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentoSimulado" (
    "id" SERIAL NOT NULL,
    "cuidadorId" INTEGER NOT NULL,
    "pagamentoId" INTEGER,
    "adminId" INTEGER,
    "chave" TEXT NOT NULL,
    "tipo" "TipoMovimentoSimulado" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMADO',
    "valor" DECIMAL(16,2) NOT NULL,
    "descricao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentoSimulado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PagamentoSimulado_contratacaoId_key" ON "PagamentoSimulado"("contratacaoId");

-- CreateIndex
CREATE INDEX "PagamentoSimulado_cuidadorId_status_idx" ON "PagamentoSimulado"("cuidadorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CodigoAtendimento_pagamentoId_etapa_key" ON "CodigoAtendimento"("pagamentoId", "etapa");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentoSimulado_chave_key" ON "MovimentoSimulado"("chave");

-- CreateIndex
CREATE INDEX "MovimentoSimulado_cuidadorId_createdAt_idx" ON "MovimentoSimulado"("cuidadorId", "createdAt");

-- AddForeignKey
ALTER TABLE "PagamentoSimulado" ADD CONSTRAINT "PagamentoSimulado_contratacaoId_fkey" FOREIGN KEY ("contratacaoId") REFERENCES "Contratacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoSimulado" ADD CONSTRAINT "PagamentoSimulado_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoSimulado" ADD CONSTRAINT "PagamentoSimulado_contestadoPorId_fkey" FOREIGN KEY ("contestadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoSimulado" ADD CONSTRAINT "PagamentoSimulado_resolvidoPorId_fkey" FOREIGN KEY ("resolvidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodigoAtendimento" ADD CONSTRAINT "CodigoAtendimento_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "PagamentoSimulado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoSimulado" ADD CONSTRAINT "MovimentoSimulado_cuidadorId_fkey" FOREIGN KEY ("cuidadorId") REFERENCES "Cuidador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoSimulado" ADD CONSTRAINT "MovimentoSimulado_pagamentoId_fkey" FOREIGN KEY ("pagamentoId") REFERENCES "PagamentoSimulado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentoSimulado" ADD CONSTRAINT "MovimentoSimulado_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "PagamentoSimulado" ADD CONSTRAINT "pagamento_simulado_valores_validos"
  CHECK (bruto > 0 AND comissao >= 0 AND liquido >= 0 AND bruto = comissao + liquido);
ALTER TABLE "CodigoAtendimento" ADD CONSTRAINT "codigo_atendimento_tentativas_validas"
  CHECK (tentativas BETWEEN 0 AND 5 AND "expiraEm" > "emitidoEm");
ALTER TABLE "MovimentoSimulado" ADD CONSTRAINT "movimento_simulado_valor_valido"
  CHECK (valor >= 0 AND (tipo <> 'SAQUE' OR valor > 0));
