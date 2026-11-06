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


## 13. Revisão de consolidação — âmbito autorizado e evidências do Git

### 13.1 Âmbito confirmado pelo proprietário

A revisão nesta fase está limitada a estes dois repositórios hospedados no GitHub:

1. **Destino oficial pretendido:** `dpedroservice-code/KanawaSoft-1.0`.
2. **Fonte de código para comparação e aproveitamento:** `dpedroservice-code/Kanawasoftv15.2`.

Os repositórios existentes no computador do proprietário não fazem parte desta operação. Todos os outros repositórios GitHub ficam fora do âmbito e não devem ser alterados, renomeados, arquivados ou apagados.

A intenção é formar uma única base de código oficial no repositório de destino. O repositório V15.2 serve nesta revisão como fonte de comparação e recolha de implementações; não deve originar uma segunda linha de desenvolvimento permanente. Não copiar ficheiros em massa nem escolher uma versão apenas pelo número.

### 13.2 Estado observado nos dois repositórios

**KanawaSoft-1.0**
- Branch principal: `main`, commit observado `12050bc352a1671bbb8298af4119bbc21db39baa`.
- Branch de trabalho existente: `feat/agt-api-foundation`, commit observado `b36bd90bdf290f8fd18df6b4a0c2d8857ca3f5b8`.
- PR #1 está aberta e em draft; não foi integrada.
- `netlify.toml` publica a pasta `app/`; portanto, o `index.html` da raiz não é o HTML publicado por esta configuração.
- Existe uma aplicação em `app/index.html` e outra página HTML grande na raiz. A duplicação precisa de análise de dependências antes de qualquer remoção.
- `package.json` declara `15.2.0`, `server/server.js` declara `APP_VERSION = '15.2'`, enquanto `app/index.html` identifica a interface como v15.3 Cloud. A versão está inconsistente.
- O servidor inicializa `data/kanawa.db` com `sql.js`; isto confirma que a persistência local continua ativa no modo servidor/desktop.
- O README descreve Supabase Auth/PostgreSQL como base cloud. A utilização simultânea dos dois mecanismos ainda precisa de mapa completo de leituras, escritas e sincronização.

**Kanawasoftv15.2**
- Branch principal observada: `main`, commit `8ba40cfec9db5db4f212e6d879f2e4ac558f5ce6`.
- `package.json` declara `15.3.0` e `server/server.js` declara `APP_VERSION = '15.3.0'`; o nome do repositório não corresponde à versão declarada pelo código.
- O README apresenta o produto como versão de produção 1.1.0, mas a documentação de prontidão ainda identifica v15.3. Isto requer normalização, não uma simples substituição textual.
- O código cloud usa Supabase Auth e PostgreSQL; o servidor Node/Electron continua a inicializar SQLite com `sql.js`. A coexistência exige decisão arquitetural e testes de consistência.
- Existem funções Supabase, migrações SQL, testes, configuração AGT, GPS/mapas e módulos auxiliares que não estão todos presentes no destino 1.0.
- O repositório contém branches adicionais de funcionalidades v15.4 e de hardening. Essas branches não são automaticamente parte da branch principal.
- A branch `feat/kanawa-production-hardening` está divergente da `main` (66 commits à frente e 44 atrás no momento da comparação). Não fazer merge integral nem cherry-pick em bloco.
- As branches/PRs relacionadas com v15.4, GPS, stock e plano técnico têm de ser avaliadas por ficheiro e por dependência. Estado fechado de uma PR não significa que tenha sido integrada.

### 13.3 Decisões técnicas de consolidação

1. A branch de destino continua a ser a linha oficial do Kanawa Soft 1.0 até a revisão determinar a estrutura final.
2. O código de V15.2 será tratado como fonte candidata. Cada módulo será comparado com o destino e aproveitado apenas quando for mais completo, seguro e compatível.
3. Não fazer merge de branches inteiras apenas porque têm número superior ou nome de produção.
4. A consolidação deve resultar numa única aplicação publicada e numa única implementação de cada serviço, rota, módulo e contrato de dados.
5. Antes de remover duplicações, identificar qual HTML é realmente carregado, scripts referenciados, imports, rotas, build e comportamento Electron/Netlify.
6. PostgreSQL/Supabase é o destino de persistência cloud pretendido. SQLite só poderá permanecer se tiver um papel desktop/offline explícito, isolado e sincronizado por contratos testados; não pode competir como segunda fonte de verdade.
7. IndexedDB pode ser cache/fila offline; localStorage não deve armazenar dados empresariais sensíveis nem ser fonte de verdade.
8. Migrações Supabase devem ser consolidadas sem perder histórico, ordem, políticas RLS, funções, triggers e compatibilidade com os dados existentes.
9. O fluxo AGT deve ser mantido isolado no backend, com chaves fora do browser e sem alegações de certificação/homologação.
10. A versão de produto, `package.json`, servidor, interface, Electron, README e metadados de build devem passar a ter uma única versão coerente após a revisão — não antes.

### 13.4 Próxima sequência concreta

**Fase A — inventário comparativo**
- Construir uma matriz destino 1.0 versus fonte V15.2 para cada ficheiro e módulo.
- Comparar `app/app.js`, `app/index.html`, `app/cloud.js`, `server/database.js`, `server/routes.js`, `server/server.js`, `desktop/`, `package.json`, testes, Edge Functions e migrações.
- Identificar duplicados por hash, divergências funcionais, ficheiros órfãos e dependências.
- Mapear cada ecrã para os serviços, tabelas, permissões e testes correspondentes.

