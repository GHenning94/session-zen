-- Migração de escalabilidade e limpeza de dados duplicados

-- PASSO 1: Identificar e remover clientes duplicados, mantendo apenas o mais recente
-- Criar tabela temporária com IDs dos registros a manter
WITH ranked_clients AS (
  SELECT 
    id,
    user_id,
    email,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, email 
      ORDER BY created_at DESC
    ) as rn
  FROM public.clients
  WHERE email IS NOT NULL AND email != ''
)
-- Manter apenas o registro mais recente de cada email duplicado
DELETE FROM public.clients
WHERE id IN (
  SELECT id 
  FROM ranked_clients 
  WHERE rn > 1
);

-- PASSO 2: Adicionar índices para melhorar performance e escalabilidade

-- Índice em clients para queries gerais de usuário
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Índice composto em clients para queries de duplicação de email
CREATE INDEX IF NOT EXISTS idx_clients_user_email ON public.clients(user_id, email) WHERE email IS NOT NULL;

-- Índice composto em sessions para queries de agenda
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON public.sessions(user_id, data);

-- Índice em sessions para queries de cliente
CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON public.sessions(client_id);

-- Índice em notifications para queries de notificações não lidas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, lida) WHERE lida = false;

-- Índice em evolucoes para queries por cliente
CREATE INDEX IF NOT EXISTS idx_evolucoes_client_id ON public.evolucoes(client_id);

-- Índice em anamneses para queries por cliente
CREATE INDEX IF NOT EXISTS idx_anamneses_client_id ON public.anamneses(client_id);

-- Índice em session_notes para queries por sessão
CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON public.session_notes(session_id);

-- Índice em registration_tokens para validação rápida de tokens
CREATE INDEX IF NOT EXISTS idx_registration_tokens_token ON public.registration_tokens(token) WHERE used = false;

-- Índice em configuracoes para queries por slug
CREATE INDEX IF NOT EXISTS idx_configuracoes_slug ON public.configuracoes(slug) WHERE slug IS NOT NULL;

-- PASSO 3: Adicionar constraint único após limpeza dos duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_user_email_unique 
ON public.clients(user_id, email) 
WHERE email IS NOT NULL AND email != '';

-- PASSO 4: Atualizar estatísticas das tabelas para melhor planejamento de queries
ANALYZE public.clients;
ANALYZE public.sessions;
ANALYZE public.notifications;
ANALYZE public.evolucoes;
ANALYZE public.anamneses;

-- PASSO 5: Comentários para documentação
COMMENT ON INDEX idx_clients_user_email IS 'Índice composto para queries de verificação de email duplicado';
COMMENT ON INDEX idx_sessions_user_date IS 'Índice composto para queries de agenda por usuário e data';
COMMENT ON INDEX idx_notifications_user_unread IS 'Índice parcial para queries de notificações não lidas';
COMMENT ON INDEX idx_clients_user_email_unique IS 'Constraint único parcial - previne emails duplicados por usuário (implementado após limpeza de duplicados)';