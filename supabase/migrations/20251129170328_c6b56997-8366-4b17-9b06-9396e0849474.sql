-- Criar tabela de sessões de admin (o sistema de roles já existe)
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ
);

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

-- Apenas o próprio admin pode ver suas sessões
CREATE POLICY "Admins can view own sessions"
ON public.admin_sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.current_user_has_role('admin'));

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON public.admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON public.admin_sessions(expires_at) WHERE NOT revoked;