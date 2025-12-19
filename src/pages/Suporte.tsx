import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Layout } from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import WhatsAppButton from "@/components/WhatsAppButton"
import { 
  HelpCircle, 
  MessageCircle, 
  Flag, 
  Calendar, 
  Users, 
  CreditCard, 
  FileText, 
  BarChart3, 
  Settings, 
  Zap,
  Mail,
  Phone,
  BookOpen,
  Lightbulb,
  Package,
  Repeat,
  Target
} from "lucide-react"
import { toast } from "sonner"

const categories = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "clientes", label: "Clientes/Pacientes", icon: Users },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { id: "sessoes", label: "Sessões", icon: Calendar },
  { id: "pacotes", label: "Pacotes", icon: Package },
  { id: "recorrentes", label: "Sessões Recorrentes", icon: Repeat },
  { id: "prontuarios", label: "Prontuários", icon: FileText },
  { id: "metas", label: "Metas", icon: Target },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  { id: "configuracoes", label: "Configurações", icon: Settings },
  { id: "integracoes", label: "Integrações", icon: Zap },
  { id: "outros", label: "Outros", icon: HelpCircle }
]

const faqData = [
  {
    category: "Primeiros Passos",
    icon: HelpCircle,
    questions: [
      {
        question: "Como começar a usar o TherapyPro?",
        answer: "Após criar sua conta, configure seu perfil em 'Configurações', cadastre seus primeiros pacientes e comece a agendar sessões através da agenda. Recomendamos personalizar também sua página pública de agendamento."
      },
      {
        question: "Como personalizar minha página de agendamento?",
        answer: "Acesse 'Página Pública' no menu lateral para personalizar cores, adicionar sua foto, definir horários de atendimento e criar seu link personalizado para compartilhar com pacientes."
      },
      {
        question: "Qual a diferença entre os planos Básico e Premium?",
        answer: "O plano Básico inclui funcionalidades essenciais como agenda, clientes e pagamentos. O Premium adiciona pacotes de sessões, sessões recorrentes, integrações avançadas, prontuários completos e suporte prioritário."
      }
    ]
  },
  {
    category: "Clientes e Pacientes",
    icon: Users,
    questions: [
      {
        question: "Como adicionar um novo paciente?",
        answer: "Na página 'Clientes', clique no botão 'Novo Cliente' e preencha os dados básicos. Você pode adicionar informações clínicas, contatos de emergência e medicamentos posteriormente no cadastro completo."
      },
      {
        question: "Posso gerar um link para o paciente se cadastrar?",
        answer: "Sim! No menu do cliente, selecione 'Gerar Link de Cadastro'. O paciente receberá um formulário seguro para preencher seus dados antes da primeira consulta."
      },
      {
        question: "Posso desativar um paciente temporariamente?",
        answer: "Sim! Use o menu de três pontos ao lado do cliente e selecione 'Desativar'. O paciente ficará inativo mas manterá todo o histórico de sessões e prontuários."
      }
    ]
  },
  {
    category: "Agenda e Sessões",
    icon: Calendar,
    questions: [
      {
        question: "Como agendar uma sessão?",
        answer: "Clique em 'Nova Sessão' na agenda ou diretamente em um horário. Selecione o paciente, data, horário e valor. A sessão aparecerá automaticamente na sua agenda."
      },
      {
        question: "Como criar sessões recorrentes?",
        answer: "Na página 'Sessões Recorrentes', clique em 'Nova Recorrência'. Defina o paciente, dia da semana, horário e frequência (semanal, quinzenal, mensal). O sistema gerará automaticamente as sessões futuras."
      },
      {
        question: "Posso sincronizar com o Google Calendar?",
        answer: "Sim! Acesse 'Integrações' no menu lateral e conecte sua conta do Google. Eventos criados no TherapyPro aparecem automaticamente no Google Calendar e vice-versa."
      }
    ]
  },
  {
    category: "Pacotes de Sessões",
    icon: Package,
    questions: [
      {
        question: "Como criar um pacote de sessões?",
        answer: "Na página 'Pacotes', clique em 'Novo Pacote'. Defina o nome, paciente, número de sessões, valor total e validade. O sistema calcula automaticamente o valor por sessão."
      },
      {
        question: "Como vincular sessões a um pacote?",
        answer: "Ao criar ou editar uma sessão, selecione o pacote correspondente no campo 'Pacote'. O consumo é atualizado automaticamente quando a sessão é marcada como realizada."
      },
      {
        question: "Como acompanhar o consumo de pacotes?",
        answer: "Na página 'Pacotes', visualize o progresso de cada pacote com indicador visual de sessões consumidas. O dashboard também mostra alertas quando pacotes estão próximos do fim."
      }
    ]
  },
  {
    category: "Pagamentos",
    icon: CreditCard,
    questions: [
      {
        question: "Como registrar um pagamento?",
        answer: "Na página 'Pagamentos', localize a sessão ou pacote e clique para marcar como pago, selecionando o método de pagamento. Você pode gerar recibos automaticamente após a confirmação."
      },
      {
        question: "Posso configurar valores padrão?",
        answer: "Sim! Em 'Configurações' > 'Página Pública', defina valores padrão para consultas regulares e primeira consulta para agilizar o processo de agendamento."
      },
      {
        question: "Como gerar recibos?",
        answer: "Após marcar um pagamento como pago, clique no menu da sessão e selecione 'Gerar Recibo'. O sistema gera um PDF profissional com seus dados e do paciente."
      }
    ]
  },
  {
    category: "Prontuários",
    icon: FileText,
    questions: [
      {
        question: "Como registrar evoluções do tratamento?",
        answer: "Na página 'Prontuários', selecione o paciente e clique em 'Nova Evolução'. Você pode vincular a evolução a uma sessão específica e usar o editor rico para formatação."
      },
      {
        question: "Os dados clínicos são seguros?",
        answer: "Sim! Todos os dados clínicos são criptografados em trânsito e em repouso. Apenas você tem acesso às informações dos seus pacientes. Seguimos as melhores práticas de segurança e LGPD."
      },
      {
        question: "Posso usar templates de prontuário?",
        answer: "Sim! Na página 'Prontuários', você encontra templates para diferentes tipos de avaliação. Você também pode criar seus próprios templates personalizados."
      }
    ]
  },
  {
    category: "Relatórios e Metas",
    icon: BarChart3,
    questions: [
      {
        question: "Que tipos de relatórios posso gerar?",
        answer: "Você pode gerar relatórios financeiros por período, relatórios de sessões (realizadas, canceladas, faltas), análise de faturamento mensal e exportar dados em PDF ou Excel."
      },
      {
        question: "Como definir metas mensais?",
        answer: "Na página 'Metas', crie metas para faturamento, número de sessões ou novos pacientes. Acompanhe o progresso em tempo real no dashboard."
      }
    ]
  },
  {
    category: "Integrações",
    icon: Zap,
    questions: [
      {
        question: "Quais integrações estão disponíveis?",
        answer: "Atualmente oferecemos integração com Google Calendar para sincronização de agenda e lembretes via WhatsApp."
      },
      {
        question: "Como configurar lembretes automáticos?",
        answer: "Em 'Configurações' > 'Notificações', ative os lembretes de sessão. Você pode configurar notificações por e-mail e definir quando devem ser enviados."
      }
    ]
  }
]

