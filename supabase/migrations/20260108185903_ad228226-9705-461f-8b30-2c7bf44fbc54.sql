-- Adicionar campo para rastrear quando o usuário saiu do programa de indicação (para cooldown)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS left_referral_program_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_profiles_left_referral_program_at 
ON public.profiles(left_referral_program_at) 
WHERE left_referral_program_at IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.left_referral_program_at IS 'Data/hora em que o usuário deixou o programa de indicação. Usado para calcular período de cooldown de 30 dias.';