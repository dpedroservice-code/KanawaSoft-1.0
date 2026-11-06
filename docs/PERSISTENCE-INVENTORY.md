# Inventário inicial — persistência e integração

Data da inspeção: 2026-11-06

## Evidência confirmada no código consultado

| Área | Evidência | Consequência |
|---|---|---|
| Documentação principal | `README.md` descreve Supabase Auth, PostgreSQL em `public.ks_records`, RLS e cache IndexedDB | A documentação apresenta uma arquitetura cloud |
| Dependências | `package.json` inclui `sql.js`, Express e dependências Electron; não declara `@supabase/supabase-js` | O backend desktop tem dependências explícitas de SQLite; o cliente Supabase pode estar carregado por CDN ou noutro ficheiro, ainda por localizar |
| Arranque do servidor | `server/server.js` chama `initDB(path.join(dataDir, 'kanawa.db'))` e serve a pasta `app/` | O servidor local ainda inicializa uma base SQLite |
| Comentário/diagnóstico do servidor | O cabeçalho declara “SQLite local shell · Supabase Cloud”; o log de arranque declara “SQLite · 135 tabelas” | O projeto parece manter dois modos de persistência que precisam de fronteira e sincronização explícitas |
| Integração AGT | `server/agt/jws.js` e `server/agt/client.js` estão separados do renderer | Boa fronteira inicial; não deve ser exposta sem autenticação, autorização por empresa e persistência durável |

## Risco principal

Não está demonstrado, apenas com estes ficheiros, que todos os módulos do ERP gravem na mesma base central. A documentação, o modo desktop e o modo web podem ter caminhos de dados diferentes. Isso cria risco de duplicação, dados divergentes, perda de alterações entre dispositivos e comportamento diferente entre desktop e cloud.

## Decisão técnica provisória

- Não remover `sql.js`, `kanawa.db` ou rotinas existentes nesta fase.
- Não declarar SQLite como fonte cloud nem Supabase como única fonte efetiva até inspecionar todos os pontos de leitura/escrita.
- Definir PostgreSQL/Supabase como destino central pretendido para multi-dispositivo; manter SQLite apenas se for necessário para modo desktop/offline, com sincronização explícita e auditável.
- Não usar localStorage como base principal nem sincronizar indiscriminadamente todas as tabelas.
- Antes de qualquer migração, criar cópia de segurança e inventário de esquema, volumes, chaves e dependências.

## Próximos ficheiros a inspecionar

1. `server/database.js` e `server/routes.js`: esquema, CRUD, transações, autenticação e rotas.
2. Ficheiros de inicialização do Supabase dentro de `app/`: URL, chave publicável, sessão e listeners.
3. Serviços de sincronização IndexedDB/localStorage: formato da fila, resolução de conflitos e migração inicial.
4. Migrações SQL, triggers e políticas RLS do Supabase: cobertura por tabela e isolamento de empresa.
5. Módulos de vendas, stock, compras, caixa e faturação: identificar operações que alteram mais de um domínio.

## Critério para avançar

Só depois de mapear cada fluxo página → serviço → API → tabela local/cloud → política de acesso → teste será seguro consolidar repositórios e retirar duplicações. A migração deve ser incremental, com testes de regressão e plano de reversão.
