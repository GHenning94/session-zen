import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router-dom"
import { useTheme } from "next-themes"
import { useColorTheme } from "@/hooks/useColorTheme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Clock, User, Info, CreditCard, DollarSign, Mail, Phone, CheckCircle, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"

const BookingPage = () => {
  const { slug } = useParams<{ slug?: string }>()
  const { toast } = useToast()
  const { setTheme } = useTheme()
  const { resetToDefaultColors } = useColorTheme()
  const [profile, setProfile] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [clientData, setClientData] = useState({ nome: "", email: "", telefone: "", observacoes: "" })
  const { avatarUrl } = useAvatarUrl(profile?.public_avatar_url)

  // Store and restore user's theme - only change for this page visit
  useEffect(() => {
    // Store the current theme before changing
    const storedTheme = localStorage.getItem('theme')
    const previousTheme = storedTheme || 'system'
    
    // Set light theme for public page and reset colors
    setTheme('light')
    resetToDefaultColors()
    
    // Restore the previous theme when leaving the page
    return () => {
      if (previousTheme && previousTheme !== 'light') {
        setTheme(previousTheme)
      }
    }
  }, [setTheme, resetToDefaultColors])

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
      
      // Gerar todos os slots de 30 em 30 minutos
      const allSlots = []
      let [currentHour, currentMinute] = startTime.split(':').map(Number)
      
      while (true) {
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`
        if (currentTimeStr >= endTime) break
        
        allSlots.push(currentTimeStr)
        
        // Incrementar 30 minutos
        const totalMinutes = (currentHour * 60) + currentMinute + 30
        currentHour = Math.floor(totalMinutes / 60)
        currentMinute = totalMinutes % 60
      }
      
      // Calcular slots bloqueados baseado nas sessões agendadas
      const blockedSlots = new Set<string>()
      
      bookedSessions?.forEach(session => {
        const sessionTime = session.horario
        const [sessionHour, sessionMinute] = sessionTime.split(':').map(Number)
        const sessionStartMinutes = sessionHour * 60 + sessionMinute
        
        // Bloquear slots considerando duração + intervalo antes e depois
        const totalBlockTime = sessionDuration + breakTime
        const startBlock = sessionStartMinutes - breakTime
        const endBlock = sessionStartMinutes + totalBlockTime
        
        // Marcar todos os slots que estão no range bloqueado
        allSlots.forEach(slot => {
          const [slotHour, slotMinute] = slot.split(':').map(Number)
          const slotMinutes = slotHour * 60 + slotMinute
          
          if (slotMinutes >= startBlock && slotMinutes < endBlock) {
            blockedSlots.add(slot)
          }
        })
      })
      
      // Filtrar slots disponíveis
      const availableSlots = allSlots.filter(slot => !blockedSlots.has(slot))
      
      setAvailableSlots(allSlots) // Mostra todos os slots
      setBookedSlots(Array.from(blockedSlots)) // Lista de horários bloqueados
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
      // Usar edge function segura ao invés de inserção direta
      const { data, error } = await supabase.functions.invoke('create-public-booking', {
        body: {
          slug: slug,
          clientData: {
            nome: clientData.nome,
            email: clientData.email,
            telefone: clientData.telefone,
            observacoes: clientData.observacoes
          },
          sessionData: {
            data: selectedDate,
            horario: selectedTime
          }
        }
      })

      if (error || !data?.success) {
        throw new Error(data?.error || 'Erro ao processar agendamento')
      }

      toast({ title: "Agendamento realizado!", description: "Sua sessão foi agendada com sucesso." })
      setClientData({ nome: "", email: "", telefone: "", observacoes: "" })
      setSelectedDate("")
      setSelectedTime("")
    } catch (error) {
      console.error('Erro ao agendar:', error)
      const errorMessage = error instanceof Error ? error.message : "Não foi possível realizar o agendamento."
      toast({ title: "Erro", description: errorMessage, variant: "destructive" })
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

  const paymentMethods = [{ key: 'aceita_pix', label: 'PIX' }, { key: 'aceita_cartao', label: 'Cartão' }, { key: 'aceita_transferencia', label: 'Transferência' }, { key: 'aceita_dinheiro', label: 'Dinheiro' }].filter(method => config[method.key])

  // Sanitize custom CSS to prevent injection attacks with whitelist approach
  const sanitizeCSS = (css: string): string => {
    if (!css) return '';
    
    // Enforce length limit to prevent DoS
    const MAX_CSS_LENGTH = 5000;
    if (css.length > MAX_CSS_LENGTH) {
      console.warn('[CSS Sanitization] CSS exceeds max length, truncating');
      css = css.substring(0, MAX_CSS_LENGTH);
    }
    
    // Whitelist of allowed CSS properties (safe for styling)
    const allowedProperties = new Set([
      'color', 'background-color', 'background', 'font-size', 'font-family', 'font-weight',
      'font-style', 'text-align', 'text-decoration', 'line-height', 'letter-spacing',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'border', 'border-radius', 'border-color', 'border-width', 'border-style',
      'border-top', 'border-right', 'border-bottom', 'border-left',
      'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
      'display', 'flex', 'flex-direction', 'justify-content', 'align-items', 'gap',
      'grid', 'grid-template-columns', 'grid-template-rows', 'grid-gap',
      'box-shadow', 'text-shadow', 'opacity', 'transition', 'transform',
      'cursor', 'overflow', 'visibility', 'list-style', 'list-style-type',
    ]);
    
    // Block dangerous CSS patterns
    const dangerousPatterns = [
      /url\s*\(/gi,           // External resource loading
      /@import/gi,            // External stylesheet loading
      /expression\s*\(/gi,    // IE expression() - code execution
      /behavior\s*:/gi,       // IE behavior - code execution
      /javascript\s*:/gi,     // JavaScript protocol
      /-moz-binding/gi,       // Firefox binding
      /vbscript\s*:/gi,       // VBScript protocol
      /data\s*:/gi,           // Data URIs
      /position\s*:\s*(fixed|absolute)/gi,  // Prevent overlay attacks
      /z-index\s*:/gi,        // Prevent layer manipulation
    ];
    
    let sanitized = css;
    
    // Remove dangerous patterns
    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '/* blocked */');
    });
    
    // Parse and filter CSS rules to only allow whitelisted properties
    const filteredRules: string[] = [];
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;
    
    while ((match = ruleRegex.exec(sanitized)) !== null) {
      const selector = match[1].trim();
      const declarations = match[2];
      
      // Filter declarations to only allowed properties
      const filteredDeclarations = declarations
        .split(';')
        .map(decl => decl.trim())
        .filter(decl => {
          if (!decl) return false;
          const property = decl.split(':')[0]?.trim().toLowerCase();
          return property && allowedProperties.has(property);
        })
        .join('; ');
      
      if (filteredDeclarations) {
        filteredRules.push(`${selector} { ${filteredDeclarations}; }`);
      }
    }
    
    return filteredRules.join('\n');
  };

  return (
    <div className="min-h-screen bg-muted/40" style={{
      backgroundColor: config.background_color || undefined,
      backgroundImage: config.background_image ? `url(${config.background_image})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: config.brand_color || undefined
    }}>
      {config.custom_css && <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(config.custom_css) }} />}
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Informações do Terapeuta */}
          <Card className="shadow-lg">
            <CardHeader className="text-center p-4 sm:p-6">
              {config.logo_url && (
                <img src={config.logo_url} alt="Logo" className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full object-cover" />
              )}
              {avatarUrl && config.show_photo && (
                <img 
                  src={avatarUrl} 
                  alt={profile.nome} 
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
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
                  <div className="p-3 sm:p-4 rounded-lg border" 
                       style={{ 
                         backgroundColor: 'hsl(142 71% 45% / 0.1)', 
                         borderColor: 'hsl(142 71% 45% / 0.3)' 
                       }}>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base" 
                        style={{ color: 'hsl(142 71% 35%)' }}>PIX</h3>
                    <p className="text-xs sm:text-sm break-all" 
                       style={{ color: 'hsl(142 71% 40%)' }}>Chave PIX: {config.chave_pix}</p>
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {selectedTime ? `Horário selecionado: ${selectedTime}` : "Ver horários disponíveis"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Horários Disponíveis</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto p-4">
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                            {availableSlots.map(time => {
                              const isBooked = bookedSlots.includes(time)
                              return (
                                <Button 
                                  key={time} 
                                  variant={selectedTime === time ? "default" : "outline"} 
                                  onClick={() => !isBooked && setSelectedTime(time)}
                                  disabled={isBooked}
                                  className={`text-sm h-10 ${isBooked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {time}
                                  {isBooked && <span className="block text-xs text-muted-foreground">(Ocupado)</span>}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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