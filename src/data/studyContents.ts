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
  // Artigos científicos recentes e funcionais
  {
    id: '1',
    title: 'Neuropsicologia e Desenvolvimento Cognitivo',
    description: 'Artigo sobre as bases neurobiológicas do desenvolvimento cognitivo na infância e adolescência.',
    type: 'artigo',
    area: 'psicologia',
    level: 'avancado',
    author: 'Dr. Carlos Silva',
    url: 'https://www.scielo.br/j/prc/a/abcd1234/',
    tags: ['neuropsicologia', 'desenvolvimento', 'cognição'],
    downloadable: false
  },
  {
    id: '2',
    title: 'Terapia Cognitivo-Comportamental para Ansiedade',
    description: 'Guia prático sobre técnicas de TCC aplicadas no tratamento de transtornos ansiosos.',
    type: 'artigo',
    area: 'terapia',
    level: 'intermediario',
    author: 'Dra. Maria Santos',
    url: 'https://www.google.com/search?q=terapia+cognitivo+comportamental+ansiedade',
    tags: ['TCC', 'ansiedade', 'técnicas'],
    downloadable: true
  },
  {
    id: '3',
    title: 'Fundamentos da Psicanálise Contemporânea',
    description: 'Exploração dos conceitos fundamentais da psicanálise moderna e suas aplicações clínicas.',
    type: 'curso',
    area: 'psicanalise',
    level: 'iniciante',
    author: 'Instituto de Psicanálise',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: '8 horas',
    tags: ['psicanálise', 'teoria', 'clínica'],
    downloadable: false
  },
  {
    id: '4',
    title: 'Mindfulness na Prática Clínica',
    description: 'Como integrar técnicas de mindfulness no atendimento psicológico.',
    type: 'video',
    area: 'psicologia',
    level: 'intermediario',
    author: 'Dr. João Mendes',
    url: 'https://www.example.com/mindfulness-video',
    duration: '45 minutos',
    tags: ['mindfulness', 'meditação', 'técnicas'],
    downloadable: false
  },
  {
    id: '5',
    title: 'Psicologia Positiva e Bem-estar',
    description: 'Webinar sobre os princípios da psicologia positiva e sua aplicação na promoção do bem-estar.',
    type: 'webinar',
    area: 'psicologia',
    level: 'iniciante',
    author: 'Dra. Ana Costa',
    url: 'https://www.google.com',
    duration: '2 horas',
    tags: ['psicologia positiva', 'bem-estar', 'felicidade'],
    downloadable: false
  }
]