**Fase B — arquitetura e dados**
- Resolver a divergência SQLite/Supabase com um desenho de fonte de verdade e modo offline.
- Inventariar todas as tabelas e migrações; validar RLS por empresa e papel.
- Definir contratos únicos para autenticação, empresa ativa, permissões, vendas, stock, pagamentos, e-commerce e AGT.

**Fase C — integração controlada**
- Integrar os módulos selecionados no destino 1.0 em alterações pequenas e revisáveis.
- Eliminar duplicações somente depois de testes de regressão provarem que a implementação substituta cobre o comportamento.
- Atualizar este mesmo documento mestre com cada decisão, ficheiro, commit, teste e pendência.

**Fase D — validação e lançamento**
- Executar testes unitários, integração, segurança, isolamento multiempresa, persistência, sincronização, Electron e build Netlify.
- Preparar preview isolado. O domínio próprio e a publicação em produção permanecem em pausa.
- Só considerar lançamento depois de evidência de testes e aprovação explícita.

### 13.5 Estado desta revisão

- Âmbito dos dois repositórios confirmado.
- Inventário inicial das árvores, branches, PRs e ficheiros centrais realizado.
- Branch de auditoria criada em V15.2: `audit/consolidacao-kanawasoft-1.0`.
- PR #1 do destino permanece aberta em draft.
- Nenhum código foi apagado, nenhum merge foi executado, nenhum repositório foi renomeado e nenhum deploy foi iniciado.
- Testes de aplicação ainda NÃO EXECUTADOS nesta revisão.
- Renomear o repositório V15.2 para `KanawaSoft-1.1.0` permanece uma ação administrativa pendente; a ligação GitHub disponível nesta sessão não expõe uma operação de renomeação de repositório. O nome do repositório não deve ser alterado por substituição de texto no código.

**Próximo trabalho obrigatório:** concluir a matriz comparativa por módulo e por dependência. Não começar a apagar nem substituir código antes de essa matriz mostrar qual implementação será preservada.


### 13.6 Comparação estrutural por árvore Git

Comparação realizada entre `feat/agt-api-foundation` do destino e `main` da fonte V15.2:

- Destino 1.0: 45 ficheiros versionados na árvore comparada.
- Fonte V15.2: 77 ficheiros versionados na árvore comparada.
- 11 caminhos partilhados têm conteúdo diferente.
- 38 caminhos existem na fonte e não existem no destino.
- 7 caminhos existem no destino e não existem na fonte.

**Diferenças de maior impacto encontradas na fonte V15.2:**
- Módulos adicionais: `app/agt-config.js`, `app/gps-map.js`, `app/module-hub.js`, `app/operations-validation.js`, `app/performance-bridge.js`, `app/permissions.js`, `app/sales-money.js`, `app/support-center.js` e `app/manual.html`.
- Funções Supabase: `ks-agt-test`, `ks-company-reset`, `ks-invite-member` e `ks-store-api`.
- Migrações de segurança AGT, empresas/filiais, permissões, finalização, dados privados, API e preservação de histórico.
- Testes de finalização, operações, permissões, vendas e prontidão.
- A fonte tem `data/kanawa.db` versionado. Esse ficheiro contém dados e não pode ser copiado para produção nem tratado como migração de esquema.

**Diferenças de maior impacto no destino 1.0:**
- `server/agt/client.js` e `tests/agt-client.test.mjs`, ausentes na árvore principal V15.2 comparada.
- Documento mestre e documentos de arquitetura/inventário.
- Um `index.html` adicional na raiz, além de `app/index.html`.

**Ficheiros partilhados com divergências:** workflows Netlify, README, `app/app.js`, `app/cloud.js`, `app/index.html`, Electron main/preload, package/lockfile e servidor/routes. Estes exigem comparação de conteúdo e comportamento, não substituição automática.

### 13.7 Ramos avançados V15.4 — descoberta crítica

A comparação de branches V15.4 com a `main` da fonte encontrou uma evolução arquitetural importante, ainda não integrada na main:

- `feat/kanawasoft-v15.4-maps-gps-tracking`: 263 commits à frente e 33 atrás da main no momento da consulta.
- `feat/kanawasoft-v15.4-angola-fiscal-core`: 158 à frente e 33 atrás.
- `feat/kanawasoft-v15.4-stock-ledger`: 168 à frente e 33 atrás.
- A branch GPS/mapas contém `server/supabase-gateway.js`, remove `server/database.js` e remove `sql.js` do `package.json`. O servidor passa a não inicializar SQLite e a declarar Supabase/PostgreSQL como persistência principal.
- A mesma branch inclui testes de arquitetura cloud-only, gateway Supabase, motor de mapas/GPS, motor de stock e migração de venda atómica/idempotente.
- A migração `20261104100000_kanawa_v154_atomic_sales_idempotency.sql` implementa uma RPC de finalização de vendas com validação de sessão/permissões, cálculo monetário, controlo de stock e idempotência. É uma candidata relevante, mas requer revisão SQL e execução em base de teste.
- O gateway de vendas encaminha o JWT do utilizador para PostgREST/RPC e não faz um round-trip adicional ao Auth. A autorização final tem de permanecer na função SQL/RLS; não confiar apenas na validação do gateway.
- O módulo de mapas usa geocodificação Nominatim e rotas OSRM públicas. Antes de produção, avaliar limites de utilização, política dos fornecedores, disponibilidade, privacidade e eventual serviço contratado.
- O módulo de mapa tem uma vista inicial centrada em Luanda; a localização efetiva da empresa e do dispositivo deve continuar a ser determinada pelos dados/autorização do utilizador, não por coordenadas fixas.

**Decisão:** esta linha V15.4 é uma candidata forte para resolver a duplicidade SQLite/Supabase, mas não será integrada em bloco. Está divergente da main, remove um módulo de 1.673 linhas e altera o contrato de rotas. Primeiro comparar o comportamento de todas as rotas SQLite, serviços de dados e chamadas frontend; depois validar todas as migrações e testes em ambiente isolado.

