# KanawaSoft 1.0 — ERP Expansion & Integration Foundation

This change is additive and targets ONLY the isolated Supabase project `mhaynctedpyqjxdhdisv` on the existing feature branch. It does not change `kanawasoft.shop`, Netlify, the production deployment, or the existing core schema.

## Database expansion
Migration `20261107100000_erp_integrations_foundation.sql` adds 45 company-scoped operational tables, plus 3 legal/compliance tables for purchasing, warehouse/stock movements, customers, quotations, finance, HR/payroll, projects, service orders, assets, fleet/delivery, e-commerce, marketing, automation, support, knowledge articles and connectors. Existing core tables remain intact. Tenant RLS is enabled on the new operational tables. Credential vault and e-commerce API-key tables have RLS enabled with no client policies and are service-role-only.

## Meta / WhatsApp credentials
The app must not place Meta App Secret, WhatsApp token, access token, refresh token or webhook secret in HTML, browser storage, public JS, Git, or chat. The integration screen collects them only for a single HTTPS request to the Edge Function. The function verifies the Supabase JWT and active company membership, encrypts credentials with AES-256-GCM using the server-only `INTEGRATION_ENCRYPTION_KEY`, and writes ciphertext using the service role. The key is never returned. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and a 32-byte base64 `INTEGRATION_ENCRYPTION_KEY` as Edge Function secrets before enabling saves.

## E-commerce API keys
API keys are generated server-side, displayed once, and stored only as SHA-256 digests. The clear key must be copied by the operator at creation time; it cannot be retrieved later. Revoke and rotate compromised keys.

## Integration status
This is a secure credential-storage and schema foundation, not a completed Meta OAuth/webhook/messaging integration. No messages or campaigns are sent by this change. A later phase must add Meta OAuth consent, token refresh, webhook signature validation, queue/retry workers, provider API versioning, and delivery/error monitoring.

## AI module guide
The database includes a knowledge-article store for Portuguese module instructions. The AI assistant should answer using company-authorized module metadata and published help articles; do not send passwords, access tokens, personal customer data or payroll data to an external model. AI provider keys belong in server-side environment secrets.

## Legal / compliance
Add configuration and workflow support, not legal certification. Angola fiscal settings and invoices must be checked against current AGT specifications and applicable legislation by qualified personnel. Never represent this ERP as AGT-certified or homologated until the official process is completed.
