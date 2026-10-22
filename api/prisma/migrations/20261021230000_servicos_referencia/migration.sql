-- Serviços personalizados reutilizam Servico, mas não entram no catálogo padrão.
ALTER TABLE "Servico" ADD COLUMN "catalogo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "precoSugerido" DECIMAL(10,2),
  ADD COLUMN "duracaoSugeridaMinutos" INTEGER;
DROP INDEX "Servico_nome_key";
CREATE INDEX "Servico_nome_idx" ON "Servico"("nome");
CREATE UNIQUE INDEX "Servico_catalogo_nome_key" ON "Servico"("nome") WHERE "catalogo" = true;
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_sugestoes_validas" CHECK (
  ("precoSugerido" IS NULL OR "precoSugerido" > 0) AND
  ("duracaoSugeridaMinutos" IS NULL OR "duracaoSugeridaMinutos" > 0));

-- Congela as condições da solicitação. Para legados, usa o valor já acordado
-- e a duração agendada, quando disponível; senão, a duração atual da oferta.
ALTER TABLE "Contratacao" ADD COLUMN "nomeServico" VARCHAR(150),
  ADD COLUMN "precoReferencia" DECIMAL(10,2), ADD COLUMN "duracaoMinutos" INTEGER;
UPDATE "Contratacao" c SET "nomeServico" = s.nome,
  "precoReferencia" = c."valorAcordado",
  "duracaoMinutos" = COALESCE(
    (SELECT GREATEST(1, ROUND(EXTRACT(EPOCH FROM (a.fim - a.inicio)) / 60)::INTEGER)
     FROM "Agendamento" a WHERE a."contratacaoId" = c.id), cs."duracaoMinutos")
FROM "CuidadorServico" cs JOIN "Servico" s ON s.id = cs."servicoId"
WHERE cs.id = c."cuidadorServicoId";
ALTER TABLE "Contratacao" ALTER COLUMN "nomeServico" SET NOT NULL,
  ALTER COLUMN "precoReferencia" SET NOT NULL, ALTER COLUMN "duracaoMinutos" SET NOT NULL;
ALTER TABLE "Contratacao" ADD CONSTRAINT "Contratacao_referencia_valida" CHECK (
  "precoReferencia" > 0 AND "duracaoMinutos" > 0 AND length(trim("nomeServico")) > 0);