### 13.8 Matriz preliminar de aproveitamento

| Área | Fonte candidata | Decisão nesta fase |
|---|---|---|
| Persistência | V15.4 cloud-only + gateway Supabase | Candidata prioritária; validar cobertura de todos os casos de uso antes de remover SQLite |
| Autenticação e memberships | `app/cloud.js` + migrações V15.2/V15.4 | Comparar com destino; testar isolamento e revogação de sessão |
| AGT | `app/agt-config.js`, Edge Functions e `server/agt/client.js` do destino | Unificar contrato e manter segredos exclusivamente no servidor |
| POS/vendas | RPC `ks_finalize_sale`, migração de idempotência e testes | Revisão SQL + testes concorrentes antes de integrar |
| Stock | `app/stock-engine.js`, migrações ledger e testes | Comparar custo médio, concorrência, transferências e histórico |
| GPS/rotas | `app/map-tracking.js`, `gps-sync-engine.js`, Android service | Aproveitar com origem/destino configuráveis e fornecedor de rotas validado |
| Permissões | `app/permissions.js`, políticas RLS e RPCs | Validar cada papel no servidor; frontend não é fronteira de segurança |
| Suporte e formação | `app/support-center.js`, `app/manual.html` | Integrar após validar scripts e permissões |
| Testes/CI | workflows e testes da V15.2/V15.4 | Consolidar numa pipeline única; executar no destino antes de release |
| Electron | `desktop/main.js`, `desktop/preload.js` | Comparar contratos IPC e permissões; manter apenas um conjunto coerente |

Esta matriz é preliminar: “candidata” não significa “aprovada”, “integrada” ou “testada”.



### 13.9 Dependências de interface e scripts

A comparação dos `<script src>` de `app/index.html` revelou uma diferença funcional direta:

- O HTML do destino 1.0 carrega bibliotecas, `cloud.js` e `app.js`, mas não carrega os módulos adicionais que a fonte V15.2 declara.
- O HTML da fonte V15.2 carrega, antes/depois de `app.js`, `operations-validation.js`, `sales-money.js`, `permissions.js`, `performance-bridge.js`, `module-hub.js`, `gps-map.js`, `agt-config.js` e `support-center.js`.
- A branch V15.4 GPS/mapas acrescenta `map-tracking.js`, `gps-sync-engine.js`, `stock-engine.js`, `payment-methods.js`, `angola-tax.js`, `technical-pricing.js`, `technical-cloud.js` e `integration-center.js`, além de Leaflet e CSS de mapas.
- Logo, copiar apenas `app/app.js` não basta para obter os módulos V15.2/V15.4. O carregamento, ordem, APIs globais e dependências dos scripts fazem parte da integração.
- A interface do destino tem uma versão de cache-busting `15.3.20261101.2`, apesar de `package.json` e servidor ainda declararem 15.2. Isto reforça a necessidade de normalização coordenada da versão.

**Decisão de integração:** importar módulos por grupos funcionais e atualizar os scripts do HTML apenas depois de confirmar as funções globais que cada módulo espera, a ordem de carregamento e os testes correspondentes. Não acrescentar scripts de forma isolada nem carregar módulos duplicados.

### 13.10 Auditoria técnica aprofundada — backend cloud, cache e desktop

**Comparação realizada nesta etapa:** destino feat/agt-api-foundation versus fonte feat/kanawasoft-v15.4-maps-gps-tracking, além da revisão dos ficheiros de execução e testes da fonte.

#### A. O que a V15.4 melhora e pode ser aproveitado

- A V15.4 remove server/database.js e a dependência sql.js do package.json; server/server.js deixa de chamar initDB e deixa de criar data/kanawa.db.
- A V15.4 mantém as rotas CRUD SQLite antigas desativadas e acrescenta POST /api/sales/finalize, encaminhado para server/supabase-gateway.js.
- O gateway exige um Bearer token e encaminha a operação para a RPC PostgreSQL ks_finalize_sale; a própria migração SQL contém verificações de sessão, associação ativa à empresa, permissões, idempotência, pagamento e movimentos de stock.
- A migração 20261104100000_kanawa_v154_atomic_sales_idempotency.sql é candidata importante para revisão e testes em base isolada. O seu comentário também determina que seja testada numa base dedicada antes de produção.
- A branch contém testes específicos de arquitetura cloud, gateway, finalização atómica, stock, permissões, impostos, GPS/mapas e módulos técnicos. A existência desses testes não prova que tenham passado nesta revisão.

#### B. Bloqueio: desktop ainda não foi migrado para a arquitetura cloud

- O ficheiro desktop/main.js na V15.4 tem o mesmo blob SHA observado no destino e na V15.2 (e341b22a4e2e52e5554851bee04de56749d5e35a). Portanto, o desktop não acompanhou a remoção de SQLite do servidor.
- Continua a criar a pasta local de dados, passa dataDir ao servidor e apresenta no menu “Sobre” a indicação “Base de dados: SQLite local”.
- O mesmo texto contém a afirmação “Certificado AGT — Angola”. Não foi encontrada nesta auditoria evidência de certificação/homologação que sustente essa afirmação; deve ser removida ou substituída por estado factual antes de qualquer lançamento.
- O backup desktop copia ficheiros da pasta userData/data. Na arquitetura V15.4, os dados operacionais offline são mantidos em IndexedDB no perfil Chromium/Electron; não está demonstrado que o backup atual inclua ou restaure essa IndexedDB.
- desktop/preload.js também mantém appVersion: 15.3.0, apesar de a branch declarar V15.4.0 no package.json e no servidor.
- A V15.4 não deve ser considerada pronta para desktop/cloud-only até haver uma estratégia explícita para backup/restauro, dados offline, sessão, arranque e versão do Electron, acompanhada de testes de ponta a ponta.

