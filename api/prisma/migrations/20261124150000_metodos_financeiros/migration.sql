CREATE TYPE "MetodoFinanceiro" AS ENUM ('PIX', 'CARTAO', 'OUTRO');

ALTER TABLE "PagamentoSimulado"
  ADD COLUMN "metodo" "MetodoFinanceiro" NOT NULL DEFAULT 'PIX';

ALTER TABLE "MovimentoSimulado"
  ADD COLUMN "metodo" "MetodoFinanceiro" NOT NULL DEFAULT 'PIX';
