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
  const { slug } = useParams<{ slug?: string }>()
  const { toast } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [clientData, setClientData] = useState({ nome: "", email: "", telefone: "", observacoes: "" })

  const loadTherapistData = useCallback(async () => {
    if (!slug) {
      setIsLoading(false)
      toast({ title: "Erro", description: "URL inválida. Verifique o link de agendamento.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      console.log('BookingPage: Chamando função RPC com slug:', slug);
      const result: any = await (supabase as any).rpc('get_public_profile_by_slug', { page_slug: slug });
      
      console.log('BookingPage: Resposta da função RPC:', result);

      if (result.error || !result.data) {
        console.error('BookingPage: Erro ou dados vazios:', result.error);
        throw new Error(`Configuração não encontrada para o slug: ${slug}`);
      }

      const jsonData = result.data as any;
      setConfig(jsonData.config);
      setProfile(jsonData.profile);
      
      console.log('BookingPage: Config carregado:', jsonData.config);
      console.log('BookingPage: Profile carregado:', jsonData.profile);
    } catch (error) {
      console.error('BookingPage: Erro geral ao buscar terapeuta:', error)
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
        setBookedSlots([])
        return
      }
      const date = new Date(selectedDate + 'T00:00:00')
      const dayName = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'][date.getDay()]
      if (!config.dias_atendimento_array.includes(dayName)) {
        setAvailableSlots([])
        setBookedSlots([])
        return
      }
      
      // Buscar sessões já agendadas para este dia
      const { data: bookedSessions } = await supabase
        .from('sessions')
        .select('horario')
        .eq('user_id', profile.user_id)
        .eq('data', selectedDate)
      
      const bookedTimes = bookedSessions?.map(s => s.horario) || []
      
      // Usar horários específicos por dia se disponível
      const horariosPorDia = config.horarios_por_dia || {};
      const horarioDoDia = horariosPorDia[dayName];
      
      const startTime = horarioDoDia?.inicio || config.horario_inicio || '08:00'
      const endTime = horarioDoDia?.fim || config.horario_fim || '18:00'
      const sessionDuration = parseInt(config.duracao_sessao || '50')
      const breakTime = parseInt(config.intervalo_sessoes || '10')
      const totalSlotTime = sessionDuration + breakTime
      
      // Gerar todos os slots dentro do range de horário
      const allSlots = []
      const availableSlots = []
      let [currentHour, currentMinute] = startTime.split(':').map(Number)
      
      while (true) {
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
        if (currentTimeStr >= endTime) break
        
        allSlots.push(currentTimeStr)
        if (!bookedTimes.includes(currentTimeStr)) {
          availableSlots.push(currentTimeStr)
        }
        
        const totalMinutes = (currentHour * 60) + currentMinute + totalSlotTime
        currentHour = Math.floor(totalMinutes / 60)
        currentMinute = totalMinutes % 60
      }
      
      setAvailableSlots(allSlots) // Mostra todos os slots
      setBookedSlots(bookedTimes) // Mantém lista de horários bloqueados
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
    <div className="min-h-screen bg-muted/40" style={{
      backgroundColor: config.background_color || undefined,
      backgroundImage: config.background_image ? `url(${config.background_image})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: config.brand_color || undefined
    }}>
      {config.custom_css && <style dangerouslySetInnerHTML={{ __html: config.custom_css }} />}
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Informações do Terapeuta */}
          <Card className="shadow-lg">
            <CardHeader className="text-center p-4 sm:p-6">
              {config.logo_url && (
                <img src={config.logo_url} alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full object-cover" />
              )}
              {profile.avatar_url && (
                <img src={profile.avatar_url} alt={profile.nome} className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full object-cover" />
              )}
              <CardTitle className="text-lg sm:text-xl lg:text-2xl" style={{ color: config.brand_color }}>
                {config.page_title || `${profile.nome}`}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {config.page_description || profile.bio || `${profile.profissao}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {profile.bio && (
                <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <Info className="w-4 h-4" />
                    Sobre
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}

              {profile.especialidade && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm sm:text-base">Especialidade</h3>
                  <Badge variant="secondary" className="text-xs sm:text-sm">{profile.especialidade}</Badge>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <CreditCard className="w-4 h-4" />
                  Formas de Pagamento
                </h3>
                
                {config.show_price && config.valor_padrao && (
                  <div className="p-3 sm:p-4 bg-primary/10 rounded-lg">
                    <p className="font-semibold text-primary text-sm sm:text-base">Valor da Sessão: R$ {config.valor_padrao.toFixed(2)}</p>
                    {config.show_duration && config.duracao_sessao && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">Duração: {config.duracao_sessao} minutos</p>
                    )}
                  </div>
                )}

                {config?.chave_pix && (
                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-semibold text-green-800 mb-2 text-sm sm:text-base">PIX</h3>
                    <p className="text-xs sm:text-sm text-green-700 break-all">Chave PIX: {config.chave_pix}</p>
                  </div>
                )}
                
                {config?.dados_bancarios && (
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Dados Bancários</h3>
                    <p className="text-xs sm:text-sm text-blue-700 whitespace-pre-line">{config.dados_bancarios}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {paymentMethods.map(method => (
                    <span key={method.key} className="px-2 sm:px-3 py-1 bg-primary/10 text-primary rounded-full text-xs sm:text-sm">
                      {method.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm sm:text-base">Contato</h3>
                <div className="space-y-2">
                  {config.email_contato_pacientes && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Mail className="w-4 h-4" />
                      <span className="break-all">{config.email_contato_pacientes}</span>
                    </div>
                  )}
                  {config.whatsapp_contato_pacientes && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Phone className="w-4 h-4" />
                      <span>{config.whatsapp_contato_pacientes}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Agendamento */}
          <Card className="shadow-lg">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Agendar Consulta</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Preencha seus dados para agendar uma sessão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm">Nome completo</Label>
                  <Input id="nome" value={clientData.nome} onChange={(e) => setClientData({ ...clientData, nome: e.target.value })} placeholder="Seu nome" className="text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <Input id="email" type="email" value={clientData.email} onChange={(e) => setClientData({ ...clientData, email: e.target.value })} placeholder="seu@email.com" className="text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-sm">Telefone (opcional)</Label>
                <Input id="telefone" value={clientData.telefone} onChange={(e) => setClientData({ ...clientData, telefone: e.target.value })} placeholder="(11) 99999-9999" className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm">Observações (opcional)</Label>
                <Textarea id="observacoes" value={clientData.observacoes} onChange={(e) => setClientData({ ...clientData, observacoes: e.target.value })} placeholder="Informações adicionais..." className="resize-none text-sm" />
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-sm sm:text-base">Escolha a Data</h3>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDates().length > 0 ? (
                      getAvailableDates().map(date => (
                        <SelectItem key={date.value} value={date.value} className="text-sm">{date.label}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>Não há datas disponíveis</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedDate && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm sm:text-base">Escolha o Horário</h3>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {availableSlots.map(time => {
                        const isBooked = bookedSlots.includes(time)
                        return (
                          <Button 
                            key={time} 
                            variant={selectedTime === time ? "default" : "outline"} 
                            onClick={() => !isBooked && setSelectedTime(time)}
                            disabled={isBooked}
                            className={`text-xs sm:text-sm h-8 sm:h-10 ${isBooked ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {time} {isBooked && '(Ocupado)'}
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center text-sm">Não há horários disponíveis para esta data.</p>
                  )}
                </div>
              )}
              {selectedDate && selectedTime && (
                <div className="space-y-4 pt-4 border-t">
                  <Button 
                    onClick={handleBooking} 
                    disabled={isBooking} 
                    className="w-full bg-gradient-primary hover:opacity-90 h-10 sm:h-12 text-sm sm:text-base"
                  >
                    {isBooking ? "Agendando..." : "Confirmar Agendamento"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {config.custom_footer && (
        <footer className="bg-background/80 backdrop-blur-sm border-t mt-8">
          <div className="container mx-auto px-4 py-4 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">{config.custom_footer}</p>
          </div>
        </footer>
      )}
    </div>
  )
}

export default BookingPage