#### C. A aplicação V15.4 ainda é offline-first no cliente

- O servidor pode ser cloud-only, mas o renderer mantém IndexedDB com dezenas de coleções e a fila _sync_queue.
- saveData grava primeiro em IndexedDB e depois tenta enviar para Supabase; em falhas, mantém a operação na fila. getData consulta a cloud e atualiza a cache local; a reconciliação completa também limpa e repovoa coleções não marcadas como pendentes.
- Este desenho pode ser válido como cache/fila offline, mas não é uma aplicação sem persistência local. A interface deve distinguir claramente “guardado neste dispositivo”, “pendente” e “confirmado na cloud”.
- O fluxo de migração local para cloud compara NIF/nome da empresa e IDs de registos; precisa de testes de colisão de IDs, migração parcial, troca de empresa, repetição, conflitos e recuperação após falha.
- A aplicação mantém dados de contexto de empresa/utilizador em localStorage. Rever minimização, expiração e exposição de dados pessoais; não tratar localStorage como base empresarial nem como mecanismo de autorização.
- O teste cloud-only-architecture.test.mjs verifica a remoção de SQLite do servidor e alguns padrões de arranque/cloud. Não verifica, por si só, a ausência de cache local, o backup IndexedDB, a compatibilidade Electron nem o comportamento completo offline.

#### D. Integração frontend e módulos

- A V15.4 app/index.html carrega scripts adicionais de mapas, validação operacional, cálculo monetário, impostos, stock, permissões, pagamentos, GPS, cloud, suite técnica e centro de integrações.
- A V15.4 app/cloud.js é substancialmente maior que a versão no destino e inclui métodos adicionais de equipa, pagamentos e funcionalidades de instalação/licença.
- A ordem dos scripts, as dependências globais e a compatibilidade de cada módulo com o app.js devem ser testadas como conjunto. Não copiar apenas o app.js ou o index.html isoladamente.
- A V15.4 mantém o modelo genérico ks_records e também tabelas normalizadas, como ks_products, para stock e vendas. É necessário mapear a fonte de verdade por entidade e impedir divergências entre payload genérico e tabelas normalizadas.

#### E. Matriz de decisão preliminar

| Área | Destino 1.0 | Fonte V15.4 | Decisão nesta fase |
|---|---|---|---|
| Servidor e persistência | Inicializa SQLite; rotas CRUD antigas desativadas; Supabase no frontend | Servidor sem SQLite; gateway Supabase para finalização de venda | V15.4 é candidata preferencial para backend cloud, condicionada a testes |
| Cache e fila offline | IndexedDB e fila local | IndexedDB e fila local mais evoluída | Aproveitar seletivamente; definir semântica e testes de sincronização |
| Frontend/cloud bridge | Versão menor | Métodos e módulos adicionais | Comparar método a método; não substituir em bloco |
| POS e stock | Fluxo anterior e escrita cloud | validação, stock normalizado e RPC atómica | Rever SQL, RPC, idempotência e concorrência antes de integrar |
| Desktop | SQLite declarado e backup por pasta local | código desktop essencialmente igual ao antigo | Bloqueado para adoção cloud-only até redesenho e testes |
| AGT | cliente JWS/backend já existente no destino | módulos e configuração AGT adicionais na fonte | Preservar o cliente AGT do destino; avaliar módulos sem alegar certificação |
| Mapas/GPS | implementação parcial/ausente | módulos e sincronização GPS adicionais | Candidata a integração separada, com privacidade e limites dos serviços externos |
| Versões | versões divergentes entre package, servidor e interface | package/servidor 15.4, preload 15.3 e texto desktop 15.2 | Normalizar apenas depois da consolidação |

#### F. Ações obrigatórias antes da integração

1. Rever todas as migrações SQL V15.4, RLS, funções SECURITY DEFINER, permissões de execução e search_path; validar em projeto Supabase de teste.
2. Executar a suite Node de testes da branch V15.4 e registar os resultados reais; executar também testes específicos de Electron e build, que ainda não foram demonstrados.
3. Criar testes de backup/restauro que incluam a IndexedDB ou alterar a estratégia de backup para exportação consistente através da camada de dados.
4. Corrigir a afirmação de certificação AGT no texto desktop antes de qualquer release.
5. Mapear cada coleção IndexedDB e cada store_key para tabela, política RLS, permissão e teste.
6. Rever migração local→cloud, conflitos, deduplicação, idempotência e troca de empresa.
7. Preservar server/agt/client.js e os testes AGT exclusivos do destino durante qualquer integração.
8. Só depois criar commits pequenos no destino; nenhum merge, deploy, migração de produção ou alteração de domínio está autorizado por esta etapa.

**Estado desta etapa:** auditoria estática dos ficheiros concluída parcialmente; nenhum teste foi executado nesta sessão; nenhum código de aplicação foi copiado, apagado ou substituído. A matriz acima é preliminar e deve ser refinada com revisão das políticas RLS, funções SQL, dependências, contratos e testes.

**Próxima tarefa imediata:** auditar as migrações/RLS e os testes da V15.4, em seguida comparar os serviços e contratos de cada módulo com o destino 1.0.


### 13.11 Revisão de segurança SQL e evidência CI — V15.4

#### A. Bloqueio crítico nas políticas de escrita de vendas

Na migração 20261104100000_kanawa_v154_atomic_sales_idempotency.sql:

