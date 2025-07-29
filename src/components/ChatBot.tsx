import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Send, X, Minimize2 } from "lucide-react"

interface Message {
  id: string
  text: string
  isBot: boolean
  timestamp: Date
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou a assistente virtual do TherapyPro. Como posso ajudá-lo?',
      isBot: true,
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()
    
    // Agenda
    if (message.includes('agenda') || message.includes('agendar') || message.includes('sessão') || message.includes('horário')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return 'Para usar a Agenda: 1) Clique em "Nova Sessão" 2) Selecione o cliente 3) Escolha data e horário 4) Adicione valor (opcional) 5) Salve. Você pode visualizar por dia, semana ou mês, e arrastar sessões para reagendar.'
      }
      return 'A Agenda permite gerenciar sessões com visualização em diferentes modos. Você pode criar, editar, excluir e reagendar sessões arrastando e soltando.'
    }
    
    // Clientes
    if (message.includes('cliente') || message.includes('paciente')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return 'Para gerenciar Clientes: 1) Vá em "Clientes" no menu 2) Clique "Novo Cliente" 3) Preencha nome, contato e informações clínicas 4) Salve. Você pode editar informações, ver histórico de sessões e anotações de cada cliente.'
      }
      return 'Na seção Clientes você pode cadastrar pacientes, manter fichas completas com histórico de sessões, anotações clínicas e dados de contato.'
    }
    
    // Pagamentos
    if (message.includes('pagamento') || message.includes('financeiro') || message.includes('dinheiro') || message.includes('valor')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return 'Para controlar Pagamentos: 1) Defina valores nas sessões 2) Marque como "pago" ou "pendente" 3) Use filtros para ver recebimentos 4) Gere relatórios financeiros mensais.'
      }
      return 'O controle de Pagamentos permite acompanhar valores de sessões, status (pago/pendente), receita mensal e gerar relatórios financeiros detalhados.'
    }
    
    // Relatórios
    if (message.includes('relatório') || message.includes('relatorio') || message.includes('dashboard') || message.includes('estatística')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return 'Para acessar Relatórios: 1) Vá em "Relatórios" no menu 2) Escolha período 3) Selecione tipo (geral, cliente específico, financeiro) 4) Visualize ou exporte em PDF/Excel.'
      }
      return 'Os Relatórios mostram estatísticas de sessões, receita, clientes ativos e produtividade. Você pode exportar em PDF ou Excel para análises detalhadas.'
    }
    
    // Configurações
    if (message.includes('configuração') || message.includes('configuracao') || message.includes('perfil') || message.includes('conta')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return 'Para acessar Configurações: 1) Clique no seu perfil (canto superior direito) 2) Escolha "Configurações" 3) Edite perfil, página de agendamento, notificações e integrações.'
      }
      return 'Nas Configurações você pode editar seu perfil profissional, personalizar página de agendamento, configurar notificações e integrações com Google Calendar.'
    }
    
    // Planos
    if (message.includes('plano') || message.includes('assinatura') || message.includes('upgrade') || message.includes('premium')) {
      return 'Temos 3 planos: Básico (grátis, até 4 sessões/cliente), Profissional (R$29,90, até 20 clientes), Premium (R$59,90, recursos ilimitados). Para upgrade, vá em "Upgrade" no menu.'
    }
    
    // Google Calendar
    if (message.includes('google') || message.includes('calendar') || message.includes('integração')) {
      return 'Para integrar com Google Calendar: 1) Vá em Configurações 2) Clique "Conectar Google Calendar" 3) Autorize acesso 4) Suas sessões serão sincronizadas automaticamente.'
    }
    
    // Estudos
    if (message.includes('estudo') || message.includes('curso') || message.includes('artigo') || message.includes('aprendizado')) {
      return 'A seção Estudos oferece artigos, cursos, webinars e podcasts para desenvolvimento profissional. Use filtros por área (psicologia, psicanálise) e nível (iniciante, avançado).'
    }
    
    // Notificações
    if (message.includes('notificação') || message.includes('notificacao') || message.includes('lembrete')) {
      return 'As notificações avisam sobre sessões agendadas, lembretes de consultas e atualizações. Configure em Configurações > Notificações.'
    }
    
    // Booking/Agendamento online
    if (message.includes('booking') || message.includes('agendamento online') || message.includes('link')) {
      return 'Você tem uma página personalizada de agendamento que clientes podem usar para marcar sessões. Acesse em Configurações para personalizar e compartilhar o link.'
    }
    
    return 'Olá! Sou seu assistente inteligente do TherapyPro. Posso explicar detalhadamente COMO USAR cada seção: Agenda (criar/editar sessões), Clientes (cadastro e fichas), Pagamentos (controle financeiro), Relatórios (análises e PDFs), Configurações (perfil e integrações), Estudos (materiais educativos) e muito mais. Digite "como usar [nome da seção]" para instruções específicas!'
  }

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isBot: false,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputMessage),
        isBot: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botResponse])
      setIsLoading(false)
    }, 1000)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-primary hover:opacity-90 shadow-lg"
          size="icon"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-80 h-96 shadow-xl">
        <CardHeader className="py-3 px-4 bg-gradient-primary text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Assistente TherapyPro</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 h-64 overflow-y-auto">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-sm ${
                    message.isBot
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-2 rounded-lg text-sm">
                  Digitando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </CardContent>

        <CardFooter className="p-3 border-t">
          <div className="flex gap-2 w-full">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Digite sua dúvida..."
              className="flex-1 text-sm"
            />
            <Button onClick={sendMessage} size="icon" className="bg-primary">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ChatBot