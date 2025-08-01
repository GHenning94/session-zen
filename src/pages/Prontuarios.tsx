import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Download, Eye, Filter, Plus, Edit, Trash2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import jsPDF from 'jspdf'
import { getLogoBase64, LOGO_CONFIG } from '@/utils/logoUtils'

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
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Estados principais
  const [templates, setTemplates] = useState<RecordTemplate[]>([])
  const [filledRecords, setFilledRecords] = useState<FilledRecord[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'templates' | 'records'>('records')
  
  // Estados para modais
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<RecordTemplate | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<RecordTemplate | null>(null)
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    client: ''
  })
  
  // Estados para novos dados
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    category: '',
    description: '',
    template_content: []
  })
  
  const [newRecord, setNewRecord] = useState({
    client_id: '',
    template_id: '',
    content: []
  })

  const categories = [
    'Anamnese',
    'Evolução',
    'Avaliação',
    'Triagem',
    'Relatório',
    'Outros'
  ]

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Carregar templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('record_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (templatesError) throw templatesError

      // Carregar registros preenchidos
      const { data: recordsData, error: recordsError } = await supabase
        .from('filled_records')
        .select(`
          *,
          clients (nome),
          record_templates (title, category)
        `)
        .order('created_at', { ascending: false })

      if (recordsError) throw recordsError

      // Carregar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, nome')
        .order('nome')

      if (clientsError) throw clientsError

      setTemplates(templatesData || [])
      setFilledRecords(recordsData || [])
      setClients(clientsData || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    try {
      if (!newTemplate.title || !newTemplate.category) {
        toast({
          title: "Erro",
          description: "Título e categoria são obrigatórios.",
          variant: "destructive",
        })
        return
      }

      const templateData = {
        ...newTemplate,
        user_id: user?.id
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('record_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
        
        toast({
          title: "Sucesso",
          description: "Template atualizado com sucesso!",
        })
      } else {
        const { error } = await supabase
          .from('record_templates')
          .insert([templateData])

        if (error) throw error
        
        toast({
          title: "Sucesso",
          description: "Template criado com sucesso!",
        })
      }

      setShowTemplateModal(false)
      setEditingTemplate(null)
      setNewTemplate({
        title: '',
        category: '',
        description: '',
        template_content: []
      })
      loadData()
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar o template.",
        variant: "destructive",
      })
    }
  }

  const handleEditTemplate = (template: RecordTemplate) => {
    setEditingTemplate(template)
    setNewTemplate({
      title: template.title,
      category: template.category,
      description: template.description || '',
      template_content: template.template_content || []
    })
    setShowTemplateModal(true)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('record_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Template excluído com sucesso!",
      })
      loadData()
    } catch (error) {
      console.error('Erro ao excluir template:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o template.",
        variant: "destructive",
      })
    }
  }

  const downloadTemplatePDF = async (template: RecordTemplate) => {
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width
      
      // Header com branding TherapyPro
      doc.setFillColor(59, 130, 246) // Primary blue
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      // Add logo
      try {
        const logoBase64 = await getLogoBase64()
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', LOGO_CONFIG.x, LOGO_CONFIG.y, LOGO_CONFIG.width, LOGO_CONFIG.height)
        }
      } catch (error) {
        console.warn('Could not load logo:', error)
      }
      
      // Logo/Brand name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.text('TherapyPro', 70, 25)
      
      // Reset colors
      doc.setTextColor(0, 0, 0)
      
      // Template title
      doc.setFontSize(18)
      doc.text(template.title, 20, 60)
      
      // Category badge
      doc.setFontSize(12)
      doc.text(`Categoria: ${template.category}`, 20, 75)
      
      // Description
      if (template.description) {
        doc.setFontSize(14)
        doc.text('Descrição:', 20, 95)
        doc.setFontSize(12)
        const lines = doc.splitTextToSize(template.description, pageWidth - 40)
        doc.text(lines, 20, 110)
      }
      
      // Template content
      let yPosition = template.description ? 130 : 110
      doc.setFontSize(14)
      doc.text('Campos do Template:', 20, yPosition)
      yPosition += 15
      
      if (template.template_content && Array.isArray(template.template_content)) {
        doc.setFontSize(12)
        template.template_content.forEach((field: any, index: number) => {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          
          doc.text(`${index + 1}. ${field.label || field.name || 'Campo sem nome'}`, 20, yPosition)
          yPosition += 10
          
          if (field.type) {
            doc.setFontSize(10)
            doc.text(`   Tipo: ${field.type}`, 20, yPosition)
            yPosition += 8
          }
          
          if (field.description) {
            doc.setFontSize(10)
            const descLines = doc.splitTextToSize(`   ${field.description}`, pageWidth - 40)
            doc.text(descLines, 20, yPosition)
            yPosition += descLines.length * 8
          }
          
          yPosition += 5
          doc.setFontSize(12)
        })
      }
      
      // Footer
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}`, 20, 280)
      
      // Save PDF
      const fileName = `template-${template.title.replace(/\s+/g, '-')}.pdf`
      doc.save(fileName)
      
      toast({
        title: "Sucesso",
        description: "Template baixado como PDF!",
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      })
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = !filters.category || filters.category === "all" || template.category === filters.category
    const matchesSearch = !filters.search || 
      template.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      template.description?.toLowerCase().includes(filters.search.toLowerCase())
    
    return matchesCategory && matchesSearch
  })

  const filteredRecords = filledRecords.filter(record => {
    const matchesClient = !filters.client || filters.client === "all" || record.client_id === filters.client
    const matchesSearch = !filters.search || 
      record.clients?.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
      record.record_templates?.title.toLowerCase().includes(filters.search.toLowerCase())
    
    return matchesClient && matchesSearch
  })

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Prontuários</h1>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'records' ? 'default' : 'outline'}
              onClick={() => setActiveTab('records')}
            >
              Registros
            </Button>
            <Button
              variant={activeTab === 'templates' ? 'default' : 'outline'}
              onClick={() => setActiveTab('templates')}
            >
              Templates
            </Button>
          </div>
        </div>
        
        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Buscar por título ou descrição..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              
              {activeTab === 'templates' && (
                <div>
                  <Label htmlFor="category-filter">Categoria</Label>
                  <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {activeTab === 'records' && (
                <div>
                  <Label htmlFor="client-filter">Cliente</Label>
                  <Select value={filters.client} onValueChange={(value) => setFilters(prev => ({ ...prev, client: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os clientes</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex items-end">
                <Button 
                  onClick={() => activeTab === 'templates' ? setShowTemplateModal(true) : setShowRecordModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {activeTab === 'templates' ? 'Novo Template' : 'Novo Registro'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {template.title}
                        <Badge variant="secondary">{template.category}</Badge>
                      </CardTitle>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTemplatePDF(template)}
                        title="Baixar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Criado em {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Records Tab */}
        {activeTab === 'records' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRecords.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {record.clients?.nome}
                        {record.record_templates?.category && (
                          <Badge variant="secondary">{record.record_templates.category}</Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {record.record_templates?.title}
                      </p>
                    </div>
                    
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(new Date(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Modal para Template */}
        <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Editar Template' : 'Criar Novo Template'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-title">Título*</Label>
                <Input
                  id="template-title"
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome do template"
                />
              </div>
              
              <div>
                <Label htmlFor="template-category">Categoria*</Label>
                <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="template-description">Descrição</Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do template"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? 'Atualizar' : 'Criar'} Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Empty States */}
        {activeTab === 'templates' && filteredTemplates.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {templates.length === 0 
                  ? 'Comece criando seu primeiro template de prontuário.' 
                  : 'Tente ajustar os filtros para encontrar templates.'
                }
              </p>
              <Button onClick={() => setShowTemplateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Template
              </Button>
            </CardContent>
          </Card>
        )}
        
        {activeTab === 'records' && filteredRecords.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {filledRecords.length === 0 
                  ? 'Comece criando seu primeiro registro de prontuário.' 
                  : 'Tente ajustar os filtros para encontrar registros.'
                }
              </p>
              <Button onClick={() => setShowRecordModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Registro
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}