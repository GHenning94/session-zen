-- Criar tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  profissao TEXT,
  plano TEXT DEFAULT 'gratis' CHECK (plano IN ('gratis', 'profissional', 'premium')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de pacientes
CREATE TABLE public.pacientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de sessões
CREATE TABLE public.sessoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id UUID NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  valor DECIMAL(10,2),
  observacoes TEXT,
  status_pagamento TEXT DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de configurações
CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  dias_atendimento TEXT[] DEFAULT ARRAY['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  horario_inicio TIME DEFAULT '08:00',
  horario_fim TIME DEFAULT '18:00',
  link_agendamento TEXT,
  lembrete_ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de notificações
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Criar políticas RLS para pacientes
CREATE POLICY "Users can view their own patients"
ON public.pacientes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own patients"
ON public.pacientes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients"
ON public.pacientes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients"
ON public.pacientes FOR DELETE
USING (auth.uid() = user_id);

-- Criar políticas RLS para sessões
CREATE POLICY "Users can view their own sessions"
ON public.sessoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.sessoes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.sessoes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
ON public.sessoes FOR DELETE
USING (auth.uid() = user_id);

-- Criar políticas RLS para configurações
CREATE POLICY "Users can view their own config"
ON public.configuracoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own config"
ON public.configuracoes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own config"
ON public.configuracoes FOR UPDATE
USING (auth.uid() = user_id);

-- Criar políticas RLS para notificações
CREATE POLICY "Users can view their own notifications"
ON public.notificacoes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notificacoes FOR UPDATE
USING (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, profissao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', 'Usuário'),
    COALESCE(NEW.raw_user_meta_data ->> 'profissao', 'Psicólogo')
  );
  
  INSERT INTO public.configuracoes (user_id, link_agendamento)
  VALUES (
    NEW.id,
    'https://therapypro.app/agendar/' || NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();