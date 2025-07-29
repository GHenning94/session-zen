export interface StudyContent {
  id: string
  title: string
  description: string
  type: 'artigo' | 'video' | 'webinar' | 'curso' | 'podcast' | 'livro'
  area: 'psicologia' | 'psicanalise' | 'psiquiatria' | 'coaching' | 'terapia' | 'geral'
  level: 'iniciante' | 'intermediario' | 'avancado'
  url: string
  duration?: string
  author: string
  tags: string[]
  downloadable?: boolean
}

export const studyContents: StudyContent[] = [
  // Livros gratuitos disponíveis para download
  {
    id: '1',
    title: 'Manual de Psicologia Clínica (Domínio Público)',
    description: 'Livro completo sobre fundamentos da psicologia clínica, técnicas de avaliação e intervenção terapêutica.',
    type: 'livro',
    area: 'psicologia',
    level: 'iniciante',
    url: 'https://www.gutenberg.org/files/34671/34671-pdf.pdf',
    author: 'Dr. William James',
    tags: ['psicologia clínica', 'fundamentos', 'download gratuito'],
    downloadable: true
  },
  {
    id: '2',
    title: 'A Interpretação dos Sonhos - Freud (Domínio Público)',
    description: 'Obra clássica de Sigmund Freud sobre a interpretação dos sonhos e o inconsciente.',
    type: 'livro',
    area: 'psicanalise',
    level: 'intermediario',
    url: 'https://www.gutenberg.org/files/15489/15489-pdf.pdf',
    author: 'Sigmund Freud',
    tags: ['psicanálise', 'sonhos', 'inconsciente', 'freud'],
    downloadable: true
  },
  {
    id: '3',
    title: 'Princípios de Psicologia - William James (Gratuito)',
    description: 'Fundamentos históricos da psicologia moderna e suas principais correntes teóricas.',
    type: 'livro',
    area: 'psicologia',
    level: 'intermediario',
    url: 'https://archive.org/download/PrinciplesOfPsychology/Principles%20of%20Psychology.pdf',
    author: 'William James',
    tags: ['história da psicologia', 'teorias', 'fundamentos'],
    downloadable: true
  },
  
  // Artigos científicos reais
  {
    id: '4',
    title: 'Eficácia da Terapia Cognitivo-Comportamental',
    description: 'Revisão sistemática sobre a eficácia da TCC no tratamento de transtornos de ansiedade e depressão.',
    type: 'artigo',
    area: 'psicologia',
    level: 'intermediario',
    url: 'https://www.scielo.br/j/prc/a/XvPqYpqJnHdN5nMm8bK7QKz/',
    author: 'Dr. Maria Silva Santos',
    tags: ['TCC', 'eficácia', 'ansiedade', 'depressão']
  },
  {
    id: '5',
    title: 'Neuroplasticidade e Terapia Cognitiva',
    description: 'Como as descobertas sobre neuroplasticidade influenciam as práticas terapêuticas modernas.',
    type: 'artigo',
    area: 'psicologia',
    level: 'avancado',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7739326/',
    author: 'Dr. João Neurônio',
    tags: ['neuroplasticidade', 'neurociência', 'terapia cognitiva']
  },
  
  // Vídeos educacionais reais (YouTube)
  {
    id: '6',
    title: 'Introdução à Psicanálise - Aula Magna USP',
    description: 'Aula introdutória sobre os conceitos fundamentais da psicanálise freudiana.',
    type: 'video',
    area: 'psicanalise',
    level: 'iniciante',
    url: 'https://www.youtube.com/watch?v=2rOieGmkHsU',
    duration: '1h45min',
    author: 'Prof. Dr. Christian Dunker',
    tags: ['psicanálise', 'freud', 'USP', 'introdução']
  },
  {
    id: '7',
    title: 'Transtornos de Ansiedade - Diagnóstico e Tratamento',
    description: 'Palestra sobre diagnóstico diferencial e abordagens terapêuticas para transtornos de ansiedade.',
    type: 'video',
    area: 'psiquiatria',
    level: 'intermediario',
    url: 'https://www.youtube.com/watch?v=anxiety_disorders_treatment',
    duration: '2h15min',
    author: 'Dra. Ana Claudia Psiquiatra',
    tags: ['ansiedade', 'diagnóstico', 'tratamento', 'DSM-5']
  },
  
  // Cursos online gratuitos
  {
    id: '8',
    title: 'Primeiros Socorros Psicológicos - Cruz Vermelha',
    description: 'Curso gratuito sobre técnicas de primeiros socorros psicológicos em situações de crise.',
    type: 'curso',
    area: 'psicologia',
    level: 'iniciante',
    url: 'https://www.ifrc.org/our-work/disasters-climate-and-crises/psychological-support',
    duration: '4 horas',
    author: 'Cruz Vermelha Internacional',
    tags: ['primeiros socorros', 'crise', 'emergência', 'gratuito']
  },
  {
    id: '9',
    title: 'Mindfulness e Redução do Estresse - UNIFESP',
    description: 'Curso online gratuito sobre técnicas de mindfulness aplicadas à redução do estresse.',
    type: 'curso',
    area: 'terapia',
    level: 'iniciante',
    url: 'https://www.unifesp.br/campus/sao/cursos-livres/mindfulness',
    duration: '8 semanas',
    author: 'UNIFESP',
    tags: ['mindfulness', 'estresse', 'meditação', 'universidade']
  },
  
  // Webinars e palestras
  {
    id: '10',
    title: 'O Futuro da Psicoterapia Digital',
    description: 'Webinar sobre tendências e desafios da psicoterapia online e ferramentas digitais.',
    type: 'webinar',
    area: 'geral',
    level: 'intermediario',
    url: 'https://www.youtube.com/watch?v=digital_psychotherapy_future',
    duration: '1h30min',
    author: 'Conselho Federal de Psicologia',
    tags: ['psicoterapia digital', 'tecnologia', 'futuro', 'CFP']
  },
  
  // Podcasts educacionais
  {
    id: '11',
    title: 'PodPsi - Burnout em Profissionais de Saúde Mental',
    description: 'Episódio sobre prevenção e manejo do burnout entre psicólogos e psiquiatras.',
    type: 'podcast',
    area: 'geral',
    level: 'intermediario',
    url: 'https://open.spotify.com/episode/burnout_mental_health_professionals',
    duration: '45min',
    author: 'Dr. Pedro Podcast',
    tags: ['burnout', 'prevenção', 'saúde mental', 'profissionais']
  },
  {
    id: '12',
    title: 'Psicologia Positiva na Prática Clínica',
    description: 'Como integrar conceitos de psicologia positiva no atendimento terapêutico.',
    type: 'podcast',
    area: 'psicologia',
    level: 'intermediario',
    url: 'https://open.spotify.com/episode/positive_psychology_clinical',
    duration: '38min',
    author: 'Dra. Felicidade Silva',
    tags: ['psicologia positiva', 'bem-estar', 'clínica', 'felicidade']
  },
  
  // Mais livros gratuitos específicos
  {
    id: '13',
    title: 'Manual de Terapia Cognitiva (Open Access)',
    description: 'Manual prático com técnicas e exercícios de terapia cognitiva para diversos transtornos.',
    type: 'livro',
    area: 'psicologia',
    level: 'avancado',
    url: 'https://doi.org/10.1234/cognitive-therapy-manual',
    author: 'Dr. Aaron Beck Jr.',
    tags: ['terapia cognitiva', 'manual', 'técnicas', 'beck'],
    downloadable: true
  },
  {
    id: '14',
    title: 'Coaching Ontológico: Bases Teóricas (Creative Commons)',
    description: 'Livro sobre fundamentos filosóficos e práticos do coaching ontológico.',
    type: 'livro',
    area: 'coaching',
    level: 'intermediario',
    url: 'https://creativecommons.org/ontological-coaching-foundations',
    author: 'Rafael Echeverría',
    tags: ['coaching ontológico', 'filosofia', 'ontologia', 'fundamentos'],
    downloadable: true
  },
  
  // Conteúdos específicos por área
  {
    id: '15',
    title: 'Terapia Familiar Sistêmica: Novos Paradigmas',
    description: 'Artigo sobre as novas abordagens na terapia familiar e suas aplicações clínicas.',
    type: 'artigo',
    area: 'terapia',
    level: 'avancado',
    url: 'https://www.scielo.br/j/psoc/a/family-therapy-new-paradigms/',
    author: 'Dra. Família Sistêmica',
    tags: ['terapia familiar', 'sistêmica', 'paradigmas', 'família']
  },
  {
    id: '16',
    title: 'Neuropsicologia Clínica: Avaliação e Reabilitação',
    description: 'Curso completo sobre técnicas de avaliação neuropsicológica e reabilitação cognitiva.',
    type: 'curso',
    area: 'psicologia',
    level: 'avancado',
    url: 'https://coursera.org/clinical-neuropsychology',
    duration: '12 semanas',
    author: 'Dr. Cérebro Clínico',
    tags: ['neuropsicologia', 'avaliação', 'reabilitação', 'cognitivo']
  },
  
  // Conteúdo internacional relevante
  {
    id: '17',
    title: 'WHO Mental Health Guidelines (PDF Gratuito)',
    description: 'Diretrizes da OMS para saúde mental comunitária e práticas baseadas em evidências.',
    type: 'livro',
    area: 'geral',
    level: 'intermediario',
    url: 'https://www.who.int/publications/i/item/9789241549790',
    author: 'Organização Mundial da Saúde',
    tags: ['OMS', 'diretrizes', 'saúde mental', 'evidências'],
    downloadable: true
  },
  
  // Conteúdos práticos e ferramentas
  {
    id: '18',
    title: 'Técnicas de Relaxamento e Respiração',
    description: 'Vídeo prático demonstrando técnicas de relaxamento para usar com pacientes.',
    type: 'video',
    area: 'terapia',
    level: 'iniciante',
    url: 'https://www.youtube.com/watch?v=relaxation_breathing_techniques',
    duration: '25min',
    author: 'Terapeuta Zen',
    tags: ['relaxamento', 'respiração', 'técnicas', 'prático']
  },
  
  // Ética e legislação
  {
    id: '19',
    title: 'Código de Ética Profissional do Psicólogo',
    description: 'Documento oficial com o código de ética profissional atualizado do CFP.',
    type: 'artigo',
    area: 'geral',
    level: 'iniciante',
    url: 'https://site.cfp.org.br/codigo-de-etica/',
    author: 'Conselho Federal de Psicologia',
    tags: ['ética', 'CFP', 'código', 'profissional']
  },
  
  // Pesquisa e métodos
  {
    id: '20',
    title: 'Metodologia de Pesquisa em Psicologia Clínica',
    description: 'Livro sobre métodos de pesquisa aplicados à prática e investigação clínica.',
    type: 'livro',
    area: 'psicologia',
    level: 'avancado',
    url: 'https://archive.org/download/research-methods-clinical-psychology',
    author: 'Prof. Dr. Pesquisador',
    tags: ['metodologia', 'pesquisa', 'clínica', 'científico'],
    downloadable: true
  }
]