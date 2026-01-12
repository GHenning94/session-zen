import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Clock, User, Info, CreditCard, DollarSign, Mail, Phone, CheckCircle, Calendar, Shield, Sparkles, Star, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"
import { getThemeStyles, TRUST_BADGES_CONFIG, DEFAULT_BLOCK_ORDER } from "@/utils/bookingThemes"

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
  const [policyConfirmed, setPolicyConfirmed] = useState(false)
  const { avatarUrl } = useAvatarUrl(profile?.public_avatar_url)

  // Store and restore user's theme - only change for this page visit
  useEffect(() => {
    // Get user's real theme from their cache, not the global 'theme' key which may be corrupted
    const authToken = localStorage.getItem('sb-supabase-auth-token')
    let userTheme = 'light'
    
    try {
      if (authToken) {
        const authData = JSON.parse(authToken)
        const userId = authData?.user?.id
        if (userId) {
          const cachedTheme = localStorage.getItem(`user-theme-cache_${userId}`)
          if (cachedTheme === 'dark' || cachedTheme === 'light') {
            userTheme = cachedTheme
          }
        }
      }
    } catch (e) {
      console.warn('Error reading user theme cache:', e)
    }
    
    // Save user's real theme to restore later
    localStorage.setItem('previous-page-theme', userTheme)
    
    // Apply light theme directly to DOM for public page
    const root = document.documentElement
    root.style.transition = 'none'
    root.classList.remove('dark')
    root.classList.add('light')
    root.setAttribute('data-theme', 'light')
    setTheme('light')
    resetToDefaultColors()
    requestAnimationFrame(() => {
      root.style.transition = ''
    })
    
    // Restore the previous theme when leaving the page
    return () => {
      const previousTheme = localStorage.getItem('previous-page-theme')
      if (previousTheme && previousTheme !== 'light') {
        const root = document.documentElement
        root.style.transition = 'none'
        root.classList.remove('light')
        root.classList.add(previousTheme)
        root.setAttribute('data-theme', previousTheme)
        setTheme(previousTheme as 'light' | 'dark')
        requestAnimationFrame(() => {
          root.style.transition = ''
        })
      }
      localStorage.removeItem('previous-page-theme')
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
      
      // Verificar limite diário de agendamentos (Premium)
      const maxDailyAppointments = config.max_daily_appointments
      if (maxDailyAppointments && bookedSessions && bookedSessions.length >= maxDailyAppointments) {
        setAvailableSlots([])
        setBookedSlots([])
        return
      }
      
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
      
      // Aplicar regra de antecedência mínima (Premium)
      const minAdvanceHours = config.min_advance_hours || 0
      if (minAdvanceHours > 0) {
        const now = new Date()
        const minAdvanceMs = minAdvanceHours * 60 * 60 * 1000
        
        allSlots.forEach(slot => {
          const [slotHour, slotMinute] = slot.split(':').map(Number)
          const slotDate = new Date(selectedDate + 'T00:00:00')
          slotDate.setHours(slotHour, slotMinute, 0, 0)
          
          if (slotDate.getTime() - now.getTime() < minAdvanceMs) {
            blockedSlots.add(slot)
          }
        })
      }
      
      // Filtrar slots disponíveis
      const filteredSlots = allSlots.filter(slot => !blockedSlots.has(slot))
      
      // Se ocultar horários preenchidos está ativo, mostrar apenas disponíveis
      if (config.hide_filled_slots) {
        setAvailableSlots(filteredSlots)
        setBookedSlots([])
      } else {
        setAvailableSlots(allSlots)
        setBookedSlots(Array.from(blockedSlots))
      }
    }
    loadAvailableSlots()
  }, [selectedDate, config, profile])

  const handleBooking = async () => {
    if (!clientData.nome || !clientData.email || !selectedDate || !selectedTime) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, email, data e horário.", variant: "destructive" })
      return
    }
    
    // Verificar confirmação de política (Premium)
    if (config.require_policy_confirmation && !policyConfirmed) {
      toast({ title: "Confirmação necessária", description: "Por favor, confirme que leu a política de cancelamento.", variant: "destructive" })
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

      // Mensagem pós-agendamento personalizada ou padrão
      const successMessage = config.post_booking_message || "Sua sessão foi agendada com sucesso."
      toast({ title: "Agendamento realizado!", description: successMessage })
      
      // Redirecionamento pós-agendamento (Premium)
      if (config.post_booking_redirect === 'external' && config.post_booking_url) {
        window.location.href = config.post_booking_url
        return
      }
      
      setClientData({ nome: "", email: "", telefone: "", observacoes: "" })
      setSelectedDate("")
      setSelectedTime("")
      setPolicyConfirmed(false)
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
    
    // Aplicar regra de dias máximos futuros (Premium)
    const maxFutureDays = config.max_future_days || 30
    
    for (let i = 0; i < maxFutureDays; i++) {
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

  // Obter estilos do tema - prioridade: tema visual > cores customizadas > padrão
  const hasVisualTheme = config.visual_theme && config.visual_theme !== 'minimal_clean'
  const hasCustomColors = !hasVisualTheme && (
    (config.background_color && config.background_color !== '#ffffff' && config.background_color !== '#f8fafc') ||
    (config.brand_color && config.brand_color !== '#0f172a')
  )
  const theme = getThemeStyles(hasVisualTheme ? config.visual_theme : (hasCustomColors ? undefined : 'minimal_clean'))
  
  // Determinar valores mínimos para "a partir de"
  const minValue = config.valor_primeira_consulta && config.valor_primeira_consulta < config.valor_padrao 
    ? config.valor_primeira_consulta 
    : config.valor_padrao

  // Verificar se é hoje para destacar
  const today = new Date().toISOString().split('T')[0]
  const isTodaySelected = selectedDate === today

  console.log("Config:", config);
  console.log("Profile:", profile);
  console.log("Visual Theme:", config.visual_theme);
  console.log("Theme Styles:", theme);

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

  // Determinar texto do botão de agendamento
  const ctaButtonText = config.cta_button_text || "Confirmar Agendamento"

  return (
    <div className="min-h-screen" style={{
      backgroundColor: hasVisualTheme 
        ? theme.background 
        : (hasCustomColors && config.background_color ? config.background_color : theme.background),
      backgroundImage: config.background_image ? `url(${config.background_image})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: hasVisualTheme 
        ? theme.text 
        : (hasCustomColors && config.brand_color ? config.brand_color : theme.text)
    }}>
      {config.custom_css && <style dangerouslySetInnerHTML={{ __html: sanitizeCSS(config.custom_css) }} />}
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 max-w-4xl">
        
        {/* Mensagem de Acolhimento (Premium) */}
        {config.welcome_message && (
          <div className="mb-6 p-4 rounded-lg text-center" style={{ 
            backgroundColor: hasCustomColors ? 'rgba(255,255,255,0.1)' : `${theme.accent}10`,
            borderColor: hasCustomColors ? undefined : theme.border 
          }}>
            <p className="text-sm sm:text-base italic" style={{ color: hasCustomColors ? undefined : theme.textMuted }}>
              "{config.welcome_message}"
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Informações do Terapeuta */}
          <Card className="shadow-lg" style={{ 
            backgroundColor: hasCustomColors ? undefined : theme.cardBackground,
            borderColor: hasCustomColors ? undefined : theme.border,
            color: hasCustomColors ? undefined : theme.text
          }}>
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
              {(config.show_page_title !== false) && (
                <CardTitle className="text-lg sm:text-xl lg:text-2xl" style={{ color: hasCustomColors ? config.brand_color : theme.text }}>
                  {config.page_title || `${profile.nome}`}
                </CardTitle>
              )}
              {(config.show_page_description !== false) && (
                <CardDescription className="text-sm sm:text-base" style={{ color: hasCustomColors ? undefined : theme.textMuted }}>
                  {config.page_description || profile.bio || `${profile.profissao}`}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {profile.bio && (config.show_bio !== false) && (
                <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: hasCustomColors ? 'rgba(0,0,0,0.05)' : `${theme.accent}08` }}>
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base" style={{ color: hasCustomColors ? undefined : theme.text }}>
                    <Info className="w-4 h-4" />
                    Sobre
                  </h3>
                  <p className="text-xs sm:text-sm" style={{ color: hasCustomColors ? undefined : theme.textMuted }}>{profile.bio}</p>
                </div>
              )}

              {profile.especialidade && (config.show_specialty !== false) && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm sm:text-base" style={{ color: hasCustomColors ? undefined : theme.text }}>Especialidade</h3>
                  <Badge variant="secondary" className="text-xs sm:text-sm" style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}>{profile.especialidade}</Badge>
                </div>
              )}

              {/* Selos de Confiança (Premium) */}
              {config.trust_badges && config.trust_badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.trust_badges.map((badgeId: string) => {
                    const badge = TRUST_BADGES_CONFIG[badgeId]
                    if (!badge) return null
                    return (
                      <div 
                        key={badgeId} 
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: `${theme.accent}10`, color: theme.accent }}
                      >
                        <span>{badge.icon}</span>
                        <span>{badge.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base" style={{ color: hasCustomColors ? undefined : theme.text }}>
                  <CreditCard className="w-4 h-4" />
                  Formas de Pagamento
                </h3>
                
                {/* Exibição "A partir de" (Premium) */}
                {config.show_starting_from_value && minValue && !config.show_values_after_selection && (
                  <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: `${theme.accent}10` }}>
                    <p className="font-semibold text-sm sm:text-base" style={{ color: theme.accent }}>
                      A partir de R$ {minValue.toFixed(2)}
                    </p>
                  </div>
                )}
                
                {/* Valor normal da sessão */}
                {!config.show_values_after_selection && !config.show_starting_from_value && (config.show_price !== false) && (config.show_session_value !== false) && config.valor_padrao && (
                  <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: `${theme.accent}10` }}>
                    <p className="font-semibold text-sm sm:text-base" style={{ color: theme.accent }}>Valor da Sessão: R$ {config.valor_padrao.toFixed(2)}</p>
                    {config.show_duration && config.duracao_sessao && (
                      <p className="text-xs sm:text-sm mt-1" style={{ color: theme.textMuted }}>Duração: {config.duracao_sessao} minutos</p>
                    )}
                  </div>
                )}

                {/* Primeira Consulta com destaque (Premium) */}
                {!config.show_values_after_selection && (config.show_first_consultation_value !== false) && config.valor_primeira_consulta && (
                  <div 
                    className={`p-3 sm:p-4 rounded-lg border ${config.highlight_first_consultation || config.emphasize_first_consultation ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ 
                      backgroundColor: `${theme.accent}05`,
                      borderColor: `${theme.accent}30`,
                      '--tw-ring-color': theme.accent
                    } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-2">
                      {(config.highlight_first_consultation || config.emphasize_first_consultation) && (
                        <Sparkles className="w-4 h-4" style={{ color: theme.accent }} />
                      )}
                      <p className="font-semibold text-sm sm:text-base" style={{ color: theme.accent }}>
                        Valor da 1ª Consulta: R$ {config.valor_primeira_consulta.toFixed(2)}
                      </p>
                    </div>
                    {(config.highlight_first_consultation || config.emphasize_first_consultation) && (
                      <Badge variant="outline" className="mt-2 text-xs" style={{ borderColor: theme.accent, color: theme.accent }}>
                        <Star className="w-3 h-3 mr-1" /> Oferta especial
                      </Badge>
                    )}
                  </div>
                )}

                {(config.show_pix_key !== false) && config?.chave_pix && (
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
                
                {(config.show_bank_details !== false) && config?.dados_bancarios && (
                  <div className="p-3 sm:p-4 rounded-lg border" style={{ 
                    backgroundColor: `${theme.accent}08`,
                    borderColor: `${theme.accent}20`
                  }}>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base" style={{ color: theme.accent }}>Dados Bancários</h3>
                    <p className="text-xs sm:text-sm whitespace-pre-line" style={{ color: theme.textMuted }}>{config.dados_bancarios}</p>
                  </div>
                )}

                {(config.show_payment_methods !== false) && paymentMethods.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map(method => (
                      <span 
                        key={method.key} 
                        className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm"
                        style={{ backgroundColor: `${theme.accent}10`, color: theme.accent }}
                      >
                        {method.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contato */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm sm:text-base" style={{ color: hasCustomColors ? undefined : theme.text }}>Contato</h3>
                <div className="space-y-2">
                  {config.email_contato_pacientes && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: hasCustomColors ? undefined : theme.textMuted }}>
                      <Mail className="w-4 h-4" />
                      <span className="break-all">{config.email_contato_pacientes}</span>
                    </div>
                  )}
                  {config.whatsapp_contato_pacientes && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: hasCustomColors ? undefined : theme.textMuted }}>
                      <Phone className="w-4 h-4" />
                      <span>{config.whatsapp_contato_pacientes}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Agendamento */}
          <Card className="shadow-lg" style={{ 
            backgroundColor: hasCustomColors ? undefined : theme.cardBackground,
            borderColor: hasCustomColors ? undefined : theme.border,
            color: hasCustomColors ? undefined : theme.text
          }}>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl" style={{ color: hasCustomColors ? config.brand_color : theme.text }}>
                Agendar Consulta
              </CardTitle>
              <CardDescription className="text-sm sm:text-base" style={{ color: hasCustomColors ? undefined : theme.textMuted }}>
                Preencha seus dados para agendar uma sessão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
              {/* Observações Antes do Agendamento (Premium) */}
              {config.show_pre_booking_notes && config.pre_booking_notes && (
                <div className="p-3 rounded-lg border" style={{ 
                  backgroundColor: `${theme.accent}05`,
                  borderColor: `${theme.accent}20`
                }}>
                  <p className="text-xs sm:text-sm" style={{ color: theme.textMuted }}>
                    {config.pre_booking_notes}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-sm" style={{ color: hasCustomColors ? undefined : theme.text }}>Nome completo</Label>
                  <Input 
                    id="nome" 
                    value={clientData.nome} 
                    onChange={(e) => setClientData({ ...clientData, nome: e.target.value })} 
                    placeholder="Seu nome" 
                    className="text-sm"
                    style={{ 
                      backgroundColor: hasCustomColors ? undefined : theme.cardBackground,
                      borderColor: hasCustomColors ? undefined : theme.border,
                      color: hasCustomColors ? undefined : theme.text
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm" style={{ color: hasCustomColors ? undefined : theme.text }}>Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={clientData.email} 
                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })} 
                    placeholder="seu@email.com" 
                    className="text-sm"
                    style={{ 
                      backgroundColor: hasCustomColors ? undefined : theme.cardBackground,
                      borderColor: hasCustomColors ? undefined : theme.border,
                      color: hasCustomColors ? undefined : theme.text
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone" className="text-sm" style={{ color: hasCustomColors ? undefined : theme.text }}>Telefone (opcional)</Label>
                <Input 
                  id="telefone" 
                  value={clientData.telefone} 
                  onChange={(e) => setClientData({ ...clientData, telefone: e.target.value })} 
                  placeholder="(11) 99999-9999" 
                  className="text-sm"
                  style={{ 
                    backgroundColor: hasCustomColors ? undefined : theme.cardBackground,
                    borderColor: hasCustomColors ? undefined : theme.border,
                    color: hasCustomColors ? undefined : theme.text
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm" style={{ color: hasCustomColors ? undefined : theme.text }}>Observações (opcional)</Label>
                <Textarea 
                  id="observacoes" 
                  value={clientData.observacoes} 
                  onChange={(e) => setClientData({ ...clientData, observacoes: e.target.value })} 
                  placeholder="Informações adicionais..." 
                  className="resize-none text-sm"
                  style={{ 
                    backgroundColor: hasCustomColors ? undefined : theme.cardBackground,
                    borderColor: hasCustomColors ? undefined : theme.border,
                    color: hasCustomColors ? undefined : theme.text
                  }}
                />
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-sm sm:text-base" style={{ color: hasCustomColors ? undefined : theme.text }}>Escolha a Data</h3>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="text-sm" style={{ 
                    backgroundColor: hasCustomColors ? undefined : theme.cardBackground,
                    borderColor: hasCustomColors ? undefined : theme.border,
                    color: hasCustomColors ? undefined : theme.text
                  }}>
                    <SelectValue placeholder="Selecione uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableDates().length > 0 ? (
                      getAvailableDates().map(date => (
                        <SelectItem key={date.value} value={date.value} className="text-sm">
                          {date.label}
                          {date.value === today && config.highlight_available_today && (
                            <Badge variant="secondary" className="ml-2 text-xs">Hoje</Badge>
                          )}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>Não há datas disponíveis</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedDate && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm sm:text-base" style={{ color: hasCustomColors ? undefined : theme.text }}>Escolha o Horário</h3>
                  {availableSlots.length > 0 ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-full flex items-center gap-2"
                          style={{ 
                            borderColor: hasCustomColors ? undefined : theme.border,
                            color: hasCustomColors ? undefined : theme.text
                          }}
                        >
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
                                  style={selectedTime === time ? { 
                                    backgroundColor: theme.buttonBg,
                                    color: theme.buttonText
                                  } : undefined}
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
                    <p className="text-center text-sm" style={{ color: hasCustomColors ? undefined : theme.textMuted }}>
                      Não há horários disponíveis para esta data.
                    </p>
                  )}
                </div>
              )}
              
              {/* Política de Cancelamento (Premium) */}
              {config.cancellation_policy && selectedDate && selectedTime && (
                <div className="p-3 rounded-lg border" style={{ 
                  backgroundColor: `${theme.accent}05`,
                  borderColor: `${theme.accent}20`
                }}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: theme.accent }} />
                    <div>
                      <p className="text-xs sm:text-sm font-medium" style={{ color: theme.text }}>
                        Política de Cancelamento
                      </p>
                      <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                        {config.cancellation_policy}
                      </p>
                    </div>
                  </div>
                  {config.require_policy_confirmation && (
                    <div className="flex items-center gap-2 mt-3">
                      <Checkbox 
                        id="policy-confirm"
                        checked={policyConfirmed}
                        onCheckedChange={(checked) => setPolicyConfirmed(checked === true)}
                      />
                      <Label htmlFor="policy-confirm" className="text-xs cursor-pointer" style={{ color: theme.textMuted }}>
                        Li e concordo com a política de cancelamento
                      </Label>
                    </div>
                  )}
                </div>
              )}
              
              {selectedDate && selectedTime && (
                <div className="space-y-4 pt-4 border-t" style={{ borderColor: hasCustomColors ? undefined : theme.border }}>
                  <Button 
                    onClick={handleBooking} 
                    disabled={isBooking || (config.require_policy_confirmation && !policyConfirmed)} 
                    className="w-full h-10 sm:h-12 text-sm sm:text-base"
                    style={{ 
                      backgroundColor: theme.buttonBg,
                      color: theme.buttonText
                    }}
                  >
                    {isBooking ? "Agendando..." : ctaButtonText}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {config.custom_footer && (
        <footer 
          className="mt-8 border-t"
          style={{ 
            backgroundColor: config.footer_bg_color || theme.cardBackground,
            borderTopColor: config.footer_bg_color ? `${config.footer_bg_color}20` : theme.border
          }}
        >
          <div className="container mx-auto px-4 py-4 text-center">
            <p 
              className="text-xs sm:text-sm"
              style={{ color: config.footer_text_color || theme.textMuted }}
            >
              {config.custom_footer}
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}

export default BookingPage
