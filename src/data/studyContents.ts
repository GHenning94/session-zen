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
  // Conteúdos reais e funcionais
  {
    id: '1',
    title: 'Manual de Psicologia - Domínio Público',
    description: 'Livro clássico de psicologia disponível gratuitamente no Project Gutenberg.',
    type: 'livro',
    area: 'psicologia',
    level: 'intermediario',
    author: 'William James',
    url: 'https://www.gutenberg.org/ebooks/15489',
    tags: ['psicologia', 'fundamentos', 'clássico'],
    downloadable: true
  },
  {
    id: '2',
    title: 'Princípios de Psicologia - PDF',
    description: 'Texto fundamental sobre os princípios básicos da psicologia moderna.',
    type: 'livro',
    area: 'psicologia',
    level: 'avancado',
    author: 'William James',
    url: 'https://archive.org/download/PrinciplesOfPsychology/Principles%20of%20Psychology.pdf',
    tags: ['fundamentos', 'teoria', 'história'],
    downloadable: true
  },
  {
    id: '3',
    title: 'Portal Scielo - Artigos Científicos',
    description: 'Acesso a milhares de artigos científicos revisados por pares na área de psicologia.',
    type: 'artigo',
    area: 'psicologia',
    level: 'avancado',
    author: 'Scielo Brasil',
    url: 'https://www.scielo.br/j/prc/',
    tags: ['pesquisa', 'artigos', 'científico'],
    downloadable: false
  },
  {
    id: '4',
    title: 'Neuropsicologia e COVID-19',
    description: 'Estudo sobre os impactos neuropsicológicos da pandemia de COVID-19.',
    type: 'artigo',
    area: 'psicologia',
    level: 'avancado',
    author: 'PubMed Central',
    url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7739326/',
    tags: ['neuropsicologia', 'covid-19', 'pesquisa'],
    downloadable: true
  },
  {
    id: '5',
    title: 'Introdução à Psicologia Cognitiva',
    description: 'Vídeo educativo sobre os fundamentos da psicologia cognitiva.',
    type: 'video',
    area: 'psicologia',
    level: 'iniciante',
    author: 'Canal Educativo',
    url: 'https://www.youtube.com/watch?v=jDolJWZSqBU',
    duration: '45 min',
    tags: ['cognição', 'educativo', 'introdução'],
    downloadable: false
  },
  {
    id: '6',
    title: 'Mindfulness e Bem-estar Mental',
    description: 'Webinar sobre técnicas de mindfulness aplicadas à saúde mental.',
    type: 'webinar',
    area: 'terapia',
    level: 'intermediario',
    author: 'UNIFESP',
    url: 'https://www.unifesp.br/campus/sao/cursos-livres/mindfulness',
    duration: '1h 30min',
    tags: ['mindfulness', 'bem-estar', 'técnicas'],
    downloadable: false
  },
  {
    id: '7',
    title: 'Código de Ética da Psicologia',
    description: 'Documento oficial do Conselho Federal de Psicologia sobre ética profissional.',
    type: 'artigo',
    area: 'geral',
    level: 'iniciante',
    author: 'CFP',
    url: 'https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf',
    tags: ['ética', 'legislação', 'profissional'],
    downloadable: true
  },
  {
    id: '8',
    title: 'Terapia Cognitivo-Comportamental - Aula',
    description: 'Aula completa sobre os fundamentos e técnicas da TCC.',
    type: 'video',
    area: 'terapia',
    level: 'intermediario',
    author: 'Professor Online',
    url: 'https://www.youtube.com/watch?v=JLLdagSGo24',
    duration: '1h 15min',
    tags: ['TCC', 'terapia', 'técnicas'],
    downloadable: false
  },
  {
    id: '9',
    title: 'Apoio Psicológico em Crises',
    description: 'Guia da Cruz Vermelha sobre primeiros socorros psicológicos.',
    type: 'artigo',
    area: 'psicologia',
    level: 'intermediario',
    author: 'Cruz Vermelha Internacional',
    url: 'https://www.ifrc.org/our-work/disasters-climate-and-crises/psychological-support',
    tags: ['crise', 'emergência', 'apoio'],
    downloadable: false
  },
  {
    id: '10',
    title: 'Manual de Saúde Mental - OMS',
    description: 'Publicação oficial da Organização Mundial da Saúde sobre saúde mental.',
    type: 'livro',
    area: 'psiquiatria',
    level: 'avancado',
    author: 'Organização Mundial da Saúde',
    url: 'https://www.who.int/publications/i/item/9789241549790',
    tags: ['saúde mental', 'OMS', 'global'],
    downloadable: true
  },
  {
    id: '11',
    title: 'Fundamentos da Psicanálise',
    description: 'Curso introdutório sobre os conceitos básicos da psicanálise.',
    type: 'curso',
    area: 'psicanalise',
    level: 'iniciante',
    author: 'Instituto Virtual',
    url: 'https://www.youtube.com/playlist?list=PLrAXtmRdnEQAwcAgjDvOBX5GGUM3eqgUa',
    duration: '4 horas',
    tags: ['psicanálise', 'fundamentos', 'freud'],
    downloadable: false
  },
  {
    id: '12',
    title: 'Técnicas de Coaching Pessoal',
    description: 'Manual prático sobre metodologias de coaching para desenvolvimento pessoal.',
    type: 'livro',
    area: 'coaching',
    level: 'intermediario',
    author: 'Diversos Autores',
    url: 'https://archive.org/details/coaching-techniques',
    tags: ['coaching', 'desenvolvimento', 'técnicas'],
    downloadable: true
  }
]