import { useState, useEffect } from "react"
import { Layout } from "@/components/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, ExternalLink, BookOpen, Video, FileText, Users } from "lucide-react"

interface StudyContent {
  id: string
  title: string
  description: string
  type: 'article' | 'video' | 'webinar' | 'course'
  area: 'psicanalise' | 'psiquiatria' | 'psicologia' | 'coaching' | 'geral'
  topic: string
  url: string
  duration?: string
  level: 'iniciante' | 'intermediario' | 'avancado'
  free: boolean
}

const studyContents: StudyContent[] = [
  {
    id: '1',
    title: 'Fundamentos da Psicanálise Freudiana',
    description: 'Introdução aos conceitos básicos da psicanálise de Sigmund Freud',
    type: 'article',
    area: 'psicanalise',
    topic: 'Fundamentos',
    url: 'https://example.com/freud-fundamentos',
    level: 'iniciante',
    free: true
  },
  {
    id: '2',
    title: 'Técnicas de Terapia Cognitivo-Comportamental',
    description: 'Webinar sobre as principais técnicas da TCC na prática clínica',
    type: 'webinar',
    area: 'psicologia',
    topic: 'TCC',
    url: 'https://example.com/tcc-webinar',
    duration: '2h',
    level: 'intermediario',
    free: true
  },
  {
    id: '3',
    title: 'Neurobiologia dos Transtornos de Humor',
    description: 'Artigo científico sobre os aspectos neurobiológicos da depressão e ansiedade',
    type: 'article',
    area: 'psiquiatria',
    topic: 'Neurobiologia',
    url: 'https://example.com/neurobiologia-humor',
    level: 'avancado',
    free: true
  },
  {
    id: '4',
    title: 'Coaching e Desenvolvimento Pessoal',
    description: 'Curso online sobre técnicas de coaching para desenvolvimento pessoal',
    type: 'course',
    area: 'coaching',
    topic: 'Desenvolvimento',
    url: 'https://example.com/coaching-curso',
    duration: '8h',
    level: 'iniciante',
    free: true
  },
  {
    id: '5',
    title: 'Transferência e Contratransferência',
    description: 'Vídeo explicativo sobre os conceitos de transferência na análise',
    type: 'video',
    area: 'psicanalise',
    topic: 'Transferência',
    url: 'https://example.com/transferencia-video',
    duration: '45min',
    level: 'intermediario',
    free: true
  },
  {
    id: '6',
    title: 'Psicofarmacologia Clínica',
    description: 'Guia completo sobre medicações psiquiátricas e seus efeitos',
    type: 'article',
    area: 'psiquiatria',
    topic: 'Farmacologia',
    url: 'https://example.com/psicofarmacologia',
    level: 'avancado',
    free: true
  },
  {
    id: '7',
    title: 'Mindfulness na Prática Clínica',
    description: 'Webinar sobre aplicação de técnicas de mindfulness na terapia',
    type: 'webinar',
    area: 'psicologia',
    topic: 'Mindfulness',
    url: 'https://example.com/mindfulness-webinar',
    duration: '90min',
    level: 'intermediario',
    free: true
  },
  {
    id: '8',
    title: 'Ética Profissional em Saúde Mental',
    description: 'Artigo sobre dilemas éticos na prática da psicologia e psicanálise',
    type: 'article',
    area: 'geral',
    topic: 'Ética',
    url: 'https://example.com/etica-saude-mental',
    level: 'intermediario',
    free: true
  }
]

export default function Estudos() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [filteredContents, setFilteredContents] = useState<StudyContent[]>(studyContents)

  useEffect(() => {
    let filtered = studyContents

    if (searchTerm) {
      filtered = filtered.filter(content => 
        content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        content.topic.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedArea !== 'all') {
      filtered = filtered.filter(content => content.area === selectedArea)
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(content => content.type === selectedType)
    }

    if (selectedLevel !== 'all') {
      filtered = filtered.filter(content => content.level === selectedLevel)
    }

    setFilteredContents(filtered)
  }, [searchTerm, selectedArea, selectedType, selectedLevel])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'article': return <FileText className="h-4 w-4" />
      case 'video': return <Video className="h-4 w-4" />
      case 'webinar': return <Users className="h-4 w-4" />
      case 'course': return <BookOpen className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'article': return 'Artigo'
      case 'video': return 'Vídeo'
      case 'webinar': return 'Webinar'
      case 'course': return 'Curso'
      default: return 'Conteúdo'
    }
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
    switch (area) {
      case 'psicanalise': return 'Psicanálise'
      case 'psiquiatria': return 'Psiquiatria'
      case 'psicologia': return 'Psicologia'
      case 'coaching': return 'Coaching'
      case 'geral': return 'Geral'
      default: return area
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Estudos</h1>
          <p className="text-muted-foreground">
            Conteúdos gratuitos de qualidade para seu desenvolvimento profissional
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, descrição ou tópico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Área</label>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as áreas</SelectItem>
                    <SelectItem value="psicanalise">Psicanálise</SelectItem>
                    <SelectItem value="psiquiatria">Psiquiatria</SelectItem>
                    <SelectItem value="psicologia">Psicologia</SelectItem>
                    <SelectItem value="coaching">Coaching</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="article">Artigos</SelectItem>
                    <SelectItem value="video">Vídeos</SelectItem>
                    <SelectItem value="webinar">Webinars</SelectItem>
                    <SelectItem value="course">Cursos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Nível</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os níveis</SelectItem>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContents.map((content) => (
            <Card key={content.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(content.type)}
                    <Badge variant="secondary">
                      {getTypeName(content.type)}
                    </Badge>
                  </div>
                  <Badge className={getLevelColor(content.level)}>
                    {content.level}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{content.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {content.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {getAreaName(content.area)}
                  </Badge>
                  <Badge variant="outline">
                    {content.topic}
                  </Badge>
                  {content.duration && (
                    <Badge variant="outline">
                      {content.duration}
                    </Badge>
                  )}
                  {content.free && (
                    <Badge className="bg-green-100 text-green-800">
                      Gratuito
                    </Badge>
                  )}
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => window.open(content.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Acessar Conteúdo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredContents.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Nenhum conteúdo encontrado com os filtros selecionados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}