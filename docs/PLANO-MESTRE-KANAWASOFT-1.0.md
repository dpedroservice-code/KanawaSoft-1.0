# Plano Mestre Único — Kanawa Soft ERP 1.0
**Documento central de arquitetura, integração, execução e validação**

- Repositório: https://github.com/dpedroservice-code/KanawaSoft-1.0
- Branch de trabalho: `feat/agt-api-foundation`
- Pull Request: https://github.com/dpedroservice-code/KanawaSoft-1.0/pull/1
- Data desta consolidação: 2026-11-06
- Estado: plano técnico consolidado; implementação funcional ainda parcial.

> Este é o documento central para orientar todas as etapas. Os documentos anteriores de arquitetura, inventário e AGT passam a ser referências auxiliares/históricas; este plano é a fonte única de sequência e prioridades. Não confundir o que está planeado com o que já está implementado ou testado.

## 1. Objetivo final

Transformar o Kanawa Soft num ERP integrado, multiempresa e multi-dispositivo, em que todos os módulos partilham a mesma autenticação, empresa ativa, permissões, regras de negócio e camada de dados. O sistema deve funcionar de forma coerente na web e, se mantido, no modo desktop/offline, sem bases concorrentes nem duplicação de registos.

A integração com a API de Faturação Eletrónica da AGT será uma fronteira fiscal segura, isolada no servidor, ativada apenas depois de confirmar a documentação oficial e concluir os testes e procedimentos exigidos.

## 2. Regras de execução e proteção

1. Preservar a versão original, o histórico Git e todos os dados existentes.
2. Trabalhar em branches de trabalho e em alterações pequenas, revisáveis e testáveis.
3. Não apagar código, tabelas, dados, rotinas SQLite ou configurações existentes sem inventário, cópia de segurança e aprovação explícita.
4. Não fazer merge, deploy, publicação, alteração DNS/domínio `kanawasoft.shop`, migrações ou alterações de produção sem autorização explícita.
5. Não expor service-role keys, JWT secrets, chaves privadas, tokens ou credenciais no frontend, Git ou logs.
6. Não enviar documentos fiscais reais à AGT durante desenvolvimento.
7. Não inventar endpoints, headers, payloads, estados ou significados de códigos AGT.
8. Em cada etapa, registar ficheiros alterados, testes executados e resultados reais. Se não foi testado, declarar NÃO TESTADO.
9. Distinguir sempre: IMPLEMENTADO, TESTADO, CONFIRMADO EM DOCUMENTAÇÃO OFICIAL, PENDENTE, FALHOU e NÃO VERIFICÁVEL.
10. Nenhuma documentação ou interface pode afirmar que o produto está certificado, homologado ou conforme sem evidência oficial.

## 3. Arquitetura única pretendida

### 3.1 Camadas

- **Interface:** páginas web/desktop e componentes visuais; sem segredos, SQL direto ou regras fiscais críticas.
- **Aplicação:** casos de uso comuns, por exemplo criar venda, receber compra, transferir stock, emitir documento e sincronizar.
- **Domínio:** validações e regras de negócio independentes da interface.
- **Serviços/repositórios:** ponto comum de acesso aos dados; impedir que cada módulo crie a sua própria ligação ou lógica de persistência.
- **API de servidor:** autenticação, autorização, validação, limites, transações e operações privilegiadas.
- **Dados:** PostgreSQL/Supabase como fonte central cloud; eventual base local apenas como cache/offline controlada.
- **Workers/outbox:** processamento assíncrono durável para sincronização, notificações e AGT.

Fluxo padrão: Interface → caso de uso → autenticação/autorização → validação de domínio → serviço/repositório/API → PostgreSQL → resposta canónica à interface.

### 3.2 Fonte de verdade e armazenamento

A fonte central pretendida para a versão cloud é PostgreSQL/Supabase. IndexedDB pode manter cache e fila de operações offline. localStorage não deve ser usado como base empresarial.

**Divergência já observada:** o README descreve Supabase Auth/PostgreSQL e `public.ks_records`, enquanto `server/server.js` inicializa `kanawa.db` através de `sql.js`. Portanto, ainda não está provado que todos os módulos gravem no mesmo local.

