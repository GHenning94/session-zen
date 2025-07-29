import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Layout } from "@/components/Layout"
import { 
  BookOpen, 
  Video, 
  Users, 
  FileText, 
  Search, 
  Filter,
  ExternalLink,
  GraduationCap,
  Brain,
  Heart
} from "lucide-react"

interface StudyContent {
  id: string
  title: string
  description: string
  type: 'artigo' | 'video' | 'webinar' | 'curso' | 'podcast'
  area: 'psicologia' | 'psicanalise' | 'psiquiatria' | 'coaching' | 'terapia' | 'geral'
  level: 'iniciante' | 'intermediario' | 'avancado'
  url: string
  duration?: string
  author: string
  tags: string[]
}

const studyContents: StudyContent[] = [
  {
    id: '1',
    title: 'Fundamentos da Terapia Cognitivo-Comportamental',
    description: 'Uma introdução completa aos princípios e técnicas da TCC aplicada na prática clínica.',
    type: 'artigo',
    area: 'psicologia',
    level: 'iniciante',
    url: 'https://www.scielo.br/j/prc/a/tcc-fundamentos/',
    author: 'Dr. João Silva',
    tags: ['TCC', 'fundamentos', 'terapia']
  },
  {
    id: '2',
    title: 'Webinar: Transtornos de Ansiedade na Atualidade',
    description: 'Discussão sobre os principais transtornos de ansiedade e suas manifestações contemporâneas.',
    type: 'webinar',
    area: 'psiquiatria',
    level: 'intermediario',
    url: 'https://youtube.com/watch?v=anxiety-webinar',
    duration: '1h30min',
    author: 'Dra. Maria Santos',
    tags: ['ansiedade', 'transtornos', 'psiquiatria']
  },
  {
    id: '3',
    title: 'Curso Online: Psicanálise Contemporânea',
    description: 'Curso completo sobre as principais correntes psicanalíticas atuais e sua aplicação clínica.',
    type: 'curso',
    area: 'psicanalise',
    level: 'avancado',
    url: 'https://coursera.org/psicanalise-contemporanea',
    duration: '40 horas',
    author: 'Prof. Carlos Freud',
    tags: ['psicanálise', 'lacan', 'freud']
  },
  {
    id: '4',
    title: 'Coaching Ontológico: Ferramentas Práticas',
    description: 'Artigo sobre ferramentas práticas do coaching ontológico para desenvolvimento pessoal.',
    type: 'artigo',
    area: 'coaching',
    level: 'intermediario',
    url: 'https://coachingbrasil.org/ontologico-ferramentas',
    author: 'Coach Ana Lima',
    tags: ['coaching', 'ontológico', 'ferramentas']
  },
  {
    id: '5',
    title: 'Podcast: Burnout em Profissionais da Saúde Mental',
    description: 'Discussão sobre prevenção e tratamento do burnout entre psicólogos e psiquiatras.',
    type: 'podcast',
    area: 'geral',
    level: 'intermediario',
    url: 'https://spotify.com/burnout-saude-mental',
    duration: '45min',
    author: 'Dr. Pedro Oliveira',
    tags: ['burnout', 'prevenção', 'saúde mental']
  },
  {
    id: '6',
    title: 'Terapia Familiar Sistêmica: Novos Paradigmas',
    description: 'Exploração dos novos paradigmas na terapia familiar sistêmica e suas aplicações.',
    type: 'video',
    area: 'terapia',
    level: 'avancado',
    url: 'https://vimeo.com/terapia-familiar-sistemica',
    duration: '2h15min',
    author: 'Dra. Lucia Terapia',
    tags: ['terapia familiar', 'sistêmica', 'paradigmas']
  },
  {
    id: '7',
    title: 'Neuropsicologia: Avaliação e Reabilitação',
    description: 'Manual prático sobre técnicas de avaliação e reabilitação neuropsicológica.',
    type: 'artigo',
    area: 'psicologia',
    level: 'avancado',
    url: 'https://neuropsicologia.org.br/manual-avaliacao',
    author: 'Dr. Cérebro Ativo',
    tags: ['neuropsicologia', 'avaliação', 'reabilitação']
  },
  {
    id: '8',
    title: 'Mindfulness na Prática Clínica',
    description: 'Como integrar técnicas de mindfulness na prática clínica terapêutica.',
    type: 'webinar',
    area: 'terapia',
    level: 'iniciante',
    url: 'https://mindfulness-clinic.com/webinar',
    duration: '1h',
    author: 'Mestre Zen Silva',
    tags: ['mindfulness', 'meditação', 'terapia']
  }
]

