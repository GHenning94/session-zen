-- Inserir templates de prontuários reais
INSERT INTO public.record_templates (title, category, description, template_content, is_public, user_id) VALUES
(
  'Anamnese Psicológica Inicial',
  'Anamnese',
  'Template completo para primeira consulta psicológica',
  '{
    "sections": [
      {
        "title": "Dados Pessoais",
        "fields": [
          {"type": "text", "label": "Nome completo", "required": true},
          {"type": "date", "label": "Data de nascimento", "required": true},
          {"type": "text", "label": "Estado civil", "required": false},
          {"type": "text", "label": "Profissão", "required": false},
          {"type": "text", "label": "Escolaridade", "required": false}
        ]
      },
      {
        "title": "Motivo da Consulta",
        "fields": [
          {"type": "textarea", "label": "Queixa principal", "required": true},
          {"type": "textarea", "label": "História da queixa atual", "required": true},
          {"type": "textarea", "label": "Expectativas em relação ao tratamento", "required": false}
        ]
      },
      {
        "title": "História Pessoal",
        "fields": [
          {"type": "textarea", "label": "História familiar", "required": false},
          {"type": "textarea", "label": "História educacional", "required": false},
          {"type": "textarea", "label": "História profissional", "required": false},
          {"type": "textarea", "label": "Relacionamentos afetivos", "required": false}
        ]
      },
      {
        "title": "História Clínica",
        "fields": [
          {"type": "textarea", "label": "Medicações em uso", "required": false},
          {"type": "textarea", "label": "Tratamentos psicológicos anteriores", "required": false},
          {"type": "textarea", "label": "Histórico médico relevante", "required": false}
        ]
      },
      {
        "title": "Observações Clínicas",
        "fields": [
          {"type": "textarea", "label": "Estado mental", "required": false},
          {"type": "textarea", "label": "Humor e afeto", "required": false},
          {"type": "textarea", "label": "Pensamento e cognição", "required": false},
          {"type": "textarea", "label": "Impressões diagnósticas", "required": false}
        ]
      }
    ]
  }',
  true,
  null
),
(
  'Evolução Terapêutica',
  'Evolução',
  'Template para acompanhamento da evolução do paciente',
  '{
    "sections": [
      {
        "title": "Dados da Sessão",
        "fields": [
          {"type": "date", "label": "Data da sessão", "required": true},
          {"type": "number", "label": "Número da sessão", "required": true},
          {"type": "text", "label": "Duração", "required": false}
        ]
      },
      {
        "title": "Relato do Paciente",
        "fields": [
          {"type": "textarea", "label": "Como está se sentindo", "required": true},
          {"type": "textarea", "label": "Eventos significativos desde a última sessão", "required": false},
          {"type": "textarea", "label": "Sintomas relatados", "required": false}
        ]
      },
      {
        "title": "Intervenções Realizadas",
        "fields": [
          {"type": "textarea", "label": "Técnicas utilizadas", "required": false},
          {"type": "textarea", "label": "Temas abordados", "required": true},
          {"type": "textarea", "label": "Atividades propostas", "required": false}
        ]
      },
      {
        "title": "Avaliação da Sessão",
        "fields": [
          {"type": "select", "label": "Participação do paciente", "options": ["Ativa", "Moderada", "Passiva"], "required": false},
          {"type": "textarea", "label": "Progressos observados", "required": false},
          {"type": "textarea", "label": "Dificuldades identificadas", "required": false}
        ]
      },
      {
        "title": "Planejamento",
        "fields": [
          {"type": "textarea", "label": "Objetivos para próxima sessão", "required": false},
          {"type": "textarea", "label": "Atividades para casa", "required": false}
        ]
      }
    ]
  }',
  true,
  null
),
(
  'Avaliação Psicológica Infantil',
  'Avaliação',
  'Template para avaliação psicológica de crianças',
  '{
    "sections": [
      {
        "title": "Dados da Criança",
        "fields": [
          {"type": "text", "label": "Nome da criança", "required": true},
          {"type": "date", "label": "Data de nascimento", "required": true},
          {"type": "text", "label": "Idade", "required": true},
          {"type": "text", "label": "Escola", "required": false},
          {"type": "text", "label": "Série/Ano", "required": false}
        ]
      },
      {
        "title": "Dados dos Responsáveis",
        "fields": [
          {"type": "text", "label": "Nome do responsável", "required": true},
          {"type": "text", "label": "Parentesco", "required": true},
          {"type": "text", "label": "Telefone de contato", "required": true}
        ]
      },
      {
        "title": "Motivo da Avaliação",
        "fields": [
          {"type": "textarea", "label": "Queixa dos pais/responsáveis", "required": true},
          {"type": "textarea", "label": "Queixa da escola", "required": false},
          {"type": "textarea", "label": "Comportamentos observados", "required": true}
        ]
      },
      {
        "title": "Desenvolvimento",
        "fields": [
          {"type": "textarea", "label": "Desenvolvimento motor", "required": false},
          {"type": "textarea", "label": "Desenvolvimento da linguagem", "required": false},
          {"type": "textarea", "label": "Desenvolvimento social", "required": false},
          {"type": "textarea", "label": "Marcos do desenvolvimento", "required": false}
        ]
      },
      {
        "title": "Observação Clínica",
        "fields": [
          {"type": "textarea", "label": "Aparência e comportamento", "required": true},
          {"type": "textarea", "label": "Contato visual e social", "required": false},
          {"type": "textarea", "label": "Linguagem e comunicação", "required": false},
          {"type": "textarea", "label": "Atividade motora", "required": false}
        ]
      },
      {
        "title": "Testes Aplicados",
        "fields": [
          {"type": "textarea", "label": "Instrumentos utilizados", "required": false},
          {"type": "textarea", "label": "Resultados obtidos", "required": false}
        ]
      },
      {
        "title": "Conclusões",
        "fields": [
          {"type": "textarea", "label": "Impressões diagnósticas", "required": false},
          {"type": "textarea", "label": "Recomendações", "required": true}
        ]
      }
    ]
  }',
  true,
  null
),
(
  'Relatório Psicológico',
  'Relatório',
  'Template para relatórios psicológicos completos',
  '{
    "sections": [
      {
        "title": "Identificação",
        "fields": [
          {"type": "text", "label": "Nome", "required": true},
          {"type": "text", "label": "Idade", "required": true},
          {"type": "text", "label": "Solicitante", "required": true},
          {"type": "date", "label": "Data do relatório", "required": true}
        ]
      },
      {
        "title": "Demanda",
        "fields": [
          {"type": "textarea", "label": "Motivo da avaliação", "required": true},
          {"type": "textarea", "label": "Questões a serem respondidas", "required": true}
        ]
      },
      {
        "title": "Procedimentos",
        "fields": [
          {"type": "textarea", "label": "Instrumentos utilizados", "required": true},
          {"type": "text", "label": "Número de sessões", "required": true},
          {"type": "text", "label": "Período de avaliação", "required": true}
        ]
      },
      {
        "title": "Análise",
        "fields": [
          {"type": "textarea", "label": "Aspectos cognitivos", "required": false},
          {"type": "textarea", "label": "Aspectos emocionais", "required": false},
          {"type": "textarea", "label": "Aspectos comportamentais", "required": false},
          {"type": "textarea", "label": "Aspectos sociais", "required": false}
        ]
      },
      {
        "title": "Considerações Finais",
        "fields": [
          {"type": "textarea", "label": "Síntese dos resultados", "required": true},
          {"type": "textarea", "label": "Recomendações", "required": true},
          {"type": "textarea", "label": "Limitações do processo", "required": false}
        ]
      }
    ]
  }',
  true,
  null
),
(
  'Triagem Psicológica',
  'Triagem',
  'Template para triagem inicial de pacientes',
  '{
    "sections": [
      {
        "title": "Dados Pessoais",
        "fields": [
          {"type": "text", "label": "Nome completo", "required": true},
          {"type": "text", "label": "Idade", "required": true},
          {"type": "text", "label": "Telefone", "required": true},
          {"type": "text", "label": "Como chegou até aqui", "required": false}
        ]
      },
      {
        "title": "Triagem Inicial",
        "fields": [
          {"type": "textarea", "label": "Motivo da procura", "required": true},
          {"type": "text", "label": "Urgência (1-10)", "required": true},
          {"type": "select", "label": "Risco de autolesão", "options": ["Baixo", "Médio", "Alto"], "required": true},
          {"type": "textarea", "label": "Sintomas principais", "required": true}
        ]
      },
      {
        "title": "Histórico Breve",
        "fields": [
          {"type": "textarea", "label": "Tratamentos anteriores", "required": false},
          {"type": "textarea", "label": "Medicações atuais", "required": false},
          {"type": "textarea", "label": "Rede de apoio", "required": false}
        ]
      },
      {
        "title": "Avaliação Inicial",
        "fields": [
          {"type": "select", "label": "Indicação para psicoterapia", "options": ["Sim", "Não", "Aguardar"], "required": true},
          {"type": "textarea", "label": "Observações", "required": false},
          {"type": "textarea", "label": "Encaminhamentos necessários", "required": false}
        ]
      }
    ]
  }',
  true,
  null
);