- A política INSERT de ks_records permite a um utilizador com permissão pdv/criar inserir uma linha no store_key vendas sem restringir o payload para impedir status finalizada.
- A política UPDATE restringe, em USING, a linha antiga quando já está finalizada. Porém, o WITH CHECK permite a permissão pdv/criar sem exigir que a nova linha permaneça em rascunho.
- Consequência: um utilizador autenticado com permissão de criação no PDV pode, em princípio, criar diretamente um espelho de venda finalizada ou transformar um rascunho em finalizada através da API de dados, sem executar ks_finalize_sale. Isso pode criar um documento/histórico falso ou divergente sem a transação que grava ks_sales, ks_sale_items, ks_payments e movimentos de stock.
- A operação normal da interface usar a RPC não elimina o risco: a API PostgreSQL pode ser chamada diretamente por um cliente autenticado com permissões concedidas.

**Classificação:** bloqueador crítico de integridade financeira e de stock. Não integrar nem aplicar esta migração enquanto INSERT/UPDATE não impedirem finalização direta e a finalização não estiver protegida por um caminho transacional exclusivo, com testes de autorização negativos.

#### B. Teste atual não cobre a condição que falha

O teste em tests/atomic-sales-migration.test.mjs tem o título “cashier create permission can only update a draft sales mirror, not a finalized one”, mas verifica apenas:
- a presença de payload.status <> 'finalizada' na política UPDATE;
- a presença da permissão pdv/criar dentro de WITH CHECK.

Não verifica que o WITH CHECK bloqueia a nova linha com status finalizada, nem que a política INSERT bloqueia inserção direta de uma venda finalizada. É necessário corrigir o SQL e reforçar o teste com as duas condições, incluindo tentativas diretas de INSERT e UPDATE usando o papel authenticated/cashier numa base PostgreSQL de teste.

#### C. Observações adicionais da migração

- A função ks_finalize_sale define search_path vazio, revoga EXECUTE de PUBLIC e concede EXECUTE a authenticated. Não declara SECURITY DEFINER, pelo que opera por defeito como SECURITY INVOKER; as permissões e políticas RLS das tabelas e funções auxiliares precisam de ser verificadas como parte do teste real.
- A função calcula um fingerprint de idempotência com MD5. Recomenda-se avaliar digest SHA-256 e canonicalização estável do JSON para reduzir riscos de colisão e garantir que a mesma operação produza sempre o mesmo fingerprint.
- A migração inclui validação de totais, descontos, quantidades, pagamentos, linhas e stock, e bloqueia repetição com dados diferentes. Estes controlos são positivos, mas não substituem os testes de autorização e concorrência no PostgreSQL.
- O teste de migração atual faz verificações de texto/regex no ficheiro SQL. Não executa a migração nem prova atomicidade, RLS, locks ou concorrência numa instância PostgreSQL real.

#### D. Evidência de CI observada

- Na fonte V15.2, o workflow “Kanawa CI”, run 368 (ID 41792888374), terminou com failure.
- O job validate falhou na etapa “Check JavaScript syntax” porque o workflow tentou executar node --check app/hr-attendance.js e esse ficheiro não existe na branch consultada (resposta GitHub 404).
- As etapas “Check Supabase Edge Function” e “Run unit tests” foram ignoradas depois da falha de sintaxe. Portanto, esta execução não valida a suite de testes da V15.4.
- O workflow “Netlify deploy” da mesma revisão terminou com success, mas isso não equivale a testes unitários, integração Supabase, validação de migrações ou certificação.
- No destino 1.0, a execução observada para o commit de documentação desta auditoria foi apenas “Netlify deploy” com success; não foi encontrada nessa execução evidência de uma suite completa de testes.

Referências de execução:
- CI V15.2 run 368: https://github.com/dpedroservice-code/Kanawasoftv15.2/actions/runs/41792888374
- Netlify deploy V15.2 run 228: https://github.com/dpedroservice-code/Kanawasoftv15.2/actions/runs/41792888830
- Netlify deploy destino 1.0 run 12: https://github.com/dpedroservice-code/KanawaSoft-1.0/actions/runs/42213638618

#### E. Próximos critérios de aceitação antes de integrar

1. Corrigir políticas INSERT e UPDATE de ks_records para que um cashier/operador com permissão de criação não possa criar nem promover uma venda para finalizada fora da RPC.
2. Definir uma estratégia segura para a RPC gravar o espelho finalizado sem abrir uma via REST alternativa; rever SECURITY INVOKER/DEFINER, RLS, grants e funções auxiliares.
3. Acrescentar testes negativos de INSERT/UPDATE direto e testes positivos da RPC, executados numa base de teste com migrations aplicadas.
4. Executar testes de concorrência: duas caixas a vender o último artigo, retry da mesma chave, retry com payload diferente e falha entre persistência e resposta.
5. Corrigir o workflow CI para verificar apenas ficheiros existentes e garantir que a etapa de testes é executada; voltar a executar e registar o resultado.
6. Rever todos os grants, RLS e funções SECURITY DEFINER/INVOKER nas migrações, não apenas na migração de vendas.

**Estado:** problema crítico identificado por leitura estática; não foi feita alteração no SQL da fonte nem no destino. A migração permanece apenas candidata e não está aprovada para integração ou produção.


### 13.12 Comparação funcional do frontend e da camada cloud

#### A. Métodos exclusivos e compatibilidade da autenticação

Comparação dos métodos de app/cloud.js:

