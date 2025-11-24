-- Criar tabela de metas do usuário
CREATE TABLE public.metas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL, -- 'sessoes', 'clientes', 'receita', 'pacotes', 'ticket_medio'
  valor_meta NUMERIC NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1, -- Meta 1, Meta 2, Meta 3, etc
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_conclusao TIMESTAMP WITH TIME ZONE,
  concluida BOOLEAN NOT NULL DEFAULT false,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tipo, versao)
);

-- Enable Row Level Security
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own metas" 
ON public.metas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own metas" 
ON public.metas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metas" 
ON public.metas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metas" 
ON public.metas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_metas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_metas_updated_at
BEFORE UPDATE ON public.metas
FOR EACH ROW
EXECUTE FUNCTION public.update_metas_updated_at();

-- Create index for better performance
CREATE INDEX idx_metas_user_tipo ON public.metas(user_id, tipo, ativa);