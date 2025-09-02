-- Adicionar campos para dados bancários na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agencia TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS conta TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tipo_conta TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;