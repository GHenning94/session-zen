import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageCircle, Send, X, Minimize2 } from "lucide-react"
import DOMPurify from 'dompurify'

interface Message {
  id: string
  text: string
  isBot: boolean
  timestamp: Date
}

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    // Recuperar mensagens do localStorage
    const savedMessages = localStorage.getItem('chatbot-messages')
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages)
        return parsed.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) }))
      } catch {
        // Se erro na parse, usar mensagem padrão
      }
    }
    return [
      {
        id: '1',
        text: 'Olá! Sou a assistente virtual do **TherapyPro**. Como posso **ajudá-lo**?',
        isBot: true,
        timestamp: new Date()
      }
    ]
  })
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getBotResponse = async (userMessage: string): Promise<string> => {
    try {
      console.log('Enviando mensagem para Gemini:', userMessage)
      
      const response = await fetch(`https://ykwszazxigjivjkagjmf.supabase.co/functions/v1/gemini-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd3N6YXp4aWdqaXZqa2Fnam1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzODE2MTUsImV4cCI6MjA2ODk1NzYxNX0.utJMKfG-4rJH0jfzG3WLAsCwx5tGE4DgxwJN2Z8XeT4'}`,
        },
        body: JSON.stringify({ message: userMessage }),
      })

      console.log('Resposta do Gemini:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro da API:', errorText)
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Dados recebidos:', data)
      
      if (data.response) {
        return data.response
      } else if (data.error) {
        throw new Error(data.error)
      } else {
        throw new Error('Resposta inválida da API')
      }
    } catch (error) {
      console.error('Erro completo ao consultar Gemini:', error)
      return getBotResponseLocal(userMessage)
    }
  }

  const getBotResponseLocal = (userMessage: string): string => {
    const message = userMessage.toLowerCase()
    
    // Sistema inteligente de respostas baseado em contexto e palavras-chave
    
    // Dashboard
    if (message.includes('dashboard') || message.includes('painel') || message.includes('início')) {
      return '📊 DASHBOARD: Sua central de controle! Aqui você vê: sessões de hoje (3), receita prevista (R$ 450), taxa de ocupação (13%). Clique nos cards para navegar diretamente para cada seção. O gráfico mostra evolução mensal da receita.'
    }
    
    // Agenda - detalhado
    if (message.includes('agenda') || message.includes('agendar') || message.includes('sessão') || message.includes('horário')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return '📅 COMO USAR AGENDA: 1) Clique "Nova Sessão" (azul) 2) Selecione cliente no dropdown 3) Escolha data no calendário 4) Defina horário 5) Adicione valor (R$) 6) Salve. DICAS: Arraste sessões para reagendar, clique nos botões Dia/Semana/Mês para trocar visualização, use botões Hoje/setas para navegar.'
      }
      if (message.includes('google') || message.includes('sincronizar')) {
        return '🔗 GOOGLE CALENDAR: Conecte em Configurações > Integrações > "Conectar Google Calendar". Autorize o acesso e suas sessões aparecerão automaticamente no Google. Útil para não perder compromissos!'
      }
      return '📅 AGENDA: Visualize sessões por dia/semana/mês. Crie sessões clicando "Nova Sessão", reagende arrastando e soltando, edite clicando no lápis. Status: agendada (azul), realizada (verde), cancelada (vermelho).'
    }
    
    // Clientes - detalhado
    if (message.includes('cliente') || message.includes('paciente')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return '👥 COMO USAR CLIENTES: 1) Menu lateral > "Clientes" 2) Botão azul "Novo Cliente" 3) Preencha: nome*, telefone*, email*, endereço, observações clínicas 4) Salve. Para editar: clique no cliente > botão "Editar". Veja histórico de sessões na ficha.'
      }
      if (message.includes('histórico') || message.includes('sessões')) {
        return '📋 HISTÓRICO DO CLIENTE: Na ficha de cada cliente você vê todas as sessões (datas, valores, status), pode adicionar anotações clínicas importantes e acompanhar evolução do tratamento. Útil para relatórios!'
      }
      return '👥 CLIENTES: Cadastre pacientes com dados completos, mantenha histórico de sessões, adicione anotações clínicas. Busque por nome/telefone. Cada cliente tem ficha individual com todas as informações.'
    }
    
    // Pagamentos - detalhado  
    if (message.includes('pagamento') || message.includes('financeiro') || message.includes('dinheiro') || message.includes('valor') || message.includes('receita')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return '💰 COMO USAR PAGAMENTOS: 1) Defina valores ao criar sessões 2) Marque status: "Pendente"→"Pago" após receber 3) Use filtros (período, status, cliente) 4) Veja totais: receita mensal, valores pendentes. Para relatório: botão "Exportar".'
      }
      return '💰 PAGAMENTOS: Controle total das finanças! Acompanhe valores de sessões, marque como pago/pendente, veja receita mensal (R$ 3.450), valores em atraso, e gere relatórios financeiros detalhados.'
    }
    
    // Relatórios - detalhado
    if (message.includes('relatório') || message.includes('relatorio') || message.includes('exportar') || message.includes('pdf') || message.includes('excel')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return '📊 COMO USAR RELATÓRIOS: 1) Menu > "Relatórios" 2) Escolha período (mês/ano) 3) Selecione tipo: Geral (visão geral), Financeiro (receitas/gastos), Por Cliente (individual) 4) Clique "Gerar" 5) "Exportar PDF" ou "Excel" para salvar.'
      }
      return '📊 RELATÓRIOS: Análises completas! Gere relatórios de receita mensal/anual, número de sessões, clientes ativos, taxa de ocupação. Exporte em PDF/Excel para apresentações ou imposto de renda.'
    }
    
    // Configurações - detalhado
    if (message.includes('configuração') || message.includes('configuracao') || message.includes('perfil') || message.includes('conta')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return '⚙️ COMO USAR CONFIGURAÇÕES: 1) Clique seu avatar (canto superior direito) > "Configurações" 2) Abas disponíveis: Perfil (dados pessoais), Página (agendamento online), Notificações (lembretes), Integrações (Google). Edite e salve as alterações.'
      }
      if (message.includes('página') || message.includes('agendamento') || message.includes('link')) {
        return '🔗 PÁGINA DE AGENDAMENTO: Em Configurações > Página, personalize sua página pública onde clientes podem agendar sessões online. Adicione foto, horários disponíveis, valores. Compartilhe o link!'
      }
      return '⚙️ CONFIGURAÇÕES: Personalize tudo! Edite perfil profissional, configure página de agendamento online, ajuste notificações, integre Google Calendar. Acesse pelo seu avatar no canto superior direito.'
    }
    
    // Planos e Upgrade
    if (message.includes('plano') || message.includes('assinatura') || message.includes('upgrade') || message.includes('premium') || message.includes('limite')) {
      return '💎 PLANOS: Básico (GRATUITO: 4 sessões/cliente), Profissional (R$29,90: 20 clientes, relatórios), Premium (R$59,90: ILIMITADO, todas as funcionalidades). Para upgrade: Menu > "Upgrade" > Escolha plano > Pague.'
    }
    
    // Estudos - detalhado
    if (message.includes('estudo') || message.includes('curso') || message.includes('artigo') || message.includes('aprendizado') || message.includes('material')) {
      if (message.includes('como') || message.includes('usar') || message.includes('utilizar')) {
        return '📚 COMO USAR ESTUDOS: 1) Menu > "Estudos" 2) Use filtros: Área (psicologia, psicanálise), Tipo (artigo, vídeo, curso), Nível (iniciante, avançado) 3) Busque por palavra-chave 4) Clique "Acessar" para abrir conteúdo. Todos os links são verificados!'
      }
      return '📚 ESTUDOS: Biblioteca completa! Artigos científicos, cursos gratuitos, vídeos educacionais, webinars especializados. Filtre por área e nível. Conteúdo constantemente atualizado para seu desenvolvimento profissional.'
    }
    
    // Notificações
    if (message.includes('notificação') || message.includes('notificacao') || message.includes('lembrete') || message.includes('aviso')) {
      return '🔔 NOTIFICAÇÕES: Receba lembretes de sessões do dia seguinte, avisos de novos agendamentos, alertas de pagamentos pendentes. Configure em Configurações > Notificações (email/push).'
    }
    
    // Google Calendar integração específica
    if (message.includes('google') || message.includes('calendar') || message.includes('sincronizar') || message.includes('integração')) {
      return '📅 GOOGLE CALENDAR: Para conectar: Configurações > Integrações > "Conectar Google Calendar" > Autorizar acesso. Suas sessões do TherapyPro aparecerão automaticamente no Google Calendar. Sincronização bidirecional!'
    }
    
    // Problemas técnicos
    if (message.includes('erro') || message.includes('problema') || message.includes('não funciona') || message.includes('bug')) {
      return '🔧 PROBLEMAS TÉCNICOS: 1) Atualize a página (F5) 2) Limpe cache do navegador 3) Verifique conexão com internet 4) Se Google Calendar não conecta, verifique se permitiu todas as permissões. Persiste? Contate suporte!'
    }
    
    // Dicas gerais de uso
    if (message.includes('dica') || message.includes('sugestão') || message.includes('melhor forma')) {
      return '💡 DICAS PRO: 1) Use atalhos: Ctrl+N (nova sessão), Tab para navegar 2) Configure lembretes automáticos 3) Exporte relatórios mensalmente 4) Integre Google Calendar 5) Use filtros nas buscas 6) Mantenha dados dos clientes atualizados!'
    }
    
    // Sistema inteligente de análise contextual
    if (message.includes('não') && (message.includes('funciona') || message.includes('carrega'))) {
      return '🔧 PROBLEMA IDENTIFICADO: Entendo que algo não está funcionando. Para te ajudar melhor, me informe: 1) Qual seção específica? (agenda, clientes, pagamentos...) 2) Que erro aparece? 3) Em que momento ocorre? Com essas informações, posso dar uma solução precisa!'
    }
    
    if (message.includes('arrastar') || message.includes('mover') || message.includes('reagendar')) {
      return '📅 ARRASTAR SESSÕES: Na agenda, para reagendar: 1) Clique e segure a sessão 2) Arraste para a nova data 3) Solte. DICA: Use as visualizações Dia/Semana/Mês para facilitar. Se não funcionar, verifique se a sessão não está bloqueada ou use o botão "Editar" (lápis).'
    }
    
    if (message.includes('piscando') || message.includes('pisca') || message.includes('tela') || message.includes('carregando')) {
      return '⚡ PROBLEMA DE CARREGAMENTO: Isso pode ser lentidão na conexão. Soluções: 1) Atualize a página (F5) 2) Limpe cache do navegador 3) Verifique internet 4) Se persiste, aguarde alguns segundos. O sistema sincroniza automaticamente.'
    }

    if (message.includes('google') && message.includes('erro')) {
      return '🔗 ERRO GOOGLE CALENDAR: Problemas comuns: 1) Reautorize: Configurações > Integrações > Desconectar > Conectar novamente 2) Verifique permissões no Google 3) Autorize acesso ao calendário. Se ainda não funcionar, pode ser configuração da API do Google.'
    }

    if (message.includes('sincroniz') || message.includes('tempo real') || message.includes('atualiz')) {
      return '🔄 SINCRONIZAÇÃO: O sistema atualiza automaticamente! Mudanças aparecem em segundos. Se não vê as alterações: 1) Aguarde 5 segundos 2) Atualize página (F5) 3) Verifique conexão. Todas as ações (criar, editar, excluir) sincronizam instantaneamente.'
    }

    // Resposta inteligente padrão com análise contextual
    return '🤖 ASSISTENTE INTELIGENTE: Analisei sua mensagem e posso te ajudar com qualquer funcionalidade do TherapyPro! Sobre o que precisa de ajuda? 📊 Dashboard, 📅 Agenda, 👥 Clientes, 💰 Pagamentos, 📊 Relatórios, ⚙️ Configurações, 📚 Estudos, 🔗 Integrações. Descreva o problema específico para uma solução personalizada!'
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
    const currentMessage = inputMessage
    setInputMessage('')
    setIsLoading(true)

    try {
      const responseText = await getBotResponse(currentMessage)
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isBot: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botResponse])
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro. Tente novamente.',
        isBot: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  // Salvar mensagens no localStorage
  useEffect(() => {
    localStorage.setItem('chatbot-messages', JSON.stringify(messages))
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-remover conversas antigas após inatividade
  useEffect(() => {
    const clearOldConversations = () => {
      const lastActivity = localStorage.getItem('chatbot-last-activity')
      if (lastActivity) {
        const timeDiff = Date.now() - parseInt(lastActivity)
        // Limpar após 30 minutos de inatividade
        if (timeDiff > 30 * 60 * 1000) {
          localStorage.removeItem('chatbot-messages')
          localStorage.removeItem('chatbot-last-activity')
          setMessages([{
            id: '1',
            text: 'Olá! Sou a assistente virtual do **TherapyPro**. Como posso **ajudá-lo**?',
            isBot: true,
            timestamp: new Date()
          }])
        }
      }
    }

    const interval = setInterval(clearOldConversations, 60000) // Verificar a cada minuto
    return () => clearInterval(interval)
  }, [])

  // Registrar atividade do usuário
  useEffect(() => {
    localStorage.setItem('chatbot-last-activity', Date.now().toString())
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
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  <div dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(message.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'))
                  }} />
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground p-2 rounded-lg text-sm">
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