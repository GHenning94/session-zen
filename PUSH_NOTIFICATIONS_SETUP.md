# Guia de Configuração - Push Notifications

## ⚠️ Status Atual
As push notifications do navegador foram **temporariamente desabilitadas** devido a erros no service worker.

## 🔧 Como Reativar (Passo a Passo)

### 1. Gerar Novas Chaves VAPID

Execute o comando abaixo no terminal para gerar um par de chaves VAPID:

```bash
npx web-push generate-vapid-keys
```

Você receberá algo como:
```
Public Key: BNxxx...
Private Key: xxx...
```

### 2. Configurar os Secrets no Supabase

No painel do Supabase (ou Lovable Cloud), adicione dois secrets:

- `VAPID_PUBLIC_KEY`: Cole a chave pública (Public Key)
- `VAPID_PRIVATE_KEY`: Cole a chave privada (Private Key)

### 3. Atualizar o Código

Atualize a constante `VAPID_PUBLIC_KEY` no arquivo `src/hooks/usePushSubscription.tsx` (linha 8):

```typescript
const VAPID_PUBLIC_KEY = 'SUA_CHAVE_PUBLICA_AQUI'
```

### 4. Verificar o Edge Function

Certifique-se de que o edge function `push-broadcast` está configurado corretamente e usa as chaves VAPID dos secrets:

```typescript
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
```

### 5. Reativar o Banner

No arquivo `src/components/NotificationPermissionBanner.tsx`, remova o comentário e reative a lógica do banner.

### 6. Testar

1. Limpe o cache do navegador
2. Recarregue a aplicação
3. Aceite as notificações quando solicitado
4. Teste enviando uma notificação via edge function

## 📝 Nota sobre o Erro Atual

O erro "Registration failed - push service error" ocorre quando:
- As chaves VAPID não estão configuradas corretamente
- O service worker não consegue se registrar
- Há incompatibilidade entre as chaves públicas e privadas

## ✅ Verificações de Segurança

- ✓ As chaves VAPID devem ser exclusivas do projeto
- ✓ Nunca compartilhe a chave privada
- ✓ As chaves devem ser as mesmas no frontend e edge function
- ✓ O service worker deve estar em `/public/sw.js`

## 🎯 Fluxo Correto

1. Usuário permite notificações
2. Service worker se registra
3. PushManager cria uma subscription
4. Subscription é salva no banco (tabela `push_subscriptions`)
5. Edge function `push-broadcast` envia notificações usando VAPID keys
6. Service worker recebe e exibe a notificação

## 🔍 Debug

Para verificar se está funcionando:

```javascript
// No console do navegador
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', !!reg)
  return reg?.pushManager.getSubscription()
}).then(sub => {
  console.log('Push subscription:', !!sub)
})
```