- A versão do destino contém requestOtp(email) e verifyOtp(email, token), com validação de código numérico de seis dígitos por email. Estes métodos devem ser preservados, pois correspondem ao fluxo de autenticação por código pretendido.
- A V15.4 contém métodos adicionais: signIn, changePassword, getNativeTrackingConfig, inviteMember, listCompanyMembers, listPaymentProviderStatus, listCompanyPaymentMethods e saveCompanyPaymentMethods.
- A V15.4 usa signInWithPassword no método signIn; substituir o cloud.js do destino sem adaptação faria desaparecer requestOtp/verifyOtp e contrariaria o fluxo de seis dígitos.
- Decisão: integrar métodos e correções seletivamente; manter OTP e acrescentar os serviços novos com contratos e testes próprios.

#### B. Diferenças de contexto e permissões

- Na V15.4, loadContext consulta membership com company_id, role, status e permissions; consulta empresa, perfil e administrador de plataforma em paralelo; e inclui permissions no contexto.
- No destino, loadContext não seleciona permissions da membership e faz consultas sequenciais.
- A função appRole do destino mapeia owner/admin, manager e cashier; qualquer outro papel cai no perfil operador. A V15.4 mapeia explicitamente operator, cashier, accountant e viewer.
- O PERMISSOES do destino não define contabilista nem visualizador. Assim, um utilizador com papel accountant ou viewer pode cair no perfil operador, que tem permissões de criação no PDV e acesso operacional mais amplo do que um papel apenas de consulta.
- A V15.4 carrega permissions.js e usa KanawaPermissions para interpretar grants por módulo/ação. O destino não carrega esse serviço e usa uma matriz estática simplificada.

**Classificação:** bloqueador de autorização/segregação de funções. Preservar e integrar o mapeamento de papéis e permissões da V15.4, sem perder o OTP do destino; acrescentar testes de regressão para viewer, accountant, cashier, operator, manager e admin. A autorização definitiva deve continuar no servidor/RLS, não apenas no menu.

#### C. Proteção de ambientes de preview

- A V15.4 inclui assertPreviewTenant, que impede que um Deploy Preview Netlify use uma empresa de produção, exigindo que a empresa de teste tenha nome iniciado por TESTE.
- O destino não contém essa verificação.
- É uma proteção adicional contra operações acidentais em dados de produção; não substitui projeto Supabase separado, credenciais separadas nem RLS. Deve ser integrada e testada, com ambientes preview e produção isolados.

#### D. Módulos e funções adicionais encontrados na V15.4

A comparação estática dos nomes de funções identificou na V15.4, entre outras, estas capacidades que não aparecem no app.js do destino:

- POS: validação de stock no carrinho e atualização local do stock.
- GPS/logística: abrir e atualizar mapa de rastreio, calcular rota, obter coordenadas, marcar localização manual, iniciar/parar rastreio e sincronizar posições remotamente.
- Relatórios: carregar dados, aplicar filtros por período, construir tabelas/linhas e imprimir relatórios.
- Configuração: carregar, guardar e aplicar preferências de configuração.
- Pagamentos: renderização e gravação de métodos de pagamento.
- Certificados e impressão: configurar certificados e modelos, gerar documentos e imprimir com HTML seguro.
- RH: acesso a secções e consulta de funcionário.
- Navegação: grupos de módulos e menu móvel.

A V15.4 também inclui ficheiros independentes, carregados em app/index.html, para stock, impostos, pagamentos, GPS, mapas, permissões, suite técnica e centro de integrações. A integração deve preservar a ordem de carregamento e provar que cada função tem o serviço, tabela, RLS e permissão correspondentes.

#### E. Diferenças exclusivas do destino a preservar

- O destino contém o fluxo OTP de seis dígitos (requestOtp/verifyOtp), que não existe com os mesmos métodos na V15.4.
- O destino contém server/agt/client.js e testes dedicados de assinatura/submissão/consulta AGT. Estes ficheiros devem permanecer na consolidação e ser ligados aos módulos AGT da fonte apenas depois de confirmar o contrato oficial.
- O destino possui resetOtpStep, sendLoginCode e showLoginError no frontend, além de lógica de assinatura/hash que não deve ser removida sem rastrear os respetivos usos.

#### F. Sequência de integração funcional

1. Preservar o fluxo OTP e adaptar o cloud bridge da V15.4 em vez de substituir o ficheiro por inteiro.
2. Integrar app/permissions.js e atualizar appRole/loadContext/getPerms para transportar e aplicar grants de membership.
3. Testar que viewer e accountant não recebem permissões de operador/caixa; testar também autorização no backend.
4. Integrar validação de stock e confirmar que a validação frontend coincide com a RPC e as regras SQL.
5. Integrar pagamentos, GPS/mapas, relatórios, RH e suite técnica por módulo, cada um com testes de contrato e RLS.
6. Integrar a proteção de Deploy Preview e configurar ambientes de teste realmente separados.
7. Revalidar scripts, CSP, dependências externas e execução no browser e Electron.

**Estado:** comparação de nomes de funções e revisão de trechos centrais concluídas; não houve cópia de código nem execução de testes nesta etapa. A matriz funcional permanece em revisão e não autoriza merge.


### 13.13 Confronto do cliente AGT com a documentação técnica oficial

**Fontes oficiais consultadas em 2026-11-06:**
- Registar Factura: https://quiosqueagt.minfin.gov.ao/doc-agt/doc-agt/2/servicos/servicos_solicitar_registo.html
- Consultar Estado da Fatura: https://quiosqueagt.minfin.gov.ao/doc-agt/doc-agt/2/servicos/servicos_obter_estado.html
- Estrutura das assinaturas JWS: https://quiosqueagt.minfin.gov.ao/doc-agt/doc-agt/2/estrutura.html

#### A. Contrato oficial de submissão

A documentação consultada especifica POST para:
- Homologação: https://sifphml.minfin.gov.ao/sigt/fe/v1/registarFactura
- Produção: https://sifp.minfin.gov.ao/sigt/fe/v1/registarFactura

