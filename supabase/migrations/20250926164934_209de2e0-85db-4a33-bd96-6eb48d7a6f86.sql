-- Criar tabela de anamneses
CREATE TABLE public.anamneses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  motivo_consulta TEXT,
  queixa_principal TEXT,
  historico_familiar TEXT,
  historico_medico TEXT,
  antecedentes_relevantes TEXT,
  diagnostico_inicial TEXT,
  observacoes_adicionais TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

-- Criar tabela de evoluções clínicas
CREATE TABLE public.evolucoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  session_id UUID,
  data_sessao DATE NOT NULL,
  evolucao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para anamneses
CREATE POLICY "Users can create their own anamneses" 
ON public.anamneses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own anamneses" 
ON public.anamneses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own anamneses" 
ON public.anamneses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own anamneses" 
ON public.anamneses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para evoluções
CREATE POLICY "Users can create their own evolucoes" 
ON public.evolucoes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own evolucoes" 
ON public.evolucoes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own evolucoes" 
ON public.evolucoes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own evolucoes" 
ON public.evolucoes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at nas anamneses
CREATE TRIGGER update_anamneses_updated_at
BEFORE UPDATE ON public.anamneses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at nas evoluções  
CREATE TRIGGER update_evolucoes_updated_at
BEFORE UPDATE ON public.evolucoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();