# Migration: Adicionar coluna telefone_codigo_pais

## Problema
A coluna `telefone_codigo_pais` não existe na tabela `clients`, causando erro ao salvar clientes com telefones internacionais.

## Solução
Execute a seguinte migration SQL no Supabase:

```sql
-- Adiciona coluna para armazenar código do país do telefone do cliente
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS telefone_codigo_pais text;
```

## Como executar

### Opção 1: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Cole o SQL acima
4. Execute

### Opção 2: Via CLI do Supabase
```bash
supabase db push
```

### Opção 3: Executar migration manualmente
A migration já está criada em:
`supabase/migrations/20260120123000_add_cliente_phone_country_code.sql`

Execute-a manualmente se necessário.

## Nota
O código já tem fallback implementado - se a coluna não existir, o sistema tentará salvar sem ela. No entanto, para funcionalidade completa de telefones internacionais, a migration deve ser executada.
