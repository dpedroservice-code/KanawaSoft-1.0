# Integração AGT — base técnica Kanawa Soft

## Estado real desta entrega

O repositório já contém geração da chave do produtor, assinatura JWS RS256 e testes dessa assinatura. Esta etapa acrescenta um cliente HTTP isolado para:
- assinar o objeto do documento com a chave privada do produtor;
- enviar o documento com o campo `jwsDocumentSignature`;
- guardar o `requestID` devolvido pelo serviço;
- consultar o estado usando o `requestID`;
- preservar o `resultCode` original e a resposta completa, sem inventar o significado dos códigos.

**Isto ainda não é integração homologada nem certificação AGT.** O cliente não é exposto por uma rota pública nesta etapa, porque o servidor legado não tem ainda autenticação cloud validada e autorização por empresa para estas operações.

## Configuração necessária no servidor

Definir fora do repositório:
- `KANAWA_AGT_SOFTWARE_PRIVATE_KEY_PATH`: caminho protegido para a chave privada do produtor;
- `KANAWA_AGT_SUBMIT_URL`: URL oficial do serviço de registo de documentos;
- `KANAWA_AGT_STATUS_URL_TEMPLATE`: URL oficial de consulta, contendo `{requestID}`.

Os dois URLs devem ser copiados da documentação/ambiente oficial disponibilizado à empresa ou ao produtor de software. Não adivinhar caminhos, hosts, headers ou credenciais. Se o serviço exigir headers de autenticação adicionais, passá-los por configuração segura do servidor, nunca pelo browser.

Gerar o par localmente com:

```bash
node scripts/agt/generate-software-keypair.js
```

A chave privada deve permanecer fora do Git, com permissões restritas e backup seguro. A chave pública do produtor é a que se prepara para o processo de registo do software. As chaves do contribuinte são um fluxo distinto e não devem ser confundidas com a chave do produtor.

## Utilização interna

```js
const { createAgtClient } = require('./server/agt/client');

const agt = createAgtClient({
  // URLs e headers devem vir de configuração protegida do servidor.
});

// Depois de validar e persistir o documento fiscal localmente:
const submission = await agt.submitDocument(documentoFiscal);
// Persistir submission.requestID e a resposta integral antes de consultar novamente.

const status = await agt.getDocumentStatus(submission.requestID);
// Persistir status.resultCode e status.response sem traduzir códigos por suposição.
```

## Regras de segurança e operação

1. Não repetir automaticamente um POST quando o resultado for incerto ou faltar `requestID`: primeiro reconciliar a submissão para evitar duplicar documentos.
2. Persistir documento, hash, assinatura, empresa, utilizador, data, `requestID`, `resultCode`, tentativas e respostas numa outbox durável com isolamento por empresa.
3. Só ativar fila, retentativas e polling após definir idempotência, limites, backoff e estados conforme a documentação oficial.
4. Nunca colocar chaves privadas, service-role keys ou credenciais AGT no frontend, em commits ou nos logs.
5. PDF e email são etapas posteriores; não significam que o documento foi aceite pela AGT.

## Pendências antes de ativar em produção

- Confirmar os contratos exatos de submissão e consulta do ambiente AGT aplicável.
- Confirmar os campos obrigatórios, headers, autenticação, limites e significado oficial de cada `resultCode`.
- Implementar persistência PostgreSQL/outbox com RLS e operações privilegiadas apenas no servidor.
- Adicionar autenticação do utilizador, autorização por empresa e auditoria antes de expor endpoints.
- Implementar fila persistente, idempotência e reconciliação de timeouts.
- Testar no ambiente de homologação e concluir o processo oficial de validação/certificação.
