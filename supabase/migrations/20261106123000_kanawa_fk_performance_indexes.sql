-- KanawaSoft 1.0 — índices para as chaves estrangeiras sem cobertura.
-- Reduz o custo de JOINs e de verificações de integridade nas tabelas de equipa e API.

CREATE INDEX IF NOT EXISTS idx_ks_company_branches_created_by
  ON public.ks_company_branches (created_by);

CREATE INDEX IF NOT EXISTS idx_ks_store_api_keys_created_by
  ON public.ks_store_api_keys (created_by);
