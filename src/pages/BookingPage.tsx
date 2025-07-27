import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Info, CreditCard, DollarSign, Mail, Phone, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

const BookingPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const { toast } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [clientData, setClientData] = useState({ nome: "", email: "", telefone: "", observacoes: "" })

  const loadTherapistData = useCallback(async () => {
    if (!slug) {
      setIsLoading(false)
      toast({ title: "Erro", description: "URL inválida. Verifique o link de agendamento.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const { data: configData, error: configError } = await supabase.from('configuracoes').select('*').eq('slug', slug).single()
      if (configError || !configData) {
        throw new Error(`Configuração não encontrada para o slug: ${slug}. Verifique se o slug está salvo corretamente.`)
      }
      setConfig(configData)

      const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('user_id', configData.user_id).single()
      if (profileError || !profileData) {
        throw new Error(`Perfil não encontrado para o user_id associado ao slug: ${slug}`)
      }
      setProfile(profileData)
    } catch (error) {
      console.error('Erro ao buscar terapeuta:', error)
      setConfig(null)
      setProfile(null)
      toast({ title: "Erro", description: `Perfil não encontrado. Certifique-se de que o slug '${slug}' está correto e salvo na tabela 'configuracoes'.`, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [slug, toast])

  useEffect(() => { loadTherapistData() }, [loadTherapistData])

  useEffect(() => {
    const loadAvailableSlots = async () => {
      if (!selectedDate || !config?.dias_atendimento_array || !profile) {
        setAvailableSlots([])
        return
      }
      const date = new Date(selectedDate + 'T00:00:00')
      const dayName = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'][date.getDay()]
      if (!config.dias_atendimento_array.includes(dayName)) {
        setAvailableSlots([])
        return
      }
      const { data: bookedSessions } = await supabase.from('sessions').select('horario').eq('user_id', profile.user_id).eq('data', selectedDate)
      const startTime = config.horario_inicio || '08:00'
      const endTime = config.horario_fim || '18:00'
      const sessionDuration = parseInt(config.duracao_sessao || '50')
      const breakTime = parseInt(config.intervalo_sessoes || '10')
      const totalSlotTime = sessionDuration + breakTime
      const slots = []
      let [currentHour, currentMinute] = startTime.split(':').map(Number)
      while (true) {
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
        if (currentTimeStr >= endTime) break
        const isBooked = bookedSessions?.some(session => session.horario === currentTimeStr)
        if (!isBooked) slots.push(currentTimeStr)
        const totalMinutes = (currentHour * 60) + currentMinute + totalSlotTime
        currentHour = Math.floor(totalMinutes / 60)
        currentMinute = totalMinutes % 60
      }
      setAvailableSlots(slots)
    }
    loadAvailableSlots()
  }, [selectedDate, config, profile])

  const handleBooking = async () => {
    if (!clientData.nome || !clientData.email || !selectedDate || !selectedTime) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, email, data e horário.", variant: "destructive" })
      return
    }
    setIsBooking(true)
    try {
      const { data: newClient } = await supabase.from('clients').insert([{ user_id: profile.user_id, nome: clientData.nome, email: clientData.email, telefone: clientData.telefone, dados_clinicos: clientData.observacoes }]).select().single()
      if (!newClient) throw new Error("Falha ao criar cliente");
      
      await supabase.from('sessions').insert([{ user_id: profile.user_id, client_id: newClient.id, data: selectedDate, horario: selectedTime, status: 'agendada', valor: config.valor_padrao || 0 }])
      toast({ title: "Agendamento realizado!", description: "Sua sessão foi agendada com sucesso." })
      setClientData({ nome: "", email: "", telefone: "", observacoes: "" })
      setSelectedDate("")
      setSelectedTime("")
    } catch (error) {
      console.error('Erro ao agendar:', error)
      toast({ title: "Erro", description: "Não foi possível realizar o agendamento.", variant: "destructive" })
    } finally {
      setIsBooking(false)
    }
  }

  const getAvailableDates = () => {
    if (!config?.dias_atendimento_array) return []
    const dates = []
    const today = new Date()
    const dayMap: { [key: string]: number } = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6 }
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === date.getDay())
      if (dayName && config.dias_atendimento_array.includes(dayName)) {
        dates.push({ value: date.toISOString().split('T')[0], label: date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) })
      }
    }
    return dates
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>
  if (!profile || !config) return <div className="min-h-screen flex items-center justify-center"><p>Perfil não encontrado.</p></div>

  console.log("Config:", config);
  console.log("Profile:", profile);

  const paymentMethods = [{ key: 'aceita_pix', label: 'Pix' }, { key: 'aceita_cartao', label: 'Cartão de Crédito' }, { key: 'aceita_transferencia', label: 'Transferência' }, { key: 'aceita_dinheiro', label: 'Dinheiro' }].filter(method => config[method.key])

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">{config.page_title || 'Agendar Consulta'}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{config.page_description || `Agende sua consulta com ${profile.nome}`}</p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center"><User className="w-10 h-10 text-white" /></div>
              <div className="text-left">
                <h2 className="text-2xl font-semibold">{profile.nome}</h2>
                <p className="text-muted-foreground capitalize">{profile.profissao}{profile.especialidade ? ` - ${profile.especialidade}` : ''}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">{config.show_duration && <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>{config.duracao_sessao || '50'} minutos</span></div>}</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {profile.bio && (<Card><CardHeader><CardTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-primary"/>Sobre</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p></CardContent></Card>)}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary"/>Contato e Credenciais</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {config.email_contato_pacientes && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4"/>{config.email_contato_pacientes}</div>}
              {profile.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4"/>{profile.telefone}</div>}
              {profile.crp && <div className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4"/>{profile.crp}</div>}
            </CardContent>
          </Card>
          {config.show_price && (<Card><CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary"/>Valores</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{config.valor_primeira_consulta && <div className="flex justify-between"><span>Primeira consulta:</span><strong>R$ {Number(config.valor_primeira_consulta).toFixed(2)}</strong></div>}{config.valor_padrao && <div className="flex justify-between"><span>Consulta:</span><strong>R$ {Number(config.valor_padrao).toFixed(2)}</strong></div>}</CardContent></Card>)}
          {paymentMethods.length > 0 && (<Card><CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary"/>Formas de Pagamento</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{paymentMethods.map(method => <Badge key={method.key} variant="secondary">{method.label}</Badge>)}</CardContent></Card>)}
        </div>
        
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Agendar Consulta</CardTitle><CardDescription>Preencha seus dados para agendar</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Seus Dados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="nome">Nome *</Label><Input id="nome" value={clientData.nome} onChange={(e) => setClientData({...clientData, nome: e.target.value})} /></div>
                  <div className="space-y-2"><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={clientData.email} onChange={(e) => setClientData({...clientData, email: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="telefone">Telefone</Label><Input id="telefone" value={clientData.telefone} onChange={(e) => setClientData({...clientData, telefone: e.target.value})} /></div>
                <div className="space-y-2"><Label htmlFor="observacoes">Observações</Label><Textarea id="observacoes" value={clientData.observacoes} onChange={(e) => setClientData({...clientData, observacoes: e.target.value})} rows={3} /></div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold">Escolha a Data</h3>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDates().length > 0 ? (
                      getAvailableDates().map(date => (
                        <SelectItem key={date.value} value={date.value}>{date.label}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>Não há datas disponíveis</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedDate && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Escolha o Horário</h3>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {availableSlots.map(time => (
                        <Button key={time} variant={selectedTime === time ? "default" : "outline"} onClick={() => setSelectedTime(time)}>{time}</Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center">Não há horários disponíveis para esta data.</p>
                  )}
                </div>
              )}
              {selectedDate && selectedTime && (
                <div className="space-y-4pt-4 border-t">
                  <Button onClick={handleBooking} disabled={isBooking} className="w-full bg-gradient-primary hover:opacity-90 h-12">
                    {isBooking ? "Agendando..." : "Confirmar Agendamento"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
export default BookingPage