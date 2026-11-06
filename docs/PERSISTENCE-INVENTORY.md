# Inventário de persistência — Kanawa Soft 1.0

Data da atualização: 2026-11-06

## Estado verificado na branch `feat/agt-api-foundation`

| Camada | Estado | Função |
|---|---|---|
| Supabase Auth | Ativo | Identidade, sessão e OTP por email |
| PostgreSQL/Supabase | Fonte central cloud | Empresas, memberships, produtos, vendas, stock, licenças, integrações e registos genéricos |
| `public.ks_records` | Ativo com RLS | Persistência genérica por empresa/módulo, com `company_id` e `store_key` |
| Tabelas normalizadas `ks_*` | Ativas com RLS | Núcleo de empresas, produtos, clientes, vendas, pagamentos, stock, licenças e integrações |
| IndexedDB | Mantido no renderer | Cache local, interface offline e fila de operações pendentes |
| localStorage | Mantido apenas para preferências/contexto transitório | Não é fonte de verdade empresarial |
| SQLite/sql.js | Retirado do runtime e dependências | O servidor já não cria `kanawa.db` |

## Alterações desta etapa

- `server/server.js` deixou de importar ou inicializar `server/database.js`.
- O servidor Express local do Electron limita-se a servir a interface e endpoints de saúde; as rotas CRUD SQLite antigas já devolvem HTTP 410.
- `server/database.js` foi removido.
- As dependências `sql.js` e `bcryptjs` foram removidas de `package.json` e `package-lock.json`.
- O arranque desktop deixou de passar um diretório de base de dados ao servidor.

## Fronteira de dados

O renderer mantém IndexedDB porque é necessário para cache e fila offline. As operações cloud continuam a passar por `app/cloud.js`, com a chave publicável e as políticas RLS do PostgreSQL. A cache não deve ser interpretada como confirmação de gravação central: uma operação pendente só fica sincronizada após confirmação do Supabase.

## Pendências confirmadas

1. O fluxo de onboarding precisa de teste integrado após o reset. O trigger `private.ks_handle_new_user` cria perfil, empresa e membership a partir dos metadados de signup; o trigger de empresa cria licença trial de 14 dias e configurações-base. Validar esta cadeia com um utilizador de teste real antes de reabrir o registo.
2. O catálogo `ks_saas_plans` está vazio. O bootstrap de licença usa o código `starter`; é necessário repor esse plano com módulos e limites aprovados antes de testar onboarding.
3. A sincronização offline precisa de testes de falha, repetição, conflito e recuperação; não basta a cache local.
4. Os módulos que usam stores marcadas como locais (`empresas`, `usuarios`, segurança, dispositivos e configurações) precisam de revisão para garantir que a informação autoritativa é obtida do Auth, memberships e tabelas cloud, sem depender de cópias locais.
5. A operação POS precisa de teste PostgreSQL end-to-end com utilizador autenticado.
6. A integração AGT permanece em desenvolvimento e não homologada.

## Critério de conclusão

Nenhuma operação crítica deve ser considerada concluída apenas porque foi escrita em IndexedDB. A interface deve distinguir claramente estado local pendente e estado confirmado no PostgreSQL. O isolamento entre empresas deve ser validado com pelo menos duas contas de teste.
