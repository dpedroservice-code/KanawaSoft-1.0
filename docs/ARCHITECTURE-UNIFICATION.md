# Arquitetura unificada — Kanawa Soft ERP 1.0

## Objetivo e estado

Este documento define a integração entre os módulos do ERP para que trabalhem sobre uma única identidade de empresa, uma única camada de acesso a dados e contratos comuns. É uma especificação de implementação incremental, não uma declaração de que todos os módulos já estejam integrados.

**Estado:** proposta técnica para revisão. Não executar migrações, não ativar submissões AGT e não alterar produção com base apenas neste documento.

## 1. Princípios obrigatórios

1. PostgreSQL/Supabase é a fonte central de verdade para dados cloud.
2. IndexedDB é apenas cache e fila offline no dispositivo; localStorage não pode ser uma segunda base de dados empresarial.
3. Cada registo empresarial pertence a um `company_id`; o servidor deriva a empresa autorizada da sessão e nunca confia num `company_id` enviado livremente pelo browser.
4. Cada módulo usa serviços/repositórios partilhados. Não criar ligações Supabase, autenticação ou regras de negócio paralelas dentro de cada ecrã.
5. O browser usa apenas a chave publicável. Service-role keys, chaves privadas, credenciais AGT e segredos ficam no servidor.
6. Operações críticas são auditáveis, idempotentes quando aplicável e protegidas contra repetição.
7. Interfaces podem evoluir sem quebrar os contratos de API e os dados existentes.
8. A versão legada continua preservada; migrações são aditivas, versionadas e reversíveis sempre que tecnicamente possível.

## 2. Mapa funcional e dependências

| Domínio | Responsabilidade | Depende de |
|---|---|---|
| Identidade e acesso | sessão, utilizadores, papéis, permissões e convites | Supabase Auth, memberships |
| Empresas e configuração | NIF, sede/ponto local, moeda, IVA, regime e preferências | identidade, auditoria |
| Clientes e fornecedores | fichas, contactos, endereços e saldos | empresas, permissões |
| Produtos e serviços | catálogo, códigos, preços, impostos e unidades | empresas, configuração fiscal |
| Compras | fornecedores, encomendas e receções | produtos, fornecedores, stock |
| Stock | armazéns, lotes, movimentos, transferências e inventário | produtos, compras, vendas |
| Vendas e POS | carrinho, caixa, descontos e finalização | clientes, produtos, stock, pagamentos |
| Financeiro | contas, recebimentos, pagamentos e reconciliação | vendas, compras, caixa |
| Documentos fiscais | séries, documentos, notas e estados fiscais | vendas, clientes, configuração fiscal |
| AGT | assinatura, submissão, consulta e reconciliação | documentos fiscais, outbox, credenciais |
| Entregas e rotas | origem, destino, distância, estado e prova de entrega | encomendas, endereços |
| Relatórios | indicadores e exportações por empresa/período | domínios operacionais |
| Administração SaaS | planos, licenças, limites, instalações e demonstrações | identidade, empresas |
| Integrações | e-commerce, APIs externas, importação/exportação e webhooks | catálogo, encomendas, segurança |
| Auditoria e suporte | trilho de eventos, erros e diagnóstico | todos os domínios |

A tabela representa fronteiras funcionais. Não autoriza a criar tabelas duplicadas para dados que já existam.

## 3. Camadas comuns

- **Interface:** páginas e componentes sem SQL, segredos ou regras fiscais críticas.
- **Aplicação:** casos de uso como finalizar venda, receber compra, transferir stock e emitir documento.
- **Domínio:** validações e regras independentes da interface.
- **Repositórios:** único ponto de leitura/escrita para PostgreSQL/Supabase e cache offline.
- **API de servidor:** valida sessão, papel, empresa, payload, limites e autorização.
- **Persistência:** PostgreSQL com chaves estrangeiras, índices, constraints e RLS.
- **Processamento assíncrono:** outbox durável e workers para sincronização, notificações e AGT.

Fluxo recomendado: Interface → caso de uso → validação/autorização → repositório/API → PostgreSQL. A cache offline replica apenas os dados autorizados e sincroniza por operações pendentes; nunca substitui a confirmação do servidor.

## 4. Contratos de dados e isolamento empresarial

Entidades empresariais devem ter, conforme aplicável:

- identificador UUID estável;
- `company_id` obrigatório;
- `created_at`, `updated_at` e autor da alteração;
- versão ou mecanismo de concorrência para atualizações;
- estado explícito, sem apagar registos financeiros/fiscais por conveniência;
- origem e chave de idempotência para operações repetíveis.

As políticas RLS devem validar membership ativo e papel autorizado. Acesso entre empresas deve falhar por omissão. Operações privilegiadas só no servidor, com validação explícita da empresa e registo de auditoria.

## 5. Regras de consistência entre módulos

