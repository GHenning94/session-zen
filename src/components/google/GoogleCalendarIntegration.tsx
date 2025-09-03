import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { useToast } from "@/hooks/use-toast"
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar"
import { PlanProtection } from "@/components/PlanProtection"
import { UnsyncButton } from "@/components/UnsyncButton"
import { supabase } from "@/integrations/supabase/client"
import { 
  Calendar,
  Clock,
  MapPin,
  Users,
  Link,
  RefreshCw,
  Download,
  CheckCircle,
  Crown,
  AlertCircle
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const GoogleCalendarIntegration = () => {
  const { user } = useAuth()
  const { hasFeature } = useSubscription()
  const { toast } = useToast()
  const {
    isSignedIn,
    events,
    loading,
    connectToGoogle,
    disconnectFromGoogle,
    loadEvents
  } = useGoogleCalendar()
  const [syncing, setSyncing] = useState<string | null>(null)

  // Sincronizar evento específico com o sistema
  const syncEventToSystem = async (event: any) => {
    if (!user) return

    // Prevenir múltiplas sincronizações simultâneas
    if (syncing) return

    setSyncing(event.id)
    try {
      toast({
        title: "Sincronizando...",
        description: `Importando "${event.summary}" para o sistema...`,
      })

      // Extrair dados do evento do Google
      const startDateTime = event.start.dateTime || event.start.date
      const endDateTime = event.end.dateTime || event.end.date
      
      const eventDate = new Date(startDateTime).toISOString().split('T')[0]
      const eventTime = event.start.dateTime 
        ? format(new Date(startDateTime), "HH:mm")
        : "09:00" // Default para eventos de dia inteiro

      // Extrair nome do cliente do título (assumindo formato "Consulta - Nome do Cliente")
      let clientName = event.summary
      if (event.summary.includes(' - ')) {
        clientName = event.summary.split(' - ')[1] || event.summary
      }

      // Extrair email do primeiro participante
      const clientEmail = event.attendees?.[0]?.email || ''

      // Criar ou encontrar cliente
      let clientId = null
      if (clientEmail) {
        // Verificar se cliente já existe
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .eq('email', clientEmail)
          .single()

        if (existingClient) {
          clientId = existingClient.id
        } else {
          // Criar novo cliente
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert([{
              user_id: user.id,
              nome: clientName,
              email: clientEmail,
              telefone: '',
              dados_clinicos: event.description || ''
            }])
            .select()
            .single()

          if (clientError) throw clientError
          clientId = newClient.id
        }
      } else {
        // Criar cliente temporário sem email
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([{
            user_id: user.id,
            nome: clientName,
            email: '',
            telefone: '',
            dados_clinicos: event.description || 'Importado do Google Calendar'
          }])
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      // Criar sessão
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          user_id: user.id,
          client_id: clientId,
          data: eventDate,
          horario: eventTime,
          status: 'agendada',
          anotacoes: `Importado do Google Calendar\nLocal: ${event.location || 'Não especificado'}\nLink: ${event.htmlLink}`
        }])

      if (sessionError) throw sessionError

      toast({
        title: "Evento sincronizado!",
        description: `"${event.summary}" foi adicionado ao seu sistema com sucesso.`,
      })
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      toast({
        title: "Erro",
        description: "Não foi possível sincronizar o evento. Verifique se já não existe uma sessão neste horário.",
        variant: "destructive"
      })
    } finally {
      // Pequeno delay para evitar conflitos visuais
      setTimeout(() => {
        setSyncing(null)
      }, 500)
    }
  }

  const formatEventDateTime = (start: any, end: any) => {
    if (start.dateTime && end.dateTime) {
      const startDate = new Date(start.dateTime)
      const endDate = new Date(end.dateTime)
      
      return {
        date: format(startDate, "dd 'de' MMMM", { locale: ptBR }),
        time: `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`
      }
    }
    
    if (start.date) {
      return {
        date: format(new Date(start.date), "dd 'de' MMMM", { locale: ptBR }),
        time: "Dia inteiro"
      }
    }
    
    return { date: "", time: "" }
  }

  return (
    <PlanProtection feature="hasAdvancedSettings">
      <div className="space-y-6">
        {/* Status da Conexão */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Google Agenda
              <Crown className="w-4 h-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full`} 
                     style={{ backgroundColor: isSignedIn ? '#22c55e' : '#d1d5db' }} />
                <div>
                  <p className="font-medium">
                    {isSignedIn ? 'Conectado' : 'Não conectado'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isSignedIn 
                      ? 'Sua agenda do Google está sincronizada' 
                      : 'Conecte para visualizar e sincronizar eventos'
                    }
                  </p>
                </div>
              </div>
              
              {isSignedIn ? (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={loadEvents}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Sincronizar tudo
                  </Button>
                  <UnsyncButton onSuccess={loadEvents} />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      // Limpar eventos importados sem desconectar
                      try {
                        const { data: sessionsToDelete } = await supabase
                          .from('sessions')
                          .select('id')
                          .eq('user_id', user?.id)
                          .like('anotacoes', '%Importado do Google Calendar%')

                        if (sessionsToDelete && sessionsToDelete.length > 0) {
                          await supabase
                            .from('sessions')
                            .delete()
                            .eq('user_id', user?.id)
                            .like('anotacoes', '%Importado do Google Calendar%')
                          
                          toast({
                            title: "Eventos removidos",
                            description: `${sessionsToDelete.length} eventos importados foram removidos do sistema.`,
                          })
                        } else {
                          toast({
                            title: "Nenhum evento encontrado",
                            description: "Não há eventos importados do Google Calendar para remover.",
                          })
                        }
                      } catch (error) {
                        toast({
                          title: "Erro",
                          description: "Não foi possível remover os eventos importados.",
                          variant: "destructive"
                        })
                      }
                    }}
                  >
                    Limpar importações
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={connectToGoogle}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Link className="w-4 h-4 mr-2" />
                  )}
                  Conectar Google
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Eventos */}
        {isSignedIn && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Eventos do Google Agenda</span>
                <Badge variant="secondary">
                  {events.length} eventos
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Carregando eventos...</span>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum evento encontrado</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {events.map((event) => {
                      const { date, time } = formatEventDateTime(event.start, event.end)
                      
                      return (
                        <div key={event.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium mb-2">{event.summary}</h3>
                              
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{date}</span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{time}</span>
                                </div>
                                
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                
                                {event.attendees && event.attendees.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span>
                                      {event.attendees.map(a => a.displayName || a.email).join(', ')}
                                    </span>
                                  </div>
                                )}
                                
                                {event.description && (
                                  <p className="text-xs mt-2 p-2 bg-accent/50 rounded">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                size="sm"
                                onClick={() => syncEventToSystem(event)}
                                disabled={syncing === event.id}
                                className="whitespace-nowrap"
                              >
                                {syncing === event.id ? (
                                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4 mr-2" />
                                )}
                                Sincronizar
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(event.htmlLink, '_blank')}
                              >
                                <Link className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informações sobre a Integração */}
        <Card className="shadow-soft border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-700 dark:text-gray-100 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-gray-50">Como funciona a integração</h4>
                <ul className="text-sm text-gray-700 dark:text-gray-100 space-y-1">
                  <li>• Visualize todos os seus eventos do Google Agenda</li>
                  <li>• Sincronize eventos específicos com um clique</li>
                  <li>• Os dados dos participantes são importados automaticamente</li>
                  <li>• Mantenha suas agendas sempre em sincronia</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlanProtection>
  )
}

export default GoogleCalendarIntegration