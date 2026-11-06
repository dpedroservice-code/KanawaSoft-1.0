-- KanawaSoft 1.0 — repõe o plano interno exigido pelo trigger de onboarding.
-- O preço e os limites comerciais ficam intencionalmente por definir; este registo
-- existe para suportar a avaliação técnica de 14 dias sem inventar preços/quotas.

INSERT INTO public.ks_saas_plans (
  code,
  name,
  monthly_price_usd,
  annual_price_usd,
  max_users,
  max_products,
  max_invoices_month,
  max_monthly_revenue_usd,
  storage_mb,
  allowed_modules,
  is_public
)
VALUES (
  'starter',
  'Starter — Avaliação técnica (14 dias)',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  ARRAY[]::text[],
  false
)
ON CONFLICT (code) DO NOTHING;
