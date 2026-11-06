# Kanawa Soft ERP — base oficial em consolidação

**Repositório de destino:** `dpedroservice-code/KanawaSoft-1.0`  
**Estado:** revisão técnica e consolidação; não declarar pronto para produção.

## Documento mestre único

Toda a arquitetura, o inventário comparativo, as decisões, a sequência de implementação, os testes e o estado real do projeto ficam centralizados num único documento:

[Plano Mestre Único — Kanawa Soft ERP 1.0](docs/PLANO-MESTRE-KANAWASOFT-1.0.md)

Este ficheiro é a referência central. Deve ser atualizado a cada etapa concluída. Não criar planos paralelos.

## Âmbito desta revisão

A consolidação está limitada a dois repositórios:

- **Destino:** [KanawaSoft-1.0](https://github.com/dpedroservice-code/KanawaSoft-1.0)
- **Fonte para comparação:** [Kanawasoftv15.2](https://github.com/dpedroservice-code/Kanawasoftv15.2)

Os restantes repositórios e as cópias locais do proprietário ficam fora do âmbito. O repositório V15.2 é uma fonte de código candidata, não uma segunda linha de desenvolvimento. Não copiar branches inteiras nem substituir ficheiros sem análise de dependências e testes.

## Arquitetura e persistência — estado atual

Supabase Auth e PostgreSQL são a fonte central de identidade e dados empresariais. SQLite/sql.js foi removido do runtime e das dependências. O servidor local do Electron serve apenas a interface e endpoints de saúde. IndexedDB permanece como cache e fila offline controlada; os fluxos de onboarding, convites e POS foram testados em transações PostgreSQL com ROLLBACK. Ainda faltam testes de browser e validação completa da sincronização offline entre dispositivos.

## Publicação

A configuração `netlify.toml` publica a pasta `app/`. O domínio `kanawasoft.shop` permanece em pausa durante esta revisão. Não alterar DNS, projeto Netlify, produção ou configurações externas sem autorização explícita.

## AGT

A integração de faturação eletrónica deve permanecer isolada no servidor. Não guardar chaves privadas ou credenciais no browser, não inventar endpoints ou códigos e não declarar certificação/homologação sem evidência oficial. Não submeter documentos fiscais reais durante o desenvolvimento.

## Validação

Antes de qualquer lançamento, executar e registar testes de:
- sintaxe, build e dependências;
- autenticação, memberships e isolamento multiempresa;
- permissões por papel;
- persistência e sincronização entre dispositivos;
- vendas, stock, transferências e idempotência;
- integrações AGT em ambiente autorizado;
- Electron, Netlify preview, segurança e recuperação.

**A PR #1 permanece em draft. Nenhum merge, deploy ou publicação de produção está autorizado por este README.**