Decisão segura:
- primeiro mapear todas as leituras e escritas;
- manter SQLite e os dados existentes durante a análise;
- definir se SQLite continuará como modo desktop/offline ou se será descontinuado numa migração futura;
- só migrar depois de backup, comparação de dados, testes e plano de reversão;
- não criar novas tabelas que dupliquem estruturas já existentes.

## 4. Mapa integral dos módulos e dependências

| Ordem | Módulo | Integração necessária |
|---|---|---|
| 1 | Identidade e autenticação | sessão central, recuperação, verificação de email, encerramento de sessão |
| 2 | Empresas e filiais | empresa ativa, NIF, sede/ponto local, filiais, moeda e parâmetros |
| 3 | Utilizadores e permissões | proprietário, administrador, gerente, operador, caixa e permissões por ação |
| 4 | Configuração fiscal | IVA, regime, séries, retenções e parâmetros por empresa, validados para Angola |
| 5 | Clientes | ficha, contactos, moradas, histórico e saldos |
| 6 | Fornecedores | ficha, contactos, compras e saldos |
| 7 | Produtos e serviços | SKU, código de barras, unidade, custo, preço, imposto e estado |
| 8 | Compras | encomendas, receções, fornecedores e atualização de stock |
| 9 | Armazéns e stock | existências, lotes, custo, inventário, mínimos e movimentos |
| 10 | Transferências | origem, destino, quantidades, aprovação, saída e entrada ligadas |
| 11 | Vendas e POS | carrinho, caixa, descontos, pagamento e finalização atómica |
| 12 | Financeiro | contas, pagamentos, recebimentos, caixa e reconciliação |
| 13 | Documentos fiscais | faturas, recibos, notas, séries, estados e histórico |
| 14 | Integração AGT | assinatura, submissão, requestID, consulta, reconciliação e auditoria |
| 15 | Entregas e rotas | ponto da empresa, origem, destino, distância, rota, entrega e prova |
| 16 | E-commerce | catálogo publicado, preços, stock disponível e sincronização de encomendas |
| 17 | Importação/exportação | mapeamento, validação, deduplicação e registo da origem |
| 18 | Relatórios | indicadores por empresa, período, módulo e permissões |
| 19 | Administração SaaS | planos, licenças, avaliação, limites, instalações e expiração |
| 20 | Auditoria e suporte | histórico de ações, erros, diagnóstico, backups e recuperação |

Todos os módulos devem usar a mesma empresa ativa, o mesmo mecanismo de permissões e os mesmos serviços de dados. Não criar implementações paralelas por página.

## 5. Contratos de dados, empresas e permissões

Cada entidade empresarial deve ter, conforme aplicável:
- UUID estável;
- `company_id` obrigatório;
- timestamps e utilizador responsável;
- estado explícito;
- origem do registo;
- versão/controlo de concorrência;
- chave de idempotência para operações repetíveis.

O servidor deve determinar as empresas às quais o utilizador tem acesso com base na sessão e nas associações ativas. Não confiar num `company_id` livremente enviado pelo browser. RLS deve isolar os dados por empresa e papel. Testes negativos devem provar que um utilizador de uma empresa não consegue consultar ou alterar outra empresa.

Papéis e permissões são configuráveis pelo administrador, com princípio de menor privilégio. Alterações a permissões, dados fiscais, stock, caixa e documentos devem ser auditadas.

## 6. Regras de integração comercial

- Uma venda finalizada deve atualizar venda, stock, caixa/financeiro e documento de forma consistente, preferencialmente numa transação.
- O POS não permite vender mais do que a quantidade disponível, salvo funcionalidade de pré-encomenda explicitamente definida.
- Uma receção de compra regista fornecedor, linhas, custos e movimentos de entrada.
- Uma transferência regista saída e entrada ligadas pelo mesmo identificador, sem editar quantidades diretamente.
- Inventários e ajustes geram movimentos auditáveis.
- Documentos fiscais emitidos não são alterados silenciosamente; correções seguem os fluxos documentais apropriados.
- Relatórios consultam os dados canónicos e não mantêm cópias divergentes.
- E-commerce publica apenas produtos autorizados e respeita preço, disponibilidade e estado de publicação.

## 7. Sincronização web, desktop e offline

