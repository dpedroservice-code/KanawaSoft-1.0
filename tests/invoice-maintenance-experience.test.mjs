import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const invoice = readFileSync(new URL('../app/fatura-modelos.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

test('invoice templates provide selectable layouts and use company and sale data', () => {
  for (const layout of ['classic','modern','minimal']) assert.ok(invoice.includes(layout));
  for (const field of ['companyName','company.nif','company.endereco','company.telefone','company.email','company.banco','company.iban','sale.numeroFatura','sale.clienteNome','sale.operador','sale.total','sale.troco']) {
    assert.ok(invoice.includes(field), 'missing invoice data binding: '+field);
  }
  assert.match(invoice,/global\.KanawaInvoiceTemplates/);
  assert.match(app,/KanawaInvoiceTemplates\.render/);
});

test('invoice QR is optional and never fakes a QR or claims AGT validation', () => {
  assert.match(invoice,/cfg\.showQr===true/);
  assert.match(invoice,/server-verified AGT integration/);
  assert.doesNotMatch(invoice,/quiosqueagt|Código de Autenticação AGT|Hash de assinatura/);
  assert.match(app,/QR indisponível neste dispositivo/);
  assert.doesNotMatch(app,/const grid = 25/);
});

test('company bank details and custom commercial terms are configurable for invoices', () => {
  assert.match(app,/cfgIban/);
  assert.match(app,/cfgBanco/);
  assert.match(app,/cfgInvoiceTerms/);
  assert.match(app,/cfgInvoiceBank/);
  assert.match(app,/salvarConfigFatura/);
  assert.match(invoice,/company\.iban/);
  assert.match(invoice,/Termos e condições da empresa/);
});

test('maintenance orders record customer company, assigned technician, dates and completion report', () => {
  for (const token of ['empresaCliente','tecnicoNome','tecnicoId','dataAgendada','proximaManutencao','dataConclusao','relatorioTecnico','historico']) {
    assert.ok(app.includes(token), 'missing maintenance tracking field '+token);
  }
  assert.match(app,/function verDetalheManutencao/);
  assert.match(app,/function salvarManutencaoAtivo/);
});

test('login feedback is neutral and database vendor is not named in user-facing application strings', () => {
  assert.match(app,/A processar acesso/);
  assert.match(app,/A preparar sincronização segura/);
  assert.doesNotMatch(app,/guardada no PostgreSQL|A sincronizar com PostgreSQL/);
  assert.match(html,/ERP Empresarial 1\.0/);
});

test('commercial proposals retain the client company and link accepted business to the sale', () => {
  assert.match(app,/empresaCliente/);
  assert.match(app,/atualizarEstadoOrcamento/);
  assert.match(app,/status='convertida'/);
  assert.match(app,/orcamentoOrigem/);
  assert.match(app,/vendaId=venda\.id/);
  assert.match(app,/Propostas e Negócios/);
});

test('official invoice numbering is atomic, per company and reserved server-side', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20261107124000_invoice_sequence_per_company_year.sql', import.meta.url), 'utf8');
  const cloud = readFileSync(new URL('../app/cloud.js', import.meta.url), 'utf8');
  assert.match(migration,/primary key \(company_id, fiscal_year\)/);
  assert.match(migration,/last_number = private\.ks_invoice_sequences\.last_number \+ 1/);
  assert.match(migration,/security definer/);
  assert.match(migration,/ks_has_company_role/);
  assert.match(cloud,/nextInvoiceNumber/);
  assert.match(app,/await KanawaCloud\.nextInvoiceNumber\(\)/);
  assert.match(app,/RASCUNHO-/);
});

test('paid tiers are unlimited while the 14-day evaluation remains bounded', () => {
  const plans = readFileSync(new URL('../supabase/migrations/20261107125000_paid_plans_unlimited_usage.sql', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  assert.match(plans,/max_users = 0/);
  assert.match(plans,/max_installations = 0/);
  assert.match(plans,/max_invoices_period = 0/);
  assert.match(plans,/all_modules',true/);
  assert.match(html,/Facturas e operações ilimitadas/);
  assert.match(app,/Facturas ilimitadas/);
});
