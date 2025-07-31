-- Criar tabela para eventos (user_id pode ser NULL para eventos públicos)
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  category TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_type TEXT,
  recurring_interval INTEGER DEFAULT 1,
  recurring_end_date DATE,
  registration_link TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela para prontuários/templates
CREATE TABLE public.record_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  template_content JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela para prontuários preenchidos
CREATE TABLE public.filled_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  template_id UUID NOT NULL REFERENCES public.record_templates(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Criar tabela para anotações de sessões
CREATE TABLE public.session_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filled_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- Políticas para events
CREATE POLICY "Users can view public events or their own events" 
ON public.events 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can update their own events" 
ON public.events 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" 
ON public.events 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para record_templates
CREATE POLICY "Users can view public templates or their own templates" 
ON public.record_templates 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" 
ON public.record_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.record_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.record_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para filled_records
CREATE POLICY "Users can view their own filled records" 
ON public.filled_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own filled records" 
ON public.filled_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filled records" 
ON public.filled_records 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filled records" 
ON public.filled_records 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para session_notes
CREATE POLICY "Users can view their own session notes" 
ON public.session_notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own session notes" 
ON public.session_notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session notes" 
ON public.session_notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session notes" 
ON public.session_notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_record_templates_updated_at
BEFORE UPDATE ON public.record_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_filled_records_updated_at
BEFORE UPDATE ON public.filled_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_notes_updated_at
BEFORE UPDATE ON public.session_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();