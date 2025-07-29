import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageCircle, X, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  text: string
  isBot: boolean
  timestamp: Date
}

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! Sou o assistente virtual do TherapyPro. Como posso ajudá-lo hoje?',
      isBot: true,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const predefinedResponses: Record<string, string> = {
    'como agendar': 'Para agendar uma sessão, você pode usar nosso sistema de agendamento online. Acesse sua agenda e clique em "Nova Sessão" ou use o link de compartilhamento enviado pelo seu terapeuta.',
    'cancelar sessão': 'Para cancelar uma sessão, acesse sua agenda, encontre a sessão desejada e clique em "Cancelar". Lembre-se de verificar a política de cancelamento.',
    'pagamento': 'Aceitamos PIX, cartão de crédito/débito, transferência bancária e dinheiro. O pagamento pode ser feito no momento da sessão ou antecipadamente.',
    'primeira consulta': 'A primeira consulta tem um valor especial. Entre em contato com seu terapeuta para mais informações sobre valores e disponibilidade.',
    'horários': 'Os horários de atendimento variam conforme cada profissional. Consulte a agenda do seu terapeuta para ver os horários disponíveis.',
    'online': 'Sim, oferecemos consultas online através de videoconferência. Entre em contato para verificar se seu terapeuta atende online.',
    'relatório': 'Você pode gerar relatórios de sessões e financeiros na aba "Relatórios" do sistema.',
    'notificações': 'Você pode configurar notificações por email e WhatsApp na aba "Configurações" > "Notificações".',
    'suporte': 'Se precisar de suporte técnico ou tiver dúvidas que não consigo responder, posso direcioná-lo para nosso atendimento humano.'
  }

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()
    
    for (const [key, response] of Object.entries(predefinedResponses)) {
      if (message.includes(key)) {
        return response
      }
    }

    // Respostas baseadas em palavras-chave
    if (message.includes('ajuda') || message.includes('help')) {
      return 'Posso ajudar com: agendamento de sessões, cancelamentos, pagamentos, horários, consultas online, relatórios e configurações do sistema. Sobre o que gostaria de saber?'
    }

    if (message.includes('obrigad') || message.includes('valeu')) {
      return 'Por nada! Fico feliz em ajudar. Se tiver mais dúvidas, estarei aqui.'
    }

    if (message.includes('tchau') || message.includes('até')) {
      return 'Até logo! Volte sempre que precisar de ajuda.'
    }

    // Resposta padrão
    return 'Desculpe, não entendi sua pergunta. Posso ajudar com informações sobre agendamento, cancelamentos, pagamentos, horários e funcionalidades do sistema. Você gostaria de falar com nosso suporte humano?'
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isBot: false,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // Simular delay do bot
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(input),
        isBot: true,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, botResponse])
      setLoading(false)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-96 shadow-xl z-50 flex flex-col">
          <CardHeader className="flex-row items-center justify-between py-3">
            <CardTitle className="text-lg">Assistente Virtual</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg text-sm ${
                      message.isBot
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  disabled={loading}
                />
                <Button 
                  size="sm" 
                  onClick={sendMessage} 
                  disabled={loading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}