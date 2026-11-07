-- Supplementary Angola registry fields and initial employer compliance references.
alter table public.ks_company_legal_profiles
 add column if not exists commercial_entry_number text,
 add column if not exists commercial_certificate_expires_at date,
 add column if not exists registry_office text,
 add column if not exists tax_registration_date date,
 add column if not exists tax_regime_effective_date date;
insert into public.ks_legal_register(company_id,jurisdiction,instrument_code,title,subject_area,source_url,status,notes)
values
(null,'AO','Lei 11/15 + DP 153/16 + DP 60/20 + DE 168/20','Publicação online dos actos das empresas no GUE','Registo comercial e publicidade societária','https://gue.gov.ao/portal/public/publicacoes','to_review','O GUE informa que a publicação online dispensa publicação no Diário da República. Registar referência/link da publicação GUE e confirmar regras aplicáveis a cada acto.'),
(null,'AO','Decreto Presidencial 295/20','Regime Jurídico de Vinculação e Contribuição da Protecção Social Obrigatória','INSS e contribuições sociais','https://portal.inss.gov.ao/','to_review','Registar número de inscrição da entidade empregadora, trabalhadores, datas de início e alterações; confirmar prazos e obrigações actuais.'),
(null,'AO','Lei 21/20','Alteração ao Código Geral Tributário','Fiscalidade e obrigações declarativas','https://portaldocontribuinte.minfin.gov.ao/legislacao','to_review','Consultar texto consolidado e alterações subsequentes no Portal do Contribuinte.'),
(null,'AO','Lei 14/23','Código do Imposto sobre o Valor Acrescentado (alterações e regime aplicável)','IVA e facturação','https://portaldocontribuinte.minfin.gov.ao/legislacao','to_review','Confirmar o texto vigente, periodicidade declarativa e obrigações por regime antes de automatizar declarações.')
on conflict do nothing;
