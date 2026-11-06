# Inventário de persistência — Kanawa Soft 1.0

Data da atualização: 2026-11-06

## Estado verificado na branch `feat/agt-api-foundation`

| Camada | Estado | Função |
|---|---|---|
| Supabase Auth | Ativo | Identidade, sessão, OTP por email e registo de colaboradores convidados |
| PostgreSQL/Supabase | Fonte central cloud | Empresas, memberships, produtos, vendas, stock, licenças, integrações e registos genéricos |
| `public.ks_records` | Ativo com RLS | Persistência genérica por empresa/módulo, com `company_id` e `store_key` |
| Tabelas normalizadas `ks_*` | Ativas com RLS | Núcleo de empresas, produtos, clientes, vendas, pagamentos, stock, licenças e integrações |
| IndexedDB | Mantido no renderer | Cache local, interface offline e fila de operações pendentes |
| localStorage | Cache/contexto transitório | Não é fonte de verdade empresarial nem de autorização |
| SQLite/sql.js | Retirado do runtime e dependências | O servidor já não cria `kanawa.db` |

## Alterações implementadas

- `server/server.js` deixou de importar ou inicializar `server/database.js`.
- O servidor Express local do Electron limita-se a servir a interface e endpoints de saúde; as rotas CRUD SQLite antigas devolvem HTTP 410.
- `server/database.js` foi removido.
- As dependências `sql.js` e `bcryptjs` foram removidas de `package.json` e `package-lock.json`.
- O arranque desktop deixou de passar um diretório de base de dados ao servidor.
- O renderer mantém IndexedDB apenas como cache/fila offline. Operações pendentes só são confirmadas após resposta do Supabase.
- `app/cloud.js` carrega permissões do membership, atualiza perfil cloud, lista equipa, cria convites, altera acessos e aceita convites via Supabase Auth.
- A interface deriva autorização do membership cloud e deixou de aceitar autoelevação local de papel.
- A mudança de senha usa Supabase Auth; não grava senha em IndexedDB.
- O plano técnico `starter` está reposto, sem preço ou limites comerciais inventados, para permitir trial de 14 dias.
- As políticas RLS sobrepostas foram consolidadas; advisor de segurança sem findings e advisor de performance sem avisos de políticas permissivas.

## Testes PostgreSQL executados com ROLLBACK

1. Onboarding: Auth user, perfil, empresa, membership owner, licença trial 14 dias, subscrição, locale Angola e configuração de mapas.
2. Convite: administrador cria convite, colaborador usa o código, membership cashier ativo e permissões aplicadas.
3. POS: venda, item, pagamento, decremento de stock, movimento e espelho persistidos na mesma transação.
4. Idempotência: repetir a venda não duplica venda, pagamento, movimento ou espelho e não volta a descontar stock.
5. Stock insuficiente: venda acima da quantidade disponível é recusada sem efeitos parciais.

Todos os dados de teste foram revertidos. Verificação posterior: 0 Auth users, 0 registos operacionais, 0 objetos Storage; 1 plano interno `starter` preservado e 2 buckets mantidos.

## Pendências confirmadas

1. Testes de browser completos no onboarding, OTP, dispositivos, convites, alteração de papel e suspensão/reativação.
2. Testes da fila IndexedDB em perda de internet, conflito, repetição e recuperação. Uma operação local pendente nunca pode ser apresentada como confirmada no PostgreSQL.
3. A seleção de empresa ativa ainda usa a primeira membership ativa; a troca entre múltiplas empresas precisa de implementação e testes.
4. O envio automático de convites por email ainda não está integrado; o administrador partilha o código por um canal externo.
5. Reconstruir os planos comerciais, preços e limites depois de aprovados.
6. A integração AGT permanece em desenvolvimento, não homologada e não certificada.

## Critério de conclusão

Nenhuma operação crítica deve ser considerada concluída apenas porque foi escrita em IndexedDB. A interface deve distinguir claramente estado local pendente e estado confirmado no PostgreSQL. O isolamento entre empresas deve ser validado com pelo menos duas contas de teste.