A cache local guarda apenas dados necessários e autorizados. A fila offline guarda operações, não cópias arbitrárias de tabelas. Cada operação inclui ID único, empresa, utilizador, tipo, payload, data e estado.

Estados internos possíveis: `pending`, `processing`, `synced`, `conflict`, `failed`. Estes estados são do ERP e não são estados oficiais AGT.

Processo:
1. validar sessão e membership;
2. ordenar operações pelas dependências;
3. enviar ao servidor;
4. aplicar idempotência;
5. devolver IDs e versões canónicas;
6. assinalar conflitos para resolução;
7. preservar payload em caso de erro;
8. limpar a fila apenas após confirmação durável.

A interface deve distinguir claramente dados locais pendentes de dados confirmados na cloud. Perda de internet não pode apagar dados confirmados nem mostrar sincronização concluída falsamente.

## 8. Faturação eletrónica AGT

### 8.1 Base já existente

A branch de trabalho contém uma base isolada em `server/agt/client.js`, utilitário JWS em `server/agt/jws.js`, testes dedicados e documentação inicial. A base prevê assinatura RS256, submissão, captura de `requestID` e consulta de estado preservando o `resultCode`.

Isto não significa que a integração esteja homologada, certificada ou pronta para produção.

### 8.2 Segurança de chaves

A chave privada do produtor de software deve permanecer no servidor, protegida e fora do Git. A chave do produtor é distinta das credenciais/chaves do contribuinte. O browser nunca recebe chaves privadas, service-role keys ou credenciais AGT.

### 8.3 Fluxo de integração pretendido

1. validar o documento fiscal no ERP;
2. guardar o documento e uma chave de idempotência na base central;
3. colocar uma operação numa outbox durável;
4. assinar no servidor com a chave adequada;
5. submeter apenas para endpoint oficial confirmado;
6. guardar resposta integral e `requestID`;
7. consultar estado de forma controlada;
8. preservar `resultCode` exatamente como recebido;
9. reconciliar timeouts e resultados ambíguos antes de qualquer repetição;
10. guardar evidência e histórico por empresa/documento.

Não repetir automaticamente uma submissão quando o resultado é incerto. Não inventar o significado dos códigos AGT. Confirmar documentação, ambiente, autenticação, payload, headers, limites, estados e códigos antes de ativar o fluxo. PDF, impressão ou email não equivalem à aceitação pela AGT.

### 8.4 Pendências AGT

- contrato e endpoints oficiais confirmados;
- autenticação e credenciais oficiais;
- outbox PostgreSQL e RLS;
- idempotência e reconciliação;
- fila persistente, backoff e limites;
- auditoria e observabilidade;
- testes de homologação;
- processo e evidências de registo/certificação do software.

## 9. Segurança transversal e operação

- RLS e autorização no servidor para todas as tabelas multiempresa;
- validação de payload e proteção contra mass assignment;
- rate limiting nos endpoints sensíveis;
- segredos fora do código e dos logs;
- logs sem tokens, passwords, chaves ou dados fiscais desnecessários;
- backups e testes reais de restauração;
- gestão de dependências e auditoria dos workflows CI;
- testes de concorrência, falha, timeout e recuperação;
- mensagens de erro úteis sem revelar informação interna.

## 10. Plano único de execução — sequência obrigatória

### Etapa 1 — inventário técnico completo
Inspecionar `app/`, `server/`, scripts, `package.json`, migrações, tabelas, triggers, RLS e workflows. Mapear cada ecrã para serviço, API, tabela e permissão. Identificar todos os usos de SQLite, Supabase, IndexedDB e localStorage.

**Entrega:** matriz de dependências e mapa de leitura/escrita.  
**Não avançar para migração antes desta entrega.**

### Etapa 2 — núcleo comum
Consolidar sessão, empresa ativa, membership, papéis, permissões, configuração e tratamento de erros. Remover duplicações apenas depois de provar que são redundantes.

**Aceitação:** testes de isolamento multiempresa e de permissões aprovados.

### Etapa 3 — camada de dados única
Definir repositórios/serviços comuns. Normalizar o acesso ao PostgreSQL/Supabase. Decidir o papel de SQLite no desktop e da cache offline. Preparar backup, migração incremental e reversão.