export default function Suporte() {
  const navigate = useNavigate()
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [reportForm, setReportForm] = useState({
    name: '',
    email: '',
    category: '',
    title: '',
    description: ''
  })
  const [suggestionForm, setSuggestionForm] = useState({
    name: '',
    email: '',
    title: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success("Mensagem enviada! Retornaremos em breve.")
    setContactModalOpen(false)
    setContactForm({ name: '', email: '', subject: '', message: '' })
    setLoading(false)
  }

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success("Problema reportado! Nossa equipe irá analisar.")
    setReportModalOpen(false)
    setReportForm({ name: '', email: '', category: '', title: '', description: '' })
    setLoading(false)
  }

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success("Sugestão enviada! Agradecemos seu feedback.")
    setSuggestionModalOpen(false)
    setSuggestionForm({ name: '', email: '', title: '', description: '' })
    setLoading(false)
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Central de Suporte</h1>
          <p className="text-lg text-muted-foreground">
            Encontre respostas, reporte problemas ou envie sugestões
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50" 
            onClick={() => navigate('/documentacao')}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-base">Documentação</CardTitle>
              <CardDescription className="text-xs">
                Guia completo de uso da plataforma
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50" 
            onClick={() => setContactModalOpen(true)}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-base">Contato</CardTitle>
              <CardDescription className="text-xs">
                Fale conosco para dúvidas ou informações
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-destructive/50" 
            onClick={() => setReportModalOpen(true)}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                <Flag className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-base">Reportar Problema</CardTitle>
              <CardDescription className="text-xs">
                Relate bugs ou erros técnicos
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-yellow-500/50" 
            onClick={() => setSuggestionModalOpen(true)}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2">
                <Lightbulb className="w-6 h-6 text-yellow-500" />
              </div>
              <CardTitle className="text-base">Sugestão</CardTitle>
              <CardDescription className="text-xs">
                Envie ideias de melhorias
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center">Perguntas Frequentes</h2>
          
          <div className="grid gap-6">
            {faqData.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <section.icon className="w-5 h-5 text-primary" />
                    {section.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {section.questions.map((faq, faqIndex) => (
                      <AccordionItem key={faqIndex} value={`${index}-${faqIndex}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Outras Formas de Contato</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>suporte@therapypro.app</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>(11) 99999-9999</span>
              </div>
            </div>
            <div className="pt-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/documentacao')}
                className="gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Acessar Documentação Completa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Modal */}
      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Fale Conosco</DialogTitle>
            <DialogDescription>
              Preencha o formulário abaixo e retornaremos em breve
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Nome</Label>
                <Input
                  id="contact-name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">E-mail</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-subject">Assunto</Label>
              <Input
                id="contact-subject"
                value={contactForm.subject}
                onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-message">Mensagem</Label>
              <Textarea
                id="contact-message"
                rows={4}
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setContactModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Mensagem"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reportar Problema</DialogTitle>
            <DialogDescription>
              Descreva o problema encontrado para que possamos corrigi-lo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-name">Nome</Label>
                <Input
                  id="report-name"
                  value={reportForm.name}
                  onChange={(e) => setReportForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-email">E-mail</Label>
                <Input
                  id="report-email"
                  type="email"
                  value={reportForm.email}
                  onChange={(e) => setReportForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-category">Categoria</Label>
              <Select 
                value={reportForm.category} 
                onValueChange={(value) => setReportForm(prev => ({ ...prev, category: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <category.icon className="w-4 h-4" />
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-title">Título do Problema</Label>
              <Input
                id="report-title"
                value={reportForm.title}
                onChange={(e) => setReportForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Erro ao salvar sessão"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">Descrição Detalhada</Label>
              <Textarea
                id="report-description"
                rows={4}
                value={reportForm.description}
                onChange={(e) => setReportForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o problema, quando acontece e quais passos reproduzem o erro..."
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Reportar Problema"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Suggestion Modal */}
      <Dialog open={suggestionModalOpen} onOpenChange={setSuggestionModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enviar Sugestão</DialogTitle>
            <DialogDescription>
              Compartilhe suas ideias para melhorar o TherapyPro
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSuggestionSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suggestion-name">Nome</Label>
                <Input
                  id="suggestion-name"
                  value={suggestionForm.name}
                  onChange={(e) => setSuggestionForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suggestion-email">E-mail</Label>
                <Input
                  id="suggestion-email"
                  type="email"
                  value={suggestionForm.email}
                  onChange={(e) => setSuggestionForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestion-title">Título da Sugestão</Label>
              <Input
                id="suggestion-title"
                value={suggestionForm.title}
                onChange={(e) => setSuggestionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Integração com Zoom"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestion-description">Descrição da Ideia</Label>
              <Textarea
                id="suggestion-description"
                rows={4}
                value={suggestionForm.description}
                onChange={(e) => setSuggestionForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva sua sugestão em detalhes..."
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSuggestionModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Sugestão"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* WhatsApp Button */}
      <WhatsAppButton show={true} />
    </Layout>
  )
}