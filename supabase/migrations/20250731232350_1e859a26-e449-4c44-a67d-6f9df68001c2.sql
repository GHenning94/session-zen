-- Inserir templates de prontuários padrão
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

-- Inserir alguns eventos exemplo públicos
INSERT INTO public.events (title, description, event_date, start_time, end_time, location, category, registration_link, is_public, user_id) VALUES
('Congresso Brasileiro de Psicologia 2025', 'Maior evento de psicologia do Brasil com palestras, workshops e networking', '2025-09-15', '08:00', '18:00', 'Centro de Convenções Frei Caneca - São Paulo', 'psicologia', 'https://congressopsicologia.com.br', true, NULL),
('Workshop: Terapia Cognitivo-Comportamental', 'Curso intensivo sobre TCC para iniciantes e profissionais', '2025-08-20', '14:00', '17:00', 'Instituto de Psicologia - Rio de Janeiro', 'psicologia', 'https://workshop-tcc.com.br', true, NULL),
('Simpósio de Psicanálise Contemporânea', 'Discussões sobre os rumos da psicanálise no século XXI', '2025-09-05', '09:00', '16:00', 'UERJ - Rio de Janeiro', 'psicanalise', 'https://simposio-psicanalise.org', true, NULL),
('Curso: Neuropsicologia Clínica', 'Formação em avaliação neuropsicológica', '2025-08-25', '08:30', '12:00', 'Hospital das Clínicas - São Paulo', 'neuropsicologia', 'https://neuropsicologia-clinica.edu.br', true, NULL),
('Jornada de Psicologia Positiva', 'Workshop sobre bem-estar e felicidade', '2025-10-12', '09:00', '17:00', 'Centro de Eventos - Brasília', 'psicologia', 'https://psicologia-positiva.org', true, NULL);