- Uma venda finalizada gera movimentos de stock e lançamentos financeiros de forma atómica no servidor.
- Uma receção de compra atualiza stock e custo conforme política contabilística configurada.
- Uma transferência cria saída e entrada ligadas pelo mesmo identificador; não é uma edição direta da quantidade.
- O POS não permite vender quantidade superior ao stock disponível, salvo regra explícita e autorizada de pré-encomenda.
- Documentos fiscais emitidos não são editados silenciosamente; correções usam documentos/fluxos próprios e rastreáveis.
- Relatórios consultam dados normalizados; não mantêm cópias manuais divergentes.
- Importações e APIs externas passam por validação, mapeamento, deduplicação e registo de origem.

## 6. Offline e sincronização

A fila offline deve guardar operações, não apenas cópias arbitrárias de tabelas. Cada operação inclui identificador único, empresa, utilizador, tipo, payload validável, data local e estado de sincronização.

Estados internos sugeridos: `pending`, `processing`, `synced`, `conflict`, `failed`. Estes estados são internos do Kanawa Soft e não representam estados da AGT.

A sincronização deve:
1. validar sessão e membership atual;
2. enviar operações por ordem de dependência;
3. aplicar idempotência no servidor;
4. devolver identificadores e versões canónicas;
5. sinalizar conflitos para resolução, sem sobrescrever silenciosamente;
6. reter erros sem perder o payload;
7. limpar a fila apenas após confirmação durável.

## 7. Fronteira de faturação eletrónica AGT

O módulo fiscal prepara e valida documentos; o adaptador AGT comunica apenas através do servidor. A chave do produtor de software é distinta das credenciais/chaves do contribuinte. A chave privada nunca chega ao browser.

A integração já iniciada em `server/agt/client.js` é uma base isolada. Antes de expor rotas ou enviar documentos, ainda é necessário confirmar em documentação/ambiente oficial os endpoints, autenticação, payload, headers, limites, estados e significado de `resultCode`.

O processamento futuro deve usar uma outbox PostgreSQL: registar documento e chave de idempotência antes do envio, guardar a resposta integral e `requestID`, consultar estado sem duplicar submissões e reconciliar timeouts ambíguos. Não repetir POST automaticamente quando o resultado é incerto. Não traduzir `resultCode` sem tabela oficial confirmada.

PDF, impressão e email são canais de entrega do documento; não provam aceitação pela AGT. Homologação e certificação são etapas separadas e continuam pendentes.

## 8. Segurança e auditoria

- Autenticação central; autorização por empresa e por ação.
- RLS em todas as tabelas multiempresa.
- Validação de payload no servidor e proteção contra mass assignment.
- Rate limiting e proteção de endpoints sensíveis.
- Segredos fora do Git, frontend, logs e mensagens de erro.
- Logs sem passwords, tokens, chaves privadas ou dados fiscais desnecessários.
- Auditoria de alterações de permissões, dados fiscais, stock, caixa e documentos.
- Backups, restauração testada e política de retenção definida.
- Dependências e workflows CI revistos antes de publicar.

## 9. Plano de integração incremental

### Fase A — inventário e contratos
Identificar tabelas, páginas, APIs e persistências existentes; mapear duplicações; decidir qual implementação existente será reutilizada. Não criar novas tabelas antes deste inventário.

### Fase B — núcleo comum
Consolidar sessão, empresa ativa, permissões, configuração, repositórios e tratamento de erros. Adicionar testes de isolamento entre empresas.

### Fase C — operações comerciais
Unificar catálogo, clientes, fornecedores, compras, stock, POS, vendas, caixa e financeiro com transações e movimentos rastreáveis.

### Fase D — sincronização e integrações
Normalizar cache offline, fila, idempotência, importação/exportação, e-commerce, webhooks e observabilidade.

### Fase E — fiscal e AGT
Fechar contrato oficial, outbox, reconciliação, testes de homologação e evidências de certificação antes de qualquer ativação real.

### Fase F — relatórios, SaaS e experiência
Consolidar indicadores, licenças, limites, administração, responsividade, acessibilidade e desempenho.

## 10. Critérios de aceitação transversais

- Um utilizador de uma empresa não consegue ler nem alterar dados de outra empresa.
- Os módulos usam a mesma empresa ativa e as mesmas permissões.
- Uma operação crítica não fica parcialmente aplicada em caso de falha.
- Repetir a mesma operação com a mesma chave não duplica vendas, movimentos ou submissões.
- Perda de internet não apaga dados confirmados nem cria falsas confirmações.
- A interface distingue dados locais pendentes de dados confirmados no servidor.
- Logs permitem rastrear uma operação sem expor segredos.
- Testes cobrem sucesso, falha, timeout, concorrência, autorização e recuperação.
- Nenhum requisito AGT é declarado confirmado sem fonte oficial e data.

## 11. Próxima execução técnica

1. Inventariar o código real de `app/`, `server/`, scripts e migrações Supabase.
2. Identificar o cliente Supabase e a camada de persistência já existente antes de alterar dependências.
3. Mapear tabelas `ks_*`, `ks_records`, políticas RLS e triggers existentes.
4. Criar uma matriz página → caso de uso → API/repositório → tabela → permissão → teste.
5. Corrigir primeiro duplicações comprovadas, uma área de cada vez, com testes e commits pequenos.

**Limite desta entrega:** este documento organiza a arquitetura alvo. Não significa que todos os módulos, políticas, transações ou testes acima já estejam implementados.