**Aceitação:** operações de teste persistem e são lidas consistentemente entre dispositivos.

### Etapa 4 — cadastros mestres
Unificar empresas, filiais, clientes, fornecedores, produtos, serviços, unidades, categorias e impostos.

**Aceitação:** um registo criado num módulo aparece nos outros módulos autorizados sem duplicação.

### Etapa 5 — compras, stock e transferências
Integrar receções, armazéns, movimentos, inventários, mínimos, lotes e transferências.

**Aceitação:** movimentos de entrada/saída conciliam e não permitem quantidades inválidas.

### Etapa 6 — vendas, POS e financeiro
Integrar carrinho, caixa, pagamentos, vendas, recebimentos, contas e relatórios financeiros.

**Aceitação:** finalizar uma venda atualiza os domínios relacionados sem estados parciais ou duplicados.

### Etapa 7 — sincronização e e-commerce
Concluir fila offline, idempotência, conflitos, importação/exportação, APIs, webhooks e publicação de produtos na loja.

**Aceitação:** sincronização entre dispositivos não duplica nem perde operações e respeita permissões/stock.

### Etapa 8 — documentos fiscais e AGT
Validar regras fiscais e documentação oficial, implementar outbox, assinatura, submissão, consulta e reconciliação em ambiente apropriado.

**Aceitação:** testes e evidências oficiais concluídos; até lá, integração permanece não certificada e sem submissões reais.

### Etapa 9 — entregas, rotas e localização
Unificar ponto da empresa, endereços de origem/destino, cálculo de distância, atribuição e estados de entrega.

**Aceitação:** rota e estado da entrega associados à encomenda correta, com controlo de acesso.

### Etapa 10 — SaaS, relatórios e experiência
Consolidar licenças, períodos de avaliação, limites, painel administrativo, indicadores, responsividade, acessibilidade e desempenho.

**Aceitação:** permissões e limites são aplicados no servidor, e os indicadores refletem dados canónicos.

### Etapa 11 — testes integrados e preparação de lançamento
Executar testes unitários, integração, regressão, segurança, carga, recuperação e validação de fluxos completos. Preparar preview e plano de reversão.

**Aceitação:** resultados registados, falhas críticas resolvidas e aprovação explícita antes de merge/deploy.

## 11. Critérios globais de conclusão

O Kanawa Soft só pode ser considerado integrado quando:
- todos os módulos usam identidade, empresa ativa e permissões comuns;
- os dados têm uma fonte canónica e sincronização definida;
- operações críticas são atómicas e idempotentes;
- isolamento multiempresa foi testado;
- offline não perde nem duplica operações;
- stock, POS, financeiro e documentos conciliam;
- integrações externas têm validação, logs e recuperação;
- AGT foi validada apenas com documentação e evidências oficiais;
- testes foram realmente executados e os resultados publicados;
- produção só é atualizada após aprovação explícita.

## 12. Estado atual conhecido e próximo trabalho

**Confirmado no repositório/branch consultados:**
- base inicial de cliente AGT e assinatura JWS separada no servidor;
- testes focados adicionados, mas não executados neste ambiente;
- README atualizado para apontar para documentação de arquitetura;
- divergência entre documentação cloud e inicialização local SQLite observada;
- PR #1 permanece aberta, em rascunho, sem merge.

**Ainda pendente/não confirmado:**
- inventário completo de todos os módulos e fluxos;
- camada de persistência realmente unificada;
- cobertura efetiva de RLS em todas as tabelas;
- autenticação/autorização de todos os endpoints;
- migração segura ou sincronização SQLite/Supabase;
- testes automatizados executados;
- outbox, idempotência e reconciliação AGT;
- contrato oficial AGT e certificação/homologação;
- deploy e validação de produção.

**Próxima tarefa técnica imediata:** concluir a Etapa 1, começando por `server/database.js`, `server/routes.js`, inicialização Supabase no frontend, serviços de sincronização, migrações e políticas RLS. Só depois propor e implementar alterações funcionais concretas.

---
**Regra final:** este plano é o único roteiro mestre do projeto. Atualizar este ficheiro a cada etapa concluída, mantendo nele o estado real, evidências, commits, testes e próximos passos. Não criar novos documentos de plano paralelos.