const Estudos = () => {
  const [filteredContents, setFilteredContents] = useState<StudyContent[]>(studyContents)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArea, setSelectedArea] = useState<string>('todos')
  const [selectedType, setSelectedType] = useState<string>('todos')
  const [selectedLevel, setSelectedLevel] = useState<string>('todos')

  useEffect(() => {
    const filtered = studyContents.filter(content => {
      const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           content.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           content.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesArea = selectedArea === 'todos' || content.area === selectedArea
      const matchesType = selectedType === 'todos' || content.type === selectedType
      const matchesLevel = selectedLevel === 'todos' || content.level === selectedLevel
      
      return matchesSearch && matchesArea && matchesType && matchesLevel
    })
    
    setFilteredContents(filtered)
  }, [searchTerm, selectedArea, selectedType, selectedLevel])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'artigo': return <FileText className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'webinar': return <Users className="w-4 h-4" />
      case 'curso': return <GraduationCap className="w-4 h-4" />
      case 'podcast': return <BookOpen className="w-4 h-4" />
      default: return <BookOpen className="w-4 h-4" />
    }
  }

  const getTypeName = (type: string) => {
    const types = {
      'artigo': 'Artigo',
      'video': 'Vídeo',
      'webinar': 'Webinar',
      'curso': 'Curso',
      'podcast': 'Podcast'
    }
    return types[type as keyof typeof types] || type
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'iniciante': return 'bg-green-100 text-green-800'
      case 'intermediario': return 'bg-yellow-100 text-yellow-800'
      case 'avancado': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAreaName = (area: string) => {
    const areas = {
      'psicologia': 'Psicologia',
      'psicanalise': 'Psicanálise',
      'psiquiatria': 'Psiquiatria',
      'coaching': 'Coaching',
      'terapia': 'Terapia',
      'geral': 'Geral'
    }
    return areas[area as keyof typeof areas] || area
  }

  const getAreaIcon = (area: string) => {
    switch (area) {
      case 'psicologia': return <Brain className="w-4 h-4" />
      case 'psicanalise': return <BookOpen className="w-4 h-4" />
      case 'psiquiatria': return <Heart className="w-4 h-4" />
      case 'coaching': return <Users className="w-4 h-4" />
      default: return <GraduationCap className="w-4 h-4" />
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estudos</h1>
          <p className="text-muted-foreground">
            Acesse conteúdos relevantes para sua formação profissional
          </p>
        </div>

        {/* Filters */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por título, descrição ou tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Área</label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as áreas</SelectItem>
                    <SelectItem value="psicologia">Psicologia</SelectItem>
                    <SelectItem value="psicanalise">Psicanálise</SelectItem>
                    <SelectItem value="psiquiatria">Psiquiatria</SelectItem>
                    <SelectItem value="coaching">Coaching</SelectItem>
                    <SelectItem value="terapia">Terapia</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="artigo">Artigos</SelectItem>
                    <SelectItem value="video">Vídeos</SelectItem>
                    <SelectItem value="webinar">Webinars</SelectItem>
                    <SelectItem value="curso">Cursos</SelectItem>
                    <SelectItem value="podcast">Podcasts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nível</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os níveis</SelectItem>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {filteredContents.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhum conteúdo encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar os filtros para encontrar o que procura.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content) => (
              <Card key={content.id} className="shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(content.type)}
                      <Badge variant="outline">
                        {getTypeName(content.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {getAreaIcon(content.area)}
                      <span className="text-xs text-muted-foreground">
                        {getAreaName(content.area)}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {content.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {content.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Por: {content.author}</span>
                      {content.duration && (
                        <span className="text-muted-foreground">{content.duration}</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {content.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Badge className={getLevelColor(content.level)}>
                        {content.level.charAt(0).toUpperCase() + content.level.slice(1)}
                      </Badge>
                      
                      <Button 
                        size="sm" 
                        className="bg-gradient-primary hover:opacity-90"
                        onClick={() => window.open(content.url, '_blank')}
                      >
                        Acessar <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Statistics */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{studyContents.length}</p>
                <p className="text-sm text-muted-foreground">Total de Conteúdos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">
                  {studyContents.filter(c => c.type === 'artigo').length}
                </p>
                <p className="text-sm text-muted-foreground">Artigos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {studyContents.filter(c => c.type === 'video' || c.type === 'webinar').length}
                </p>
                <p className="text-sm text-muted-foreground">Vídeos/Webinars</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">
                  {studyContents.filter(c => c.type === 'curso').length}
                </p>
                <p className="text-sm text-muted-foreground">Cursos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default Estudos