O envelope de submissão inclui, entre outros campos obrigatórios:
- schemaVersion;
- submissionUUID único por pedido;
- taxRegistrationNumber;
- submissionTimeStamp ISO 8601;
- softwareInfo;
- numberOfEntries;
- documents (a documentação indica máximo previsto de 30 documentos).

softwareInfo inclui softwareInfoDetail com productId, productVersion, softwareValidationNumber e signatureVersion, além de jwsSoftwareSignature. Cada documento inclui os campos fiscais exigidos, documentStatus e jwsDocumentSignature.

#### B. Divergências concretas do cliente atual

O ficheiro server/agt/client.js:
- envia diretamente o objeto document recebido, acrescentando apenas jwsDocumentSignature;
- não constrói o envelope oficial com schemaVersion, submissionUUID, NIF, timestamp, softwareInfo, numberOfEntries e documents[];
- não gera nem inclui jwsSoftwareSignature no pedido;
- não inclui signatureVersion no objeto softwareInfoDetail;
- não gera jwsSignature de pedido;
- assina o objeto document inteiro, enquanto a documentação da AGT especifica os campos concretos que compõem a assinatura do documento;
- carrega uma única chave por loadSoftwarePrivateKey e usa-a para assinar o documento. A documentação distingue a chave privada do produtor para jwsSoftwareSignature da chave privada do contribuinte emissor para jwsDocumentSignature. Não existe neste cliente separação explícita das duas chaves.

O ficheiro server/agt/jws.js tem createSoftwareSignature, mas essa função não é usada pelo cliente atual; além disso, o objeto de assinatura implementado contém productId, productVersion e softwareValidationNumber, sem signatureVersion.

**Classificação:** bloqueador de conformidade técnica com o contrato consultado. A implementação atual não deve ser ligada a endpoints reais nem apresentada como integração funcional da API AGT.

#### C. Divergência concreta na consulta de estado

A documentação oficial especifica POST para:
- Homologação: https://sifphml.minfin.gov.ao/sigt/fe/v1/obterEstado
- Produção: https://sifp.minfin.gov.ao/sigt/fe/v1/obterEstado

O pedido inclui schemaVersion, submissionUUID, taxRegistrationNumber, submissionTimeStamp, softwareInfo, requestID e jwsSignature. A assinatura do pedido usa, no exemplo documentado, taxRegistrationNumber e requestID.

O cliente atual constrói um URL com {requestID} e executa GET sem corpo. Portanto, o método e o formato do pedido não correspondem ao contrato consultado. O cliente preserva resultCode sem o reinterpretar, o que deve ser mantido; os códigos documentados incluem 0, 1, 2, 7, 8 e 9, e os estados 7/8/9 não devem ser tratados como decisão final de aceitação/rejeição do documento.

#### D. Consequências para a arquitetura e segurança

1. Criar provedores de assinatura separados: chave do produtor para jwsSoftwareSignature e chave do contribuinte emissor para jwsDocumentSignature/jwsSignature, conforme o serviço e a documentação oficial.
2. Não gerar nem preencher softwareValidationNumber fictício. O campo depende do processo oficial de validação/certificação do software.
3. Criar construtores de payload por serviço, com schemas versionados e validação antes de assinar.
4. Implementar registo de série e consulta de séries conforme os serviços oficiais, antes de permitir numeração fiscal como se estivesse autorizada.
5. Persistir submissionUUID, requestID, payload assinado, timestamp, resposta integral, estado e histórico numa outbox/tabela central; nunca depender apenas da memória do processo.
6. Implementar consulta POST assinada, respeitando limites e intervalos indicados pela AGT, sem inventar polling agressivo.
7. Tratar timeout após submissão como resultado desconhecido: reconciliar pelo identificador antes de qualquer repetição.
8. Usar URLs oficiais por ambiente e uma allowlist de hosts/endpoints; não aceitar URL arbitrário de configuração em produção.
9. Criar testes com fixtures derivados do schema oficial e testes de assinatura com chaves separadas; os mocks atuais apenas provam o comportamento do cliente simplificado.
10. Fazer testes de homologação apenas depois de existirem credenciais, chaves, número de validação do software e autorização formal necessários.

#### E. Estado AGT após esta revisão

- Implementado no destino: utilitário JWS RS256, carregamento de chave de software por caminho externo, submissão simplificada, captura de requestID e consulta simplificada de resultCode.
- Não demonstrado: payload oficial completo, separação de chaves do produtor/contribuinte, assinatura do pedido, gestão de séries, outbox durável, consulta POST oficial, reconciliação completa, testes de homologação ou certificação.
- Testes existentes usam endpoint fictício agt.example.test e fetch simulado; não comunicam com a AGT.
- Não foi enviada nenhuma fatura à AGT nem foi feita qualquer alteração de produção.

**Decisão:** preservar os utilitários criptográficos úteis, mas reestruturar o cliente por contrato oficial antes de integrar a AGT no fluxo de faturação do Kanawa Soft. A integração permanece NÃO CONFORME AO CONTRATO COMPLETO / NÃO HOMOLOGADA / NÃO CERTIFICADA até existirem implementação, testes e evidências oficiais.


### 13.14 Retificação da proposta inicial de hardening POS

A proposta histórica que atribuía SECURITY DEFINER à função pública `ks_finalize_sale` foi rejeitada. Não deve ser aplicada: elevaria os privilégios da transação financeira completa e poderia contornar RLS nas tabelas de vendas, pagamentos, stock e utilização.

A arquitetura aprovada mantém a RPC pública como SECURITY INVOKER e limita o privilégio elevado à função privada que grava o espelho finalizado. A versão anterior desta secção fica apenas como histórico e não é uma instrução de implementação.

### 13.15 Arquitetura RLS aprovada para a finalização POS