-- Inserir eventos reais de psicologia
INSERT INTO public.events (title, description, event_date, start_time, end_time, location, category, registration_link, is_public, user_id) VALUES
(
  'Workshop: Primeiros Socorros Psicológicos',
  'Aprenda técnicas básicas de primeiros socorros psicológicos para situações de crise e emergência. Voltado para profissionais da saúde mental.',
  '2025-09-15',
  '09:00',
  '17:00',
  'Centro de Convenções - São Paulo',
  'Workshop',
  'https://eventbrite.com/primeiros-socorros-psicologicos',
  true,
  null
),
(
  'Seminário: Terapia Cognitivo-Comportamental na Prática',
  'Discussão de casos clínicos e aplicação prática da TCC em diferentes transtornos. Com certificado de participação.',
  '2025-09-22',
  '14:00',
  '18:00',
  'Universidade de Psicologia - Campus Central',
  'Seminário',
  'https://inscricoes.unipsicologia.edu.br/tcc-pratica',
  true,
  null
),
(
  'Conferência: Saúde Mental no Século XXI',
  'Grandes nomes da psicologia brasileira discutem os desafios da saúde mental contemporânea.',
  '2025-10-05',
  '08:00',
  '18:00',
  'Hotel Copacabana Palace - Rio de Janeiro',
  'Conferência',
  'https://cfp.org.br/conferencia-saude-mental',
  true,
  null
),
(
  'Treinamento: Avaliação Psicológica Infantil',
  'Capacitação em instrumentos e técnicas de avaliação psicológica para crianças de 3 a 12 anos.',
  '2025-10-12',
  '09:00',
  '16:00',
  'Instituto de Psicologia - Brasília',
  'Treinamento',
  'https://institutoavaliacaoinfantil.com.br/inscricoes',
  true,
  null
),
(
  'Networking: Psicólogos Empreendedores',
  'Encontro para psicólogos que desejam empreender e trocar experiências sobre consultório próprio.',
  '2025-10-18',
  '19:00',
  '22:00',
  'Coworking Psique - Belo Horizonte',
  'Networking',
  'https://meetup.com/psicologos-empreendedores-bh',
  true,
  null
),
(
  'Workshop: Mindfulness e Meditação na Terapia',
  'Introdução às práticas de mindfulness como ferramenta terapêutica. Inclui sessões práticas.',
  '2025-10-25',
  '10:00',
  '16:00',
  'Centro de Bem-Estar - Porto Alegre',
  'Workshop',
  'https://centrobemestar.com.br/mindfulness-terapia',
  true,
  null
),
(
  'Seminário: Psicologia Positiva e Bem-Estar',
  'Explorando os conceitos da psicologia positiva e sua aplicação na prática clínica.',
  '2025-11-08',
  '14:00',
  '17:00',
  'Faculdade de Psicologia - Salvador',
  'Seminário',
  'https://facpsiba.edu.br/psicologia-positiva',
  true,
  null
),
(
  'Treinamento: Intervenção em Crise e Suicídio',
  'Capacitação para profissionais sobre prevenção do suicídio e manejo de situações de crise.',
  '2025-11-15',
  '08:00',
  '17:00',
  'Hospital das Clínicas - São Paulo',
  'Treinamento',
  'https://hc.fm.usp.br/prevencao-suicidio',
  true,
  null
),
(
  'Conferência: Neuropsicologia Clínica',
  'Avanços em neuropsicologia e sua aplicação no diagnóstico e reabilitação de transtornos neurológicos.',
  '2025-11-22',
  '09:00',
  '18:00',
  'Centro de Neurociências - Campinas',
  'Conferência',
  'https://neuropsicologia-clinica.com.br/2025',
  true,
  null
),
(
  'Workshop: Terapia de Casal e Família',
  'Técnicas e abordagens modernas para terapia familiar sistêmica.',
  '2025-12-03',
  '09:00',
  '17:00',
  'Instituto Familiar - Fortaleza',
  'Workshop',
  'https://institutofamiliar.com.br/terapia-casal',
  true,
  null
);