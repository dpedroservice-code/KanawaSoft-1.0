-- KanawaSoft 1.0 — combine company-member and platform-admin installation policies.
DROP POLICY IF EXISTS ks_installations_admin_insert ON public.ks_installations;
DROP POLICY IF EXISTS ks_installations_insert ON public.ks_installations;
CREATE POLICY ks_installations_insert
ON public.ks_installations
FOR INSERT TO authenticated
WITH CHECK (
  private.ks_is_platform_admin()
  OR (private.ks_is_company_member(company_id) AND user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS ks_installations_admin_update ON public.ks_installations;
DROP POLICY IF EXISTS ks_installations_update ON public.ks_installations;
CREATE POLICY ks_installations_update
ON public.ks_installations
FOR UPDATE TO authenticated
USING (
  private.ks_is_platform_admin()
  OR (user_id = (SELECT auth.uid()) AND private.ks_is_company_member(company_id))
)
WITH CHECK (
  private.ks_is_platform_admin()
  OR (user_id = (SELECT auth.uid()) AND private.ks_is_company_member(company_id))
);
