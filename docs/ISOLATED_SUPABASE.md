# KanawaSoft 1.0 — Supabase isolado

## Projeto atribuído

- Projeto: `kanawasoft-1-0-isolated`
- Project ref: `mhaynctedpyqjxdhdisv`
- Região: `eu-west-1`
- API URL: `https://mhaynctedpyqjxdhdisv.supabase.co`
- Repositório: `dpedroservice-code/KanawaSoft-1.0`
- Branch de integração: `feat/isolated-supabase-foundation`

Este projeto é exclusivo deste repositório. Não reutilizar o projeto Supabase `APP` nem qualquer credencial de outro ERP/repositório. A publishable key pode ser usada no browser com RLS; nunca expor service-role keys, secret keys, passwords ou tokens de fornecedor.

## Estrutura criada

A migração inicial criou tabelas de empresas, perfis, associações, administradores de plataforma, filiais, registos JSONB por módulo, produtos, planos, licenças, instalações, uso diário, taxas de câmbio, regras fiscais, pedidos de demonstração, vendas e linhas de venda. RLS foi ativado e as operações principais são verificadas por associação à empresa.

## Autenticação

O fluxo de email OTP mantém `shouldCreateUser: false`. O fluxo SMS usa telefone E.164 (por exemplo, `+244923000000`) e `type: sms`. A área **Configurações → Acesso por SMS** permite iniciar a associação do telefone com `auth.updateUser({ phone })` e confirmar o código com `verifyOtp({ type: 'phone_change' })`. Só depois da confirmação o número passa a estar associado à conta Auth para o login SMS.

Para o SMS funcionar em produção, é necessário:
1. Ativar Phone Auth no Supabase Auth.
2. Configurar um fornecedor SMS suportado e as respetivas credenciais diretamente no painel Supabase.
3. Confirmar o telefone na área Configurações → Acesso por SMS.
4. Testar envio, reenvio, código expirado, número inválido e login em dispositivo diferente.

O telefone guardado nos metadados da empresa/perfil não é, por si só, um telefone Auth verificado. Não guardar segredos do fornecedor no GitHub, no browser ou em mensagens de chat.

## Segurança e publicação

A branch ainda requer revisão e testes funcionais completos antes de merge. Não publicar no domínio `kanawasoft.shop` nem alterar o site Netlify de produção durante esta etapa. O projeto antigo permanece intocado.
