-- Compatibilidade com bancos que receberam o chat experimental de 22/10.
-- As tabelas e mensagens anteriores são preservadas integralmente.
DO $$
DECLARE indice RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Mensagem' AND column_name='conversaId') THEN
    ALTER TABLE "Mensagem" RENAME TO "MensagemLegado";
    ALTER SEQUENCE "Mensagem_id_seq" RENAME TO "MensagemLegado_id_seq";
    FOR indice IN SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='MensagemLegado' LOOP
      EXECUTE format('ALTER INDEX %I RENAME TO %I', indice.indexname, indice.indexname || '_legado');
    END LOOP;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Contratacao' AND column_name='propostaItemId')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Contratacao' AND column_name='sessaoProposta')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='Contratacao' AND column_name='itemPropostaId') THEN
    ALTER TABLE "Contratacao" RENAME COLUMN "sessaoProposta" TO "sessaoPropostaLegado";
  END IF;
END $$;
