-- Adicionar campo para controlar se desconto do profissional já foi usado
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS professional_discount_used boolean DEFAULT false;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.profiles.professional_discount_used IS 'Indica se o usuário indicado já usou o desconto de 20% no primeiro mês do plano Profissional';