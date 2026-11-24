-- Reapresenta o histórico anterior no chat atual sem descartar o original.
-- Propostas antigas ficam descritas em texto; os dados estruturados permanecem
-- intactos em Proposta e PropostaItem, sem inventar horários ausentes.
DO $$
DECLARE mensagem RECORD; conteudo TEXT; posicao INTEGER;
BEGIN
  IF to_regclass('public."MensagemLegado"') IS NOT NULL THEN
    FOR mensagem IN
      SELECT m.*, r."usuarioId" AS responsavel, c."usuarioId" AS cuidador
      FROM "MensagemLegado" m JOIN "Conversa" cv ON cv.id=m."conversaId"
      JOIN "Responsavel" r ON r.id=cv."responsavelId"
      JOIN "Cuidador" c ON c.id=cv."cuidadorId" ORDER BY m.id
    LOOP
      conteudo := mensagem.texto;
      IF conteudo IS NULL THEN
        SELECT 'Proposta de atendimento anterior: valor R$ ' || p.total::text ||
          '; situação: ' || p.status::text || '. Serviços: ' ||
          COALESCE((SELECT string_agg(pi."nomeServico" || ' (' || pi.quantidade::text || ' sessão/sessões, R$ ' || pi.preco::text || ' cada)', '; ' ORDER BY pi.id) FROM "PropostaItem" pi WHERE pi."propostaId"=p.id), 'não informado') ||
          COALESCE('. Observações: ' || p.observacoes, '')
        INTO conteudo FROM "Proposta" p WHERE p.id=mensagem."propostaId";
      END IF;
      IF conteudo IS NULL OR btrim(conteudo)='' THEN
        RAISE EXCEPTION 'Mensagem antiga % sem conteúdo recuperável', mensagem.id;
      END IF;
      posicao := 1;
      WHILE posicao <= length(conteudo) LOOP
        INSERT INTO "Mensagem" ("remetenteId", "destinatarioId", conteudo, "createdAt")
        VALUES (mensagem."autorId", CASE WHEN mensagem."autorId"=mensagem.responsavel THEN mensagem.cuidador ELSE mensagem.responsavel END,
          substring(conteudo FROM posicao FOR 1000), mensagem."createdAt" + ((posicao-1)/1000) * interval '1 millisecond');
        posicao := posicao+1000;
      END LOOP;
    END LOOP;
  END IF;
END $$;
