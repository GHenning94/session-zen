-- Criar tabela para eventos
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  category TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_type TEXT, -- 'daily', 'weekly', 'monthly', 'yearly'
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
  category TEXT NOT NULL, -- 'psicologia', 'psiquiatria', 'psicanalise', etc
  description TEXT,
  template_content JSONB NOT NULL, -- Estrutura do prontuário
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
  content JSONB NOT NULL, -- Dados preenchidos
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
WITH CHECK (auth.uid() = user_id);

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

-- Inserir alguns templates de prontuários padrão
INSERT INTO public.record_templates (title, category, description, template_content, is_public) VALUES
('Anamnese Psicológica Completa', 'psicologia', 'Template completo para primeira consulta psicológica', 
 '{"sections": [
   {"title": "Dados Pessoais", "fields": [{"name": "nome", "type": "text"}, {"name": "idade", "type": "number"}, {"name": "profissao", "type": "text"}]},
   {"title": "Queixa Principal", "fields": [{"name": "queixa", "type": "textarea"}]},
   {"title": "História da Doença Atual", "fields": [{"name": "historia_atual", "type": "textarea"}]},
   {"title": "História Pessoal", "fields": [{"name": "historia_pessoal", "type": "textarea"}]},
   {"title": "História Familiar", "fields": [{"name": "historia_familiar", "type": "textarea"}]},
   {"title": "Exame Mental", "fields": [{"name": "exame_mental", "type": "textarea"}]},
   {"title": "Hipótese Diagnóstica", "fields": [{"name": "hipotese", "type": "textarea"}]},
   {"title": "Plano Terapêutico", "fields": [{"name": "plano", "type": "textarea"}]}
 ]}', true),
 
('Evolução Psicológica', 'psicologia', 'Template para registro de evolução em sessões', 
 '{"sections": [
   {"title": "Data e Duração", "fields": [{"name": "data_sessao", "type": "date"}, {"name": "duracao", "type": "text"}]},
   {"title": "Objetivos da Sessão", "fields": [{"name": "objetivos", "type": "textarea"}]},
   {"title": "Conteúdo Trabalhado", "fields": [{"name": "conteudo", "type": "textarea"}]},
   {"title": "Observações do Paciente", "fields": [{"name": "observacoes_paciente", "type": "textarea"}]},
   {"title": "Observações do Terapeuta", "fields": [{"name": "observacoes_terapeuta", "type": "textarea"}]},
   {"title": "Plano para Próxima Sessão", "fields": [{"name": "plano_proximo", "type": "textarea"}]}
 ]}', true),

('Avaliação Psiquiátrica Inicial', 'psiquiatria', 'Template para primeira consulta psiquiátrica', 
 '{"sections": [
   {"title": "Identificação", "fields": [{"name": "nome", "type": "text"}, {"name": "idade", "type": "number"}, {"name": "estado_civil", "type": "text"}]},
   {"title": "Motivo da Consulta", "fields": [{"name": "motivo", "type": "textarea"}]},
   {"title": "História da Doença Atual", "fields": [{"name": "hda", "type": "textarea"}]},
   {"title": "Antecedentes Pessoais", "fields": [{"name": "antecedentes_pessoais", "type": "textarea"}]},
   {"title": "Antecedentes Familiares", "fields": [{"name": "antecedentes_familiares", "type": "textarea"}]},
   {"title": "Exame Psíquico", "fields": [{"name": "exame_psiquico", "type": "textarea"}]},
   {"title": "Diagnóstico", "fields": [{"name": "diagnostico", "type": "textarea"}]},
   {"title": "Prescrição", "fields": [{"name": "prescricao", "type": "textarea"}]}
 ]}', true);

-- Inserir alguns eventos exemplo
INSERT INTO public.events (title, description, event_date, start_time, end_time, location, category, registration_link, is_public, user_id) VALUES
('Congresso Brasileiro de Psicologia 2024', 'Maior evento de psicologia do Brasil com palestras, workshops e networking', '2024-09-15', '08:00', '18:00', 'Centro de Convenções Frei Caneca - São Paulo', 'psicologia', 'https://congressopsicologia.com.br', true, NULL),
('Workshop: Terapia Cognitivo-Comportamental', 'Curso intensivo sobre TCC para iniciantes e profissionais', '2024-08-20', '14:00', '17:00', 'Instituto de Psicologia - Rio de Janeiro', 'psicologia', 'https://workshop-tcc.com.br', true, NULL),
('Simpósio de Psicanálise Contemporânea', 'Discussões sobre os rumos da psicanálise no século XXI', '2024-09-05', '09:00', '16:00', 'UERJ - Rio de Janeiro', 'psicanalise', 'https://simposio-psicanalise.org', true, NULL),
('Curso: Neuropsicologia Clínica', 'Formação em avaliação neuropsicológica', '2024-08-25', '08:30', '12:00', 'Hospital das Clínicas - São Paulo', 'neuropsicologia', 'https://neuropsicologia-clinica.edu.br', true, NULL);