A correção técnica utiliza:
- `public.ks_finalize_sale` como SECURITY INVOKER, com `search_path` vazio;
- políticas RLS RESTRICTIVE que impedem INSERT/UPDATE direto de espelhos `vendas` com estado `finalizada`;
- `private.ks_upsert_finalized_sale_mirror` como helper SECURITY DEFINER estreito, owner postgres e `search_path` vazio;
- validação de `auth.uid()`, permissão da empresa, venda persistida, valores monetários e correspondência das linhas de artigos;
- EXECUTE revogado de PUBLIC/anon e concedido a authenticated;
- escrita do espelho dentro da mesma transação da venda, sem permitir uma segunda escrita direta pela Data API.

Referência da revisão no repositório fonte: https://github.com/dpedroservice-code/Kanawasoftv15.2/pull/26. A implementação foi copiada seletivamente para o destino KanawaSoft-1.0 e adaptada ao contrato real de `app/cloud.js`.

### 13.16 Limpeza técnica autorizada e executada no Supabase

Em 2026-11-06, após confirmação explícita do proprietário, foi reutilizado o projeto Supabase existente:
- Projeto: APP
- Project ref: `jiehrswweoyesbabrpjf`
- Estado: ACTIVE_HEALTHY
- Região: eu-west-1

A limpeza foi executada no próprio projeto, sem criar projeto ou branch adicional:
- removidos todos os registos operacionais das tabelas públicas do KanawaSoft e da loja D.Pedro;
- removido o utilizador existente de Auth e respetivos registos dependentes;
- Storage verificado: 0 objetos; os dois buckets foram preservados;
- preservados os schemas, as 36 tabelas públicas, funções, políticas RLS e histórico de migrações;
- preservado o catálogo técnico `ks_saas_plans` com 3 planos, por ser referência base do licenciamento.

Verificação posterior: 0 utilizadores Auth, 0 registos operacionais nas tabelas limpas, 0 objetos Storage. O utilizador terá de criar novamente a conta e cada empresa terá de refazer o respetivo cadastro e personalização quando o fluxo de onboarding estiver concluído.

### 13.17 Migrações de correção aplicadas no projeto existente

Depois de uma execução de ensaio em transação com ROLLBACK, foram aplicadas as seguintes migrações ao projeto APP:
1. `20261106123854_kanawa_sales_mirror_rls_hardening`: políticas RLS restritivas para espelhos de venda finalizada, helper privado de escrita validada, RPC pública SECURITY INVOKER e coluna/hash de idempotência.
2. `20261106123908_kanawa_fk_performance_indexes`: índices para `ks_company_branches.created_by` e `ks_store_api_keys.created_by`, cobrindo as duas chaves estrangeiras identificadas pelo advisor.

Verificações posteriores confirmaram:
- coluna `ks_sales.idempotency_hash` existente;
- helper privado existente;
- RPC pública continua SECURITY INVOKER;
- dois índices de chaves estrangeiras existentes;
- advisor de segurança sem findings.

O advisor de performance deixou de apontar as duas chaves estrangeiras sem índice. Mantém avisos de múltiplas políticas permissivas em 11 tabelas, que exigem revisão semântica individual antes de consolidação; também indica índices ainda não utilizados, algo esperado enquanto a base está vazia e sem tráfego real.

### 13.18 Integração seletiva no repositório KanawaSoft-1.0

Na branch `feat/agt-api-foundation`, PR draft #1:
- adicionada a migração de hardening POS e respetivo teste estático;
- atualizado `app/cloud.js` para enviar `record_payload` à RPC e terminar o fluxo após a resposta, evitando tentar gravar novamente o espelho finalizado por uma operação direta bloqueada por RLS;
- adicionada a migração de índices e teste estático;
- adicionado o script `npm test`;
- criado workflow CI para testes Node e verificação sintática JavaScript.

A primeira execução CI falhou por o teste apontar para o nome antigo do ficheiro de migração. O caminho foi corrigido; a nova execução é a run 42219465894 e deve ser verificada antes de marcar os testes como aprovados.

A instalação de dependências no CI reportou 17 vulnerabilidades npm (4 moderadas, 11 altas e 2 críticas). A árvore de dependências precisa de auditoria e correção controlada; não executar `npm audit fix --force` sem análise de compatibilidade.

### 13.19 Bloqueadores ainda abertos antes de considerar o sistema pronto

1. `server/database.js` continua a iniciar uma base local `sql.js`/SQLite e a guardar dados em ficheiro. A arquitetura ainda não está unificada em Supabase/PostgreSQL; é necessário mapear os módulos que dependem da base local antes de a remover.
2. A aplicação ainda precisa de teste integrado autenticado, com utilizador, empresa, permissões, produto, venda, pagamento, decremento de stock e espelho POS na mesma transação. Os testes atuais são estáticos/Node e não substituem um teste PostgreSQL end-to-end.
3. A consolidação das 11 situações de múltiplas políticas permissivas deve ser feita apenas após comparar os predicados RLS e provar que não altera permissões.
4. As 17 vulnerabilidades npm precisam de triagem por pacote, dependência direta/transitiva e compatibilidade.
5. A integração AGT continua incompleta face ao contrato técnico completo e não está homologada/certificada. Não ativar faturação real nem afirmar conformidade.
6. O PR #1 continua em draft e não foi merged. O workflow Netlify para pull request executa apenas deploy de preview; o deploy de produção está condicionado a push na branch main após merge.

**Estado:** a limpeza e as duas migrações de base de dados foram executadas no projeto existente. O código foi atualizado seletivamente no PR #1, mas o KanawaSoft 1.0 ainda não está pronto para produção nem foi declarado funcional a 100%.