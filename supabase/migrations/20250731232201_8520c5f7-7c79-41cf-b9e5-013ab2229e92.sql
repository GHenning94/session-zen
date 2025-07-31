-- Permitir que eventos públicos tenham user_id NULL
ALTER TABLE public.events 
ALTER COLUMN user_id DROP NOT NULL;

-- Atualizar políticas para suportar eventos públicos sem user_id
DROP POLICY "Users can view public events or their own events" ON public.events;
DROP POLICY "Users can create their own events" ON public.events;

CREATE POLICY "Users can view public events or their own events" 
ON public.events 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own events" 
ON public.events 
FOR INSERT 
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Inserir alguns eventos exemplo públicos
INSERT INTO public.events (title, description, event_date, start_time, end_time, location, category, registration_link, is_public, user_id) VALUES
('Congresso Brasileiro de Psicologia 2025', 'Maior evento de psicologia do Brasil com palestras, workshops e networking', '2025-09-15', '08:00', '18:00', 'Centro de Convenções Frei Caneca - São Paulo', 'psicologia', 'https://congressopsicologia.com.br', true, NULL),
('Workshop: Terapia Cognitivo-Comportamental', 'Curso intensivo sobre TCC para iniciantes e profissionais', '2025-08-20', '14:00', '17:00', 'Instituto de Psicologia - Rio de Janeiro', 'psicologia', 'https://workshop-tcc.com.br', true, NULL),
('Simpósio de Psicanálise Contemporânea', 'Discussões sobre os rumos da psicanálise no século XXI', '2025-09-05', '09:00', '16:00', 'UERJ - Rio de Janeiro', 'psicanalise', 'https://simposio-psicanalise.org', true, NULL),
('Curso: Neuropsicologia Clínica', 'Formação em avaliação neuropsicológica', '2025-08-25', '08:30', '12:00', 'Hospital das Clínicas - São Paulo', 'neuropsicologia', 'https://neuropsicologia-clinica.edu.br', true, NULL),
('Jornada de Psicologia Positiva', 'Workshop sobre bem-estar e felicidade', '2025-10-12', '09:00', '17:00', 'Centro de Eventos - Brasília', 'psicologia', 'https://psicologia-positiva.org', true, NULL);