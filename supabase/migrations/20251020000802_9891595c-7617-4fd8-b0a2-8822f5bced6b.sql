-- Reverter constraint de e-mail único em clients
-- Clientes podem ter e-mails duplicados (ex: mãe e filho)
-- A validação de e-mail único é apenas para profissionais (auth.users)

-- Remover constraint único de email em clients
DROP INDEX IF EXISTS public.idx_clients_user_email_unique;

-- Remover índice de verificação de duplicação de email
DROP INDEX IF EXISTS public.idx_clients_user_email;

-- Comentário para documentação
COMMENT ON TABLE public.clients IS 'Tabela de clientes - permite e-mails duplicados (ex: familiares podem compartilhar o mesmo e-mail)';