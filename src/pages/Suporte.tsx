import { useState } from "react"
import { Layout } from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"

const categories = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "agenda", label: "Agenda", icon: Calendar },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
  { id: "sessoes", label: "Sessões", icon: Calendar },
  { id: "prontuarios", label: "Prontuários", icon: FileText },
  { id: "eventos", label: "Eventos", icon: Calendar },
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
        answer: "Após criar sua conta, configure seu perfil em 'Configurações', cadastre seus primeiros clientes e comece a agendar sessões através da agenda."
      },
      {
        question: "Como personalizar minha página de agendamento?",
        answer: "Vá em 'Configurações' > 'Página Pública' para personalizar cores, adicionar sua foto, definir horários de atendimento e criar seu link personalizado."
      }
    ]
  },
  {
    category: "Clientes",
    icon: Users,
    questions: [
      {
        question: "Como adicionar um novo cliente?",
        answer: "Na página 'Clientes', clique no botão 'Novo Cliente' e preencha os dados básicos. Você pode adicionar informações clínicas posteriormente."
      },
      {
        question: "Posso desativar um cliente temporariamente?",
        answer: "Sim! Use o menu de três pontos ao lado do cliente e selecione 'Desativar'. O cliente ficará inativo mas manterá todo o histórico."
      }
    ]
  },
  {
    category: "Agenda",
    icon: Calendar,
    questions: [
      {
        question: "Como agendar uma sessão?",
        answer: "Clique em 'Nova Sessão' na agenda, selecione o cliente, data, horário e outros detalhes. A sessão aparecerá automaticamente na sua agenda."
      },
      {
        question: "Posso sincronizar com Google Calendar?",
        answer: "Sim! Vá em 'Integrações' e conecte sua conta do Google para sincronização automática de eventos."
      }
    ]
  },
  {
    category: "Pagamentos",
    icon: CreditCard,
    questions: [
      {
        question: "Como registrar um pagamento?",
        answer: "Na página 'Pagamentos', clique em 'Novo Pagamento', selecione o cliente, valor e forma de pagamento. Você pode gerar recibos automaticamente."
      },
      {
        question: "Posso configurar valores padrão?",
        answer: "Sim! Em 'Configurações', defina valores padrão para consultas e primeira consulta para agilizar o processo."
      }
    ]
  },
  {
    category: "Relatórios",
    icon: BarChart3,
    questions: [
      {
        question: "Que tipos de relatórios posso gerar?",
        answer: "Você pode gerar relatórios financeiros, de sessões por período, clientes mais ativos e análises de faturamento mensal."
      },
      {
        question: "Como exportar dados?",
        answer: "Todos os relatórios podem ser exportados em PDF ou Excel através do botão 'Exportar' na página de relatórios."
      }
    ]
  },
  {
    category: "Integração",
    icon: Zap,
    questions: [
      {
        question: "Quais integrações estão disponíveis?",
        answer: "Atualmente oferecemos integração com Google Calendar, WhatsApp para lembretes e Google Ads para divulgação."
      },
      {
        question: "Como configurar lembretes automáticos?",
        answer: "Vá em 'Configurações' > 'Notificações' e ative os lembretes por WhatsApp ou email, definindo quando devem ser enviados."
      }
    ]
  }
]

export default function Suporte() {
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
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
  const [loading, setLoading] = useState(false)

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success("Mensagem enviada! Retornaremos em breve.")
    setContactModalOpen(false)
    setContactForm({ name: '', email: '', subject: '', message: '' })
    setLoading(false)
  }

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success("Problema reportado! Nossa equipe irá analisar.")
    setReportModalOpen(false)
    setReportForm({ name: '', email: '', category: '', title: '', description: '' })
    setLoading(false)
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Central de Suporte</h1>
          <p className="text-lg text-muted-foreground">
            Encontre respostas para suas dúvidas ou entre em contato conosco
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setContactModalOpen(true)}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Contato</CardTitle>
              <CardDescription>
                Fale conosco para dúvidas gerais, sugestões ou informações
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setReportModalOpen(true)}>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                <Flag className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle>Reportar Problema</CardTitle>
              <CardDescription>
                Relate bugs, erros ou problemas técnicos da plataforma
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
                  <CardTitle className="flex items-center gap-2">
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
            <div className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span>suporte@therapypro.app</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <span>(11) 99999-9999</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              <a href="https://docs.therapypro.app" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Documentação Completa
              </a>
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
                placeholder="Ex: Erro ao salvar cliente"
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
    </Layout>
  )
}