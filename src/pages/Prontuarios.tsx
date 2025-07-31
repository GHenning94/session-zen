import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Download, Eye, Filter, Plus, Edit, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

console.log('🎯 Prontuarios.tsx carregado')

interface RecordTemplate {
  id: string
  title: string
  category: string
  description?: string
  template_content: any
  is_public: boolean
  user_id?: string
  created_at: string
}

interface FilledRecord {
  id: string
  client_id: string
  template_id: string
  content: any
  created_at: string
  clients?: {
    nome: string
  }
  record_templates?: {
    title: string
    category: string
  }
}

export default function Prontuarios() {
  console.log('🎯 Prontuarios: iniciando componente')
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Estados principais
  const [clients, setClients] = useState<any[]>([])
  const [templates, setTemplates] = useState<RecordTemplate[]>([])
  const [filledRecords, setFilledRecords] = useState<FilledRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'templates' | 'filled'>('templates')
  const [showFillModal, setShowFillModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<RecordTemplate | null>(null)
  const [selectedClient, setSelectedClient] = useState('')
  const [formData, setFormData] = useState<any>({})
  const [filters, setFilters] = useState({
    category: '',
    search: ''
  })

  // Carregar clientes diretamente
  useEffect(() => {
    const loadClients = async () => {
      if (!user) return
      try {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
        setClients(data || [])
      } catch (error) {
        console.error('Erro ao carregar clientes:', error)
      }
    }
    loadClients()
  }, [user])

  const categories = [
    'psicologia',
    'psiquiatria',
    'psicanalise',
    'neuropsicologia',
    'outros'
  ]

  const loadTemplates = async () => {
    try {
      let query = supabase
        .from('record_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Erro ao carregar templates:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os templates.",
        variant: "destructive"
      })
    }
  }

  const loadFilledRecords = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('filled_records')
        .select(`
          *,
          clients!inner(nome),
          record_templates!inner(title, category)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFilledRecords(data || [])
    } catch (error) {
      console.error('Erro ao carregar prontuários preenchidos:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os prontuários preenchidos.",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [filters])

  useEffect(() => {
    if (user && activeTab === 'filled') {
      loadFilledRecords()
    }
    setLoading(false)
  }, [user, activeTab])

  const handleFillTemplate = (template: RecordTemplate) => {
    setSelectedTemplate(template)
    setFormData({})
    setSelectedClient('')
    setShowFillModal(true)
  }

  const handleSaveFilledRecord = async () => {
    if (!user || !selectedTemplate || !selectedClient) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('filled_records')
        .insert([{
          user_id: user.id,
          client_id: selectedClient,
          template_id: selectedTemplate.id,
          content: formData
        }])

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Prontuário preenchido e salvo com sucesso!",
      })

      setShowFillModal(false)
      loadFilledRecords()
    } catch (error) {
      console.error('Erro ao salvar prontuário:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o prontuário.",
        variant: "destructive"
      })
    }
  }

  const generatePDF = (template: RecordTemplate, data?: any) => {
    // Simular geração de PDF
    const content = data || template.template_content
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${template.title.replace(/\s+/g, '_')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Download iniciado",
      description: "O arquivo está sendo baixado.",
    })
  }

  const renderFormField = (field: any, sectionIndex: number, fieldIndex: number) => {
    const fieldKey = `${sectionIndex}-${fieldIndex}`
    const value = formData[fieldKey] || ''

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
            placeholder={`Digite ${field.name}`}
            rows={3}
          />
        )
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
            placeholder={`Digite ${field.name}`}
          />
        )
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
          />
        )
      default:
        return (
          <Input
            value={value}
            onChange={(e) => setFormData({ ...formData, [fieldKey]: e.target.value })}
            placeholder={`Digite ${field.name}`}
          />
        )
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'psicologia':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'psiquiatria':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'psicanalise':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'neuropsicologia':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Prontuários</h1>
          <p className="text-muted-foreground">
            Acesse modelos de prontuários e gerencie registros preenchidos
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('templates')}
          >
            <FileText className="h-4 w-4 mr-2 inline" />
            Modelos
          </button>
          <button
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'filled'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab('filled')}
          >
            <Clock className="h-4 w-4 mr-2 inline" />
            Meus Prontuários
          </button>
        </div>

        {activeTab === 'templates' && (
          <>
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <Input
                      placeholder="Buscar por título ou descrição..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select
                      value={filters.category}
                      onValueChange={(value) => setFilters({ ...filters, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as categorias</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Templates */}
            <div className="grid gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="shadow-soft hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{template.title}</CardTitle>
                          <Badge variant="outline" className={getCategoryColor(template.category)}>
                            {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                          </Badge>
                          {!template.is_public && (
                            <Badge variant="secondary">Privado</Badge>
                          )}
                        </div>
                        {template.description && (
                          <CardDescription>{template.description}</CardDescription>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generatePDF(template)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleFillTemplate(template)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Preencher
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p><strong>Seções incluídas:</strong></p>
                      <ul className="mt-1 space-y-1">
                        {template.template_content?.sections?.map((section: any, index: number) => (
                          <li key={index}>• {section.title}</li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {activeTab === 'filled' && (
          <div className="grid gap-6">
            {filledRecords.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Nenhum prontuário preenchido</h3>
                  <p className="text-muted-foreground mb-4">
                    Você ainda não preencheu nenhum prontuário.
                  </p>
                  <Button onClick={() => setActiveTab('templates')}>
                    Ver Modelos Disponíveis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filledRecords.map((record) => (
                <Card key={record.id} className="shadow-soft">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">
                            {record.record_templates?.title}
                          </CardTitle>
                          <Badge variant="outline" className={getCategoryColor(record.record_templates?.category || '')}>
                            {record.record_templates?.category}
                          </Badge>
                        </div>
                        <CardDescription>
                          Cliente: {record.clients?.nome} • 
                          Preenchido em {new Date(record.created_at).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const template = templates.find(t => t.id === record.template_id)
                            if (template) {
                              generatePDF(template, record.content)
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Modal de Preenchimento */}
        <Dialog open={showFillModal} onOpenChange={setShowFillModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preencher Prontuário: {selectedTemplate?.title}</DialogTitle>
            </DialogHeader>

            {selectedTemplate && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate.template_content?.sections?.map((section: any, sectionIndex: number) => (
                  <Card key={sectionIndex}>
                    <CardHeader>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {section.fields?.map((field: any, fieldIndex: number) => (
                        <div key={fieldIndex} className="space-y-2">
                          <Label>{field.name}</Label>
                          {renderFormField(field, sectionIndex, fieldIndex)}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowFillModal(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveFilledRecord} disabled={!selectedClient}>
                    Salvar Prontuário
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}