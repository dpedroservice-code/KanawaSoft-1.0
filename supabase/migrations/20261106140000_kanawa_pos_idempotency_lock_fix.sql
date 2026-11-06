-- KanawaSoft 1.0 — retries idempotentes não precisam de lock que exija UPDATE privilege.
-- A linha da venda é imutável para authenticated; a unicidade da chave (company_id, external_id)
-- serializa o INSERT ON CONFLICT. Após o conflito, basta validar o hash do registo existente.
DO $migration$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.ks_finalize_sale(uuid,jsonb,jsonb)'::regprocedure)
    INTO v_definition;

  IF position('FOR UPDATE' IN v_definition) = 0 THEN
    RETURN;
  END IF;

  v_definition := replace(v_definition, E'\n    FOR UPDATE;', E'\n    ;');
  IF position('FOR UPDATE' IN v_definition) > 0 THEN
    RAISE EXCEPTION 'Não foi possível remover o lock de linha da recuperação idempotente.';
  END IF;

  EXECUTE v_definition;
END;
$migration$;
