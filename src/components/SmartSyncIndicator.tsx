import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Zap
} from "lucide-react"

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'syncing'

export const SmartSyncIndicator = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState<ConnectionStatus>('connected')
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncCount, setSyncCount] = useState(0)

  useEffect(() => {
    if (!user) return

    // Monitor da conexão do Supabase
    const channel = supabase.channel('sync_monitor')

    // Escutar mudanças em tempo real para detectar atividade
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          setStatus('syncing')
          setLastSync(new Date())
          setSyncCount(prev => prev + 1)
          
          // Voltar ao status conectado após 1 segundo
          setTimeout(() => {
            setStatus('connected')
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          setStatus('syncing')
          setLastSync(new Date())
          setSyncCount(prev => prev + 1)
          
          setTimeout(() => {
            setStatus('connected')
          }, 1000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          setStatus('syncing')
          setLastSync(new Date())
          setSyncCount(prev => prev + 1)
          
          setTimeout(() => {
            setStatus('connected')
          }, 1000)
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status)
        
        if (status === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('disconnected')
        }
      })

    // Monitor de conectividade
    const handleOnline = () => setStatus('connected')
    const handleOffline = () => setStatus('disconnected')

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Verificar conexão inicial
    if (!navigator.onLine) {
      setStatus('disconnected')
    }

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [user])

  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-3 h-3" />,
          color: 'default' as const,
          text: 'Conectado',
          description: 'Sistema sincronizado em tempo real'
        }
      case 'syncing':
        return {
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          color: 'default' as const,
          text: 'Sincronizando',
          description: 'Atualizando dados...'
        }
      case 'reconnecting':
        return {
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          color: 'secondary' as const,
          text: 'Reconectando',
          description: 'Tentando restabelecer conexão...'
        }
      case 'disconnected':
        return {
          icon: <WifiOff className="w-3 h-3" />,
          color: 'destructive' as const,
          text: 'Desconectado',
          description: 'Sem conexão com o servidor'
        }
    }
  }

  const statusInfo = getStatusInfo()

  const handleManualSync = () => {
    setStatus('syncing')
    setTimeout(() => {
      setStatus('connected')
      setLastSync(new Date())
    }, 1500)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 gap-2">
            <Badge variant={statusInfo.color} className="gap-1 text-xs py-0 px-2">
              {statusInfo.icon}
              {statusInfo.text}
            </Badge>
            {syncCount > 0 && (
              <span className="text-xs text-muted-foreground">
                <Zap className="w-3 h-3 inline mr-1" />
                {syncCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {statusInfo.icon}
              <span className="font-medium">{statusInfo.description}</span>
            </div>
            
            {lastSync && (
              <div className="text-xs text-muted-foreground">
                Última sincronização: {lastSync.toLocaleTimeString('pt-BR')}
              </div>
            )}
            
            {syncCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {syncCount} atualizações em tempo real
              </div>
            )}
            
            {status === 'disconnected' && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full h-6"
                onClick={handleManualSync}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Tentar reconectar
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}