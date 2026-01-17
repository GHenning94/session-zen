import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Clock, User, Calendar, FileText, Filter, StickyNote, MoreHorizontal, Edit2, X, Eye, CreditCard, AlertTriangle, Trash2, Plus, Package, Repeat, PenLine, CheckSquare, ChevronDown, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { formatCurrencyBR, formatTimeBR, formatDateBR } from '@/utils/formatters'
import { SessionNoteModal } from '@/components/SessionNoteModal'
import { SessionNoteViewModal } from '@/components/SessionNoteViewModal'
import { SessionNoteReadOnlyModal } from '@/components/SessionNoteReadOnlyModal'
import { SessionModal } from '@/components/SessionModal'
import { SessionEditModal } from '@/components/SessionEditModal'
import { SessionDetailsModal } from '@/components/SessionDetailsModal'
import { Skeleton } from '@/components/ui/skeleton'
import { EvolucaoModal } from '@/components/EvolucaoModal'
import { cn } from '@/lib/utils'
import { calculateSessionStatus, sessionNeedsAttention } from "@/utils/sessionStatusUtils"
import { TextPreview } from '@/components/TextPreview'
import DOMPurify from 'dompurify'
import { ClientAvatar } from '@/components/ClientAvatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PulsingDot } from '@/components/ui/pulsing-dot'
import { GoogleSyncBadge } from '@/components/google/GoogleSyncBadge'
import { BatchSelectionBar, SelectableItemCheckbox } from '@/components/BatchSelectionBar'
import { BatchEditByTypeModal, BatchEditChanges } from '@/components/BatchEditByTypeModal'
import { recalculateMultiplePackages } from '@/utils/packageUtils'
import { decryptSensitiveDataBatch } from '@/utils/encryptionMiddleware'

interface Session {
  id: string
  data: string
  horario: string
  status: string
  valor?: number
  anotacoes?: string
  client_id: string
  package_id?: string
  recurring_session_id?: string
  google_sync_type?: string
  google_event_id?: string
  metodo_pagamento?: string
  unlinked_from_recurring?: boolean
  user_id?: string
  clients?: {
    nome: string
    avatar_url?: string
    medicamentos?: string[]
    eh_crianca_adolescente?: boolean
  }
  packages?: {
    nome?: string
    metodo_pagamento?: string
  }
  recurring_sessions?: {
    metodo_pagamento?: string
  }
  avatar_signed_url?: string
}

interface SessionNote {
  id: string
  client_id: string
  session_id: string
  notes: string
  created_at: string
  clients?: {
    nome: string
    avatar_url?: string
  }
  sessions?: {
    data: string
    horario: string
    status: string
  }
}

export default function Sessoes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Estados principais
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([])
  const [evolucoes, setEvolucoes] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sessions' | 'notes'>('sessions')
  
  // Estados para modais
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [newSessionModalOpen, setNewSessionModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [evolucaoModalOpen, setEvolucaoModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null)
  const [viewingNote, setViewingNote] = useState<SessionNote | null>(null)
  const [noteViewModalOpen, setNoteViewModalOpen] = useState(false)
  const [noteReadOnlyModalOpen, setNoteReadOnlyModalOpen] = useState(false)
  const [readOnlyNote, setReadOnlyNote] = useState<SessionNote | null>(null)
  const [selectedNoteForEvolucao, setSelectedNoteForEvolucao] = useState<SessionNote | null>(null)
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null)
  const [evolucaoExistenteDialogOpen, setEvolucaoExistenteDialogOpen] = useState(false)
  
  // Estado para seleção em lote
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [batchEditModalOpen, setBatchEditModalOpen] = useState(false)
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    startDate: '',
    endDate: '',
    search: '',
    sessionType: '',
    googleSync: '',
    timeframe: 'all', // 'all' | 'past' | 'future' | 'needs_attention'
  })
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.status && filters.status !== 'all') count++
    if (filters.client && filters.client !== 'all') count++
    if (filters.startDate) count++
    if (filters.endDate) count++
    if (filters.search) count++
    if (filters.sessionType && filters.sessionType !== 'all') count++
    if (filters.googleSync && filters.googleSync !== 'all') count++
    if (filters.timeframe && filters.timeframe !== 'all') count++
    return count
  }, [filters])

  // Handle URL parameter for editing session
  useEffect(() => {
    const editSessionId = searchParams.get('edit')
    if (editSessionId && sessions.length > 0) {
      const sessionToEdit = sessions.find(s => s.id === editSessionId)
      if (sessionToEdit) {
        setSelectedSession(sessionToEdit)
        setEditModalOpen(true)
        // Clear the URL parameter
        setSearchParams({})
      }
    }
  }, [searchParams, sessions])

  // Handle URL parameter for viewing session details modal
  useEffect(() => {
    const sessaoParam = searchParams.get('sessao')
    if (sessaoParam && sessions.length > 0) {
      const sessionToView = sessions.find(s => s.id === sessaoParam)
      if (sessionToView) {
        setSelectedSession(sessionToView)
        setDetailsModalOpen(true)
        // Clear the URL parameter
        const newParams = new URLSearchParams(searchParams)
        newParams.delete('sessao')
        setSearchParams(newParams)
      }
    }
  }, [searchParams, sessions])

  // Handle URL parameter for filtering needs_attention sessions
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam === 'needs_attention') {
      setFilters(prev => ({ ...prev, timeframe: 'needs_attention' }))
      setIsFiltersOpen(true)
      // Clear the URL parameter
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('filter')
      setSearchParams(newParams)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // Refetch on page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        loadData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  // Listen for recurring session updates from other components
  useEffect(() => {
    const handleRecurringUpdate = () => {
      loadData()
    }
    window.addEventListener('recurringSessionUpdated', handleRecurringUpdate)
    return () => window.removeEventListener('recurringSessionUpdated', handleRecurringUpdate)
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Execute all queries in parallel for faster loading
      const [sessionsResult, notesResult, evolucoesResult, clientsResult, packagesResult] = await Promise.all([
        // Carregar sessões (campos otimizados)
        supabase
          .from('sessions')
          .select(`
            id, data, horario, status, valor, anotacoes, client_id, package_id, recurring_session_id,
            metodo_pagamento, session_type, google_event_id, google_sync_type, created_at, updated_at,
            unlinked_from_recurring, user_id,
            clients (nome, ativo, avatar_url, medicamentos, eh_crianca_adolescente),
            packages:package_id (nome, metodo_pagamento),
            recurring_sessions:recurring_session_id (metodo_pagamento, billing_type)
          `)
          .order('data', { ascending: false })
          .order('horario', { ascending: false }),
        
        // Carregar anotações (campos otimizados)
        supabase
          .from('session_notes')
          .select(`
            id, notes, created_at, session_id, client_id, is_private,
            clients (nome, avatar_url),
            sessions (data, horario, status)
          `)
          .order('created_at', { ascending: false }),
        
        // Carregar evoluções (apenas session_id para verificar linkagem)
        supabase
          .from('evolucoes')
          .select('id, session_id')
          .not('session_id', 'is', null),
        
        // Carregar clientes (apenas campos necessários)
        supabase
          .from('clients')
          .select('id, nome, ativo, avatar_url, medicamentos, eh_crianca_adolescente')
          .order('nome'),
        
        // Carregar pacotes para obter valor_por_sessao
        supabase
          .from('packages')
          .select('id, valor_por_sessao, valor_total, total_sessoes')
      ])

      if (sessionsResult.error) {
        console.error('Erro ao carregar sessões:', sessionsResult.error)
        throw sessionsResult.error
      }
      if (notesResult.error) throw notesResult.error
      if (evolucoesResult.error) throw evolucoesResult.error
      if (clientsResult.error) throw clientsResult.error
      if (packagesResult.error) throw packagesResult.error

      // Batch decrypt sessions and notes in parallel (single API call each instead of N calls)
      const [decryptedSessions, decryptedNotes] = await Promise.all([
        decryptSensitiveDataBatch('sessions', sessionsResult.data || []),
        decryptSensitiveDataBatch('session_notes', notesResult.data || [])
      ])

      // Set all state at once
      setSessions(decryptedSessions as Session[])
      setSessionNotes(decryptedNotes as SessionNote[])
      setEvolucoes(evolucoesResult.data || [])
      setClients(clientsResult.data || [])
      setPackages(packagesResult.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSession = async (sessionId: string) => {
    try {
      // Get session to check if it belongs to a package
      const sessionToUpdate = sessions.find(s => s.id === sessionId)
      
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'cancelada' })
        .eq('id', sessionId)

      if (error) throw error

      // Recalculate package if session belonged to one
      if (sessionToUpdate?.package_id) {
        await recalculateMultiplePackages([sessionToUpdate.package_id])
      }

      // Enviar email de notificação de cancelamento (não bloqueia)
      if (user && sessionToUpdate) {
        supabase.functions.invoke('send-booking-cancelled-email', {
          body: {
            userId: user.id,
            sessionId: sessionId,
            clientId: sessionToUpdate.client_id,
            clientName: sessionToUpdate.clients?.nome,
            sessionDate: sessionToUpdate.data,
            sessionTime: sessionToUpdate.horario
          }
        }).catch(err => console.error('Erro ao enviar email de cancelamento:', err))
      }

      toast({
        title: "Sessão cancelada",
        description: "A sessão foi cancelada com sucesso.",
      })
      await loadData()
      // Notificar dashboard para atualizar
      window.dispatchEvent(new Event('sessionUpdated'))
    } catch (error) {
      console.error('Erro ao cancelar sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível cancelar a sessão.",
        variant: "destructive",
      })
    }
  }

  const handleMarkNoShow = async (sessionId: string) => {
    try {
      // Get session to check if it belongs to a package
      const sessionToUpdate = sessions.find(s => s.id === sessionId)
      
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'falta' })
        .eq('id', sessionId)

      if (error) throw error

      // Recalculate package if session belonged to one
      if (sessionToUpdate?.package_id) {
        await recalculateMultiplePackages([sessionToUpdate.package_id])
      }

      toast({
        title: "Sessão marcada como falta",
        description: "A sessão foi marcada como falta com sucesso.",
      })
      await loadData()
      // Notificar dashboard para atualizar
      window.dispatchEvent(new Event('sessionUpdated'))
    } catch (error) {
      console.error('Erro ao marcar falta:', error)
      toast({
        title: "Erro",
        description: "Não foi possível marcar a falta.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      // Get session data before deleting to know if it belongs to a package
      const sessionToDelete = sessions.find(s => s.id === sessionId)
      const packageIdToRecalculate = sessionToDelete?.package_id

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      // Recalculate package consumption if session belonged to a package
      if (packageIdToRecalculate) {
        await recalculateMultiplePackages([packageIdToRecalculate])
      }

      toast({
        title: "Sessão excluída",
        description: "A sessão foi excluída permanentemente.",
      })
      await loadData()
      // Notificar dashboard para atualizar
      window.dispatchEvent(new Event('sessionUpdated'))
    } catch (error) {
      console.error('Erro ao excluir sessão:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a sessão.",
        variant: "destructive",
      })
    }
  }

  // Funções de seleção em lote
  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const selectAllSessions = () => {
    setSelectedSessions(new Set(filteredSessions.map(s => s.id)))
    setIsSelectionMode(true)
  }

  const clearSessionSelection = () => {
    setSelectedSessions(new Set())
    setIsSelectionMode(false)
  }

  const handleBatchDeleteSessions = async () => {
    try {
      const ids = Array.from(selectedSessions)
      
      // Collect package IDs to recalculate before deleting
      const packageIdsToRecalculate = new Set<string>()
      sessions.forEach(s => {
        if (ids.includes(s.id) && s.package_id) {
          packageIdsToRecalculate.add(s.package_id)
        }
      })
      
      const { error } = await supabase
        .from('sessions')
        .delete()
        .in('id', ids)

      if (error) throw error

      // Recalculate affected packages
      if (packageIdsToRecalculate.size > 0) {
        await recalculateMultiplePackages(Array.from(packageIdsToRecalculate))
      }

      toast({
        title: "Sessões excluídas",
        description: `${ids.length} sessão(ões) excluída(s) com sucesso.`,
      })
      setSelectedSessions(new Set())
      await loadData()
      window.dispatchEvent(new Event('sessionUpdated'))
    } catch (error) {
      console.error('Erro ao excluir sessões:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir as sessões.",
        variant: "destructive",
      })
    }
  }

  // Get selected sessions as array for the modal
  const getSelectedSessionsArray = () => {
    return sessions.filter(s => selectedSessions.has(s.id))
  }

  // Check if selected sessions have mixed types
  const getSelectedSessionsTypeInfo = () => {
    const selectedArray = getSelectedSessionsArray()
    let hasPackage = false
    let hasRecurring = false
    let hasIndividual = false

    selectedArray.forEach(session => {
      if (session.package_id) {
        hasPackage = true
      } else if (session.recurring_session_id) {
        hasRecurring = true
      } else {
        hasIndividual = true
      }
    })

    const typeCount = [hasPackage, hasRecurring, hasIndividual].filter(Boolean).length
    return { isMixed: typeCount > 1, hasPackage, hasRecurring, hasIndividual }
  }

  const handleBatchEditSessions = () => {
    if (selectedSessions.size > 0) {
      setBatchEditModalOpen(true)
    }
  }

  const handleBatchEditConfirm = async (changes: BatchEditChanges) => {
    try {
      const ids = Array.from(selectedSessions)
      const selectedSessionsArray = getSelectedSessionsArray()
      
      // Collect old package_ids to recalculate their sessoes_consumidas
      const oldPackageIds = new Set<string>()
      selectedSessionsArray.forEach(session => {
        if (session.package_id) {
          oldPackageIds.add(session.package_id)
        }
      })
      
      // Build update object based on provided changes
      const sessionUpdate: any = {}
      if (changes.client_id) sessionUpdate.client_id = changes.client_id
      if (changes.package_id) sessionUpdate.package_id = changes.package_id
      if (changes.data) sessionUpdate.data = changes.data
      if (changes.valor !== undefined) sessionUpdate.valor = changes.valor
      if (changes.metodo_pagamento) sessionUpdate.metodo_pagamento = changes.metodo_pagamento
      if (changes.status) sessionUpdate.status = changes.status
      if (changes.anotacoes !== undefined) sessionUpdate.anotacoes = changes.anotacoes

      // Only update if there are changes
      if (Object.keys(sessionUpdate).length > 0) {
        const { error: sessionError } = await supabase
          .from('sessions')
          .update(sessionUpdate)
          .in('id', ids)

        if (sessionError) throw sessionError
      }

      // Recalculate sessoes_consumidas for affected packages
      if (changes.package_id) {
        // Add new package to recalculate
        oldPackageIds.add(changes.package_id)
      }
      
      // Also recalculate if status changed (affects sessoes_consumidas)
      if (changes.status) {
        selectedSessionsArray.forEach(session => {
          if (session.package_id) {
            oldPackageIds.add(session.package_id)
          }
        })
      }
      
      // Recalculate sessoes_consumidas for all affected packages
      if (oldPackageIds.size > 0) {
        await recalculateMultiplePackages(Array.from(oldPackageIds))
      }

      // Atualizar pagamentos relacionados (only for individual sessions with valor/metodo/status)
      const typeInfo = getSelectedSessionsTypeInfo()
      if (!typeInfo.isMixed && !typeInfo.hasPackage && !typeInfo.hasRecurring) {
        if (changes.valor !== undefined || changes.metodo_pagamento || changes.status) {
          const paymentUpdate: any = {}
          if (changes.valor !== undefined) paymentUpdate.valor = changes.valor
          if (changes.metodo_pagamento) paymentUpdate.metodo_pagamento = changes.metodo_pagamento
          if (changes.status) {
            // Mapear status de sessão para status de pagamento
            if (changes.status === 'realizada') paymentUpdate.status = 'pago'
            else if (changes.status === 'cancelada') paymentUpdate.status = 'cancelado'
            else if (changes.status === 'agendada') paymentUpdate.status = 'pendente'
          }

          if (Object.keys(paymentUpdate).length > 0) {
            const { error: paymentError } = await supabase
              .from('payments')
              .update(paymentUpdate)
              .in('session_id', ids)

            if (paymentError) console.error('Erro ao atualizar pagamentos:', paymentError)
          }
        }
      }

      toast({
        title: "Sessões atualizadas",
        description: `${ids.length} sessão(ões) atualizada(s) com sucesso.`,
      })
      
      setBatchEditModalOpen(false)
      setSelectedSessions(new Set())
      setIsSelectionMode(false)
      await loadData()
      window.dispatchEvent(new Event('sessionUpdated'))
      window.dispatchEvent(new Event('paymentUpdated'))
      window.dispatchEvent(new Event('packageUpdated'))
    } catch (error) {
      console.error('Erro ao editar sessões:', error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as sessões.",
        variant: "destructive",
      })
    }
  }

  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedSessions(new Set())
    }
    setIsSelectionMode(!isSelectionMode)
  }

  const handleViewInAgenda = (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId)
      if (session) {
        navigate(`/agenda?highlight=${sessionId}&date=${session.data}`)
      } else {
        navigate('/agenda')
      }
    } catch (error) {
      console.error('Error navigating to session:', error)
      toast({
        title: "Erro",
        description: "Não foi possível navegar para a sessão.",
        variant: "destructive",
      })
    }
  }

  const handleViewPayment = (sessionId: string) => {
    try {
      navigate(`/pagamentos?highlight=${sessionId}`)
    } catch (error) {
      console.error('Error navigating to payment:', error)
      toast({
        title: "Erro",
        description: "Não foi possível navegar para o pagamento.",
        variant: "destructive",
      })
    }
  }

  const handleAddNote = (session: Session) => {
    try {
      // Check if session already has a note
      const existingNote = sessionNotes.find(note => note.session_id === session.id)
      if (existingNote) {
        // Open view modal for existing note
        setViewingNote(existingNote)
        setNoteViewModalOpen(true)
      } else {
        // Open create modal for new note
        setSelectedSession(session)
        setEditingNote(null)
        setNoteModalOpen(true)
      }
    } catch (error) {
      console.error('Error opening note modal:', error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir o modal de anotação.",
        variant: "destructive",
      })
    }
  }

  const handleViewNoteEdit = (note: SessionNote) => {
    // Close view modal first, then open edit modal after a brief delay
    setNoteViewModalOpen(false)
    setViewingNote(null)
    setTimeout(() => {
      setEditingNote(note)
      setSelectedSession(null)
      setNoteModalOpen(true)
    }, 150)
  }

  const handleViewNoteDelete = async (noteId: string) => {
    setNoteViewModalOpen(false)
    setViewingNote(null)
    await handleDeleteNote(noteId)
  }

  const handleEditNote = (note: SessionNote) => {
    setEditingNote(note)
    setSelectedSession(null)
    setNoteModalOpen(true)
  }

  const handleEditSession = (session: Session) => {
    try {
      setSelectedSession(session)
      setEditModalOpen(true)
    } catch (error) {
      console.error('Error opening edit modal:', error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir o modal de edição.",
        variant: "destructive",
      })
    }
  }

  const handleSessionClick = (session: Session) => {
    try {
      setSelectedSession(session)
      setDetailsModalOpen(true)
    } catch (error) {
      console.error('Error opening session details:', error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir os detalhes da sessão.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('session_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error

      toast({
        title: "Lembrete excluído",
        description: "O lembrete foi excluído com sucesso.",
      })
      await loadData()
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lembrete.",
        variant: "destructive",
      })
    }
  }

  const handleIncluirNoProntuario = async (note: SessionNote) => {
    // Verificar se já existe evolução para esta sessão ANTES de abrir o modal
    if (note.session_id) {
      const existingEvolucao = evolucoes.find(e => e.session_id === note.session_id)
      if (existingEvolucao) {
        setEvolucaoExistenteDialogOpen(true)
        return
      }
    }
    setSelectedNoteForEvolucao(note)
    setEvolucaoModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizada': return 'success'
      case 'agendada': return 'info'
      case 'cancelada': return 'destructive'
      case 'falta': 
      case 'faltou': return 'warning'
      default: return 'outline'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'realizada': return 'Realizada'
      case 'agendada': return 'Agendada'
      case 'cancelada': return 'Cancelada'
      case 'pausada': return 'Pausada'
      case 'falta': 
      case 'faltou': return 'Falta'
      default: return status
    }
  }

  // Obter valor da sessão (calculado para sessões de pacote)
  const getSessionValue = (session: Session): number => {
    // Se a sessão tem valor definido, usar
    if (session.valor != null && session.valor > 0) {
      return session.valor
    }
    
    // Se é sessão de pacote, buscar valor do pacote
    if (session.package_id) {
      const pkg = packages.find(p => p.id === session.package_id)
      if (pkg) {
        // valor_por_sessao tem prioridade, senão calcula
        return pkg.valor_por_sessao || (pkg.valor_total / pkg.total_sessoes)
      }
    }
    
    return 0
  }

  // Filtrar e ordenar sessões pela mais próxima (futuras primeiro, depois passadas)
  const filteredSessions = sessions
    .filter(session => {
      const matchesStatus = !filters.status || filters.status === "all" || session.status === filters.status
      const matchesClient = !filters.client || filters.client === "all" || session.client_id === filters.client
      const matchesSearch = !filters.search || 
        session.clients?.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
        session.anotacoes?.toLowerCase().includes(filters.search.toLowerCase())
      
      let matchesDate = true
      if (filters.startDate) {
        matchesDate = matchesDate && session.data >= filters.startDate
      }
      if (filters.endDate) {
        matchesDate = matchesDate && session.data <= filters.endDate
      }

      // Filtro por tipo de sessão
      let matchesType = true
      if (filters.sessionType && filters.sessionType !== "all") {
        if (filters.sessionType === "individual") {
          matchesType = !session.package_id && !session.recurring_session_id
        } else if (filters.sessionType === "package") {
          matchesType = !!session.package_id
        } else if (filters.sessionType === "recurring") {
          matchesType = !!session.recurring_session_id && (session as any).recurring_sessions?.billing_type !== 'monthly_plan'
        } else if (filters.sessionType === "monthly_plan") {
          matchesType = !!session.recurring_session_id && (session as any).recurring_sessions?.billing_type === 'monthly_plan'
        }
      }

      // Filtro por sincronização Google
      let matchesGoogleSync = true
      if (filters.googleSync && filters.googleSync !== "all") {
        const syncType = (session as any).google_sync_type
        if (filters.googleSync === "local") {
          matchesGoogleSync = !syncType || syncType === 'local'
        } else {
          matchesGoogleSync = syncType === filters.googleSync
        }
      }

      // Filtro por período (passadas/futuras/precisa atenção)
      let matchesTimeframe = true
      const now = new Date()
      const sessionDateTime = new Date(`${session.data}T${session.horario}`)
      
      if (filters.timeframe === 'past') {
        matchesTimeframe = sessionDateTime < now
      } else if (filters.timeframe === 'future') {
        matchesTimeframe = sessionDateTime >= now
      } else if (filters.timeframe === 'needs_attention') {
        // Sessões passadas que ainda estão como "agendada" precisam de atenção
        matchesTimeframe = session.status === 'agendada' && sessionDateTime < now
      }
      
      return matchesStatus && matchesClient && matchesSearch && matchesDate && matchesType && matchesGoogleSync && matchesTimeframe
    })
    .sort((a, b) => {
      const now = new Date()
      const dateTimeA = new Date(`${a.data}T${a.horario}`)
      const dateTimeB = new Date(`${b.data}T${b.horario}`)
      
      const isAfutureA = dateTimeA > now
      const isFutureB = dateTimeB > now
      
      // Sessões futuras vêm primeiro
      if (isAfutureA && !isFutureB) return -1
      if (!isAfutureA && isFutureB) return 1
      
      // Se ambas são futuras ou ambas são passadas, ordenar pela mais próxima
      if (isAfutureA && isFutureB) {
        return dateTimeA.getTime() - dateTimeB.getTime() // Mais próxima primeiro
      } else {
        return dateTimeB.getTime() - dateTimeA.getTime() // Mais recente primeiro
      }
    })

  // Separar sessões em futuras e passadas
  const now = new Date()
  const futureSessions = filteredSessions.filter(session => {
    const sessionDateTime = new Date(`${session.data}T${session.horario}`)
    return sessionDateTime > now
  })
  const pastSessions = filteredSessions.filter(session => {
    const sessionDateTime = new Date(`${session.data}T${session.horario}`)
    return sessionDateTime < now
  })

  const filteredNotes = sessionNotes.filter(note => {
    const clientMatches = !filters.client || filters.client === "all" || note.client_id === filters.client
    const searchMatches = !filters.search || 
      note.clients?.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
      note.notes.toLowerCase().includes(filters.search.toLowerCase())
    
    return clientMatches && searchMatches
  })

  // Estatísticas
  const stats = {
    total: sessions.length,
    realizadas: sessions.filter(s => s.status === 'realizada').length,
    agendadas: sessions.filter(s => s.status === 'agendada').length,
    canceladas: sessions.filter(s => s.status === 'cancelada').length,
    faltas: sessions.filter(s => s.status === 'falta' || s.status === 'faltou').length,
    totalFaturado: sessions
      .filter(s => s.status === 'realizada' && s.valor)
      .reduce((sum, s) => sum + (s.valor || 0), 0)
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="md:p-6">
        {/* Header - Mobile optimized, buttons on same line as title on desktop */}
        <div className="flex flex-col gap-3 mb-4 md:mb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary shrink-0" />
              <h1 className="text-xl md:text-2xl font-bold">Histórico de Sessões</h1>
            </div>
            <p className="text-sm text-muted-foreground hidden md:block">
              Gerencie e acompanhe todas as suas sessões, anotações e evoluções
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 md:flex-nowrap">
            <Button
              onClick={() => setNewSessionModalOpen(true)}
              className="bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Sessão
            </Button>
            <Button
              variant={activeTab === 'sessions' ? 'default' : 'outline'}
              onClick={() => setActiveTab('sessions')}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              Sessões
            </Button>
            <Button
              variant={activeTab === 'notes' ? 'default' : 'outline'}
              onClick={() => setActiveTab('notes')}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <PenLine className="h-4 w-4 mr-1" />
              Anotações
            </Button>
          </div>
        </div>
        
        {/* Estatísticas - Vertical grid on mobile */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mb-4 md:mb-6">
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="text-lg md:text-2xl font-bold">{stats.total}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="text-lg md:text-2xl font-bold text-success">{stats.realizadas}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Realizadas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="text-lg md:text-2xl font-bold text-primary">{stats.agendadas}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Agendadas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="text-lg md:text-2xl font-bold text-destructive">{stats.canceladas}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Canceladas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="text-lg md:text-2xl font-bold text-warning">{stats.faltas}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Faltas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-2 md:p-4">
              <div className="text-lg md:text-2xl font-bold text-success truncate">
                {formatCurrencyBR(stats.totalFaturado)}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Faturado</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filtros - Collapsible dropdown */}
        <Card className="mb-4 md:mb-6">
          <CardHeader className="py-3 md:py-4">
            <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full text-left">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm md:text-base font-semibold">Filtros</span>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isFiltersOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3 md:gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <Label htmlFor="search" className="text-xs">Buscar</Label>
                    <Input
                      id="search"
                      placeholder="Cliente ou anotações..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className={cn(
                        "h-9 text-sm transition-all",
                        filters.search !== '' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="status-filter" className="text-xs">Status</Label>
                    <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger className={cn(
                        "h-9 text-sm transition-all",
                        filters.status !== '' && filters.status !== 'all' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="realizada">Realizadas</SelectItem>
                        <SelectItem value="agendada">Agendadas</SelectItem>
                        <SelectItem value="cancelada">Canceladas</SelectItem>
                        <SelectItem value="falta">Faltas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="type-filter" className="text-xs">Tipo</Label>
                    <Select value={filters.sessionType} onValueChange={(value) => setFilters(prev => ({ ...prev, sessionType: value }))}>
                      <SelectTrigger className={cn(
                        "h-9 text-sm transition-all",
                        filters.sessionType !== '' && filters.sessionType !== 'all' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="package">Pacote</SelectItem>
                        <SelectItem value="recurring">Recorrente</SelectItem>
                        <SelectItem value="monthly_plan">Plano mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="google-sync-filter" className="text-xs">Sincronia</Label>
                    <Select value={filters.googleSync} onValueChange={(value) => setFilters(prev => ({ ...prev, googleSync: value }))}>
                      <SelectTrigger className={cn(
                        "h-9 text-sm transition-all",
                        filters.googleSync !== '' && filters.googleSync !== 'all' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="importado">Importado</SelectItem>
                        <SelectItem value="espelhado">Espelhado</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="timeframe-filter" className="text-xs">Tempo</Label>
                    <Select value={filters.timeframe} onValueChange={(value) => setFilters(prev => ({ ...prev, timeframe: value }))}>
                      <SelectTrigger className={cn(
                        "h-9 text-sm transition-all",
                        filters.timeframe !== '' && filters.timeframe !== 'all' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="future">Futuras</SelectItem>
                        <SelectItem value="past">Passadas</SelectItem>
                        <SelectItem value="needs_attention">Precisa Atenção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="start-date" className="text-xs">Início</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                      className={cn(
                        "h-9 text-sm transition-all",
                        filters.startDate !== '' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="end-date" className="text-xs">Fim</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                      className={cn(
                        "h-9 text-sm transition-all",
                        filters.endDate !== '' && "ring-2 ring-primary ring-offset-1 border-primary"
                      )}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Limpar</Label>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-9"
                      onClick={() => setFilters({
                        status: '',
                        client: '',
                        startDate: '',
                        endDate: '',
                        search: '',
                        sessionType: '',
                        googleSync: '',
                        timeframe: 'all'
                      })}
                      disabled={activeFiltersCount === 0}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>

        {/* Sessions List */}
        {activeTab === 'sessions' && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Histórico de Sessões</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Barra de seleção em lote */}
                {filteredSessions.length > 0 && (
                  <BatchSelectionBar
                    selectedCount={selectedSessions.size}
                    totalCount={filteredSessions.length}
                    onSelectAll={selectAllSessions}
                    onClearSelection={clearSessionSelection}
                    onBatchDelete={handleBatchDeleteSessions}
                    onBatchEdit={handleBatchEditSessions}
                    showDelete={true}
                    showEdit={true}
                    selectLabel="Selecionar sessões"
                    isSelectionMode={isSelectionMode}
                    onToggleSelectionMode={toggleSelectionMode}
                  />
                )}
                
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Carregando sessões...</p>
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma sessão encontrada.
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Sessões Futuras */}
                    {futureSessions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px bg-border flex-1" />
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Sessões Futuras
                          </h3>
                          <div className="h-px bg-border flex-1" />
                        </div>
                        <div className="space-y-4">
                          {futureSessions.map((session) => {
                            const needsAttention = sessionNeedsAttention(session.data, session.horario, session.status)
                            
                            return (
                            <div 
                              key={session.id} 
                              className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer relative"
                              onClick={() => isSelectionMode ? toggleSessionSelection(session.id) : handleSessionClick(session)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 flex-1">
                                  {isSelectionMode && (
                                    <SelectableItemCheckbox
                                      isSelected={selectedSessions.has(session.id)}
                                      onSelect={() => toggleSessionSelection(session.id)}
                                    />
                                  )}
                                  {!isSelectionMode && needsAttention && (
                                    <div className="absolute top-4 left-4">
                                      <PulsingDot color="warning" size="md" />
                                    </div>
                                  )}
                                  <ClientAvatar 
                                    avatarPath={session.clients?.avatar_url}
                                    clientName={session.clients?.nome || 'Cliente'}
                                    size="lg"
                                  />
                                   <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <h3 className="text-base md:text-lg font-semibold">{session.clients?.nome || 'Cliente não encontrado'}</h3>
                                      <Badge variant={getStatusColor(session.status)}>
                                        {getStatusLabel(session.status)}
                                      </Badge>
                                      <GoogleSyncBadge syncType={session.google_sync_type} />
                                      {session.package_id && (
                                        <Package className="h-4 w-4 text-primary" />
                                      )}
                                      {session.recurring_session_id && !session.package_id && (
                                        <>
                                          {(session as any).recurring_sessions?.billing_type === 'monthly_plan' && (
                                            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                                              <CalendarDays className="h-3 w-3 mr-1" />
                                              Plano mensal
                                            </Badge>
                                          )}
                                          <Repeat className="h-4 w-4 text-primary" />
                                        </>
                                      )}
                                      {sessionNotes.some(note => note.session_id === session.id) && (
                                        <PenLine className="h-4 w-4 text-primary" />
                                      )}
                                      {evolucoes.some(evo => evo.session_id === session.id) && (
                                        <FileText className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                        <div className="flex items-center gap-1">
                                          <Calendar className="w-4 h-4 shrink-0" />
                                          <span>{formatDateBR(session.data)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Clock className="w-4 h-4 shrink-0" />
                                          <span>{formatTimeBR(session.horario)}</span>
                                        </div>
                                        {(session.valor != null || session.package_id) && (
                                          <span className="font-medium text-primary whitespace-nowrap">
                                            {formatCurrencyBR(getSessionValue(session))}
                                            {session.package_id && <span className="text-xs text-muted-foreground ml-1">(Pacote {session.packages?.nome || ''})</span>}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {session.anotacoes && (
                                      <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                                        <strong>Observações Iniciais:</strong>
                                        <p className="mt-1 line-clamp-2">{session.anotacoes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sessões Passadas */}
                    {pastSessions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-px bg-border flex-1" />
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                            Sessões Passadas
                          </h3>
                          <div className="h-px bg-border flex-1" />
                        </div>
                        <div className="space-y-4">
                          {pastSessions.map((session) => {
                            const needsAttention = sessionNeedsAttention(session.data, session.horario, session.status)
                            
                            return (
                      <div 
                        key={session.id} 
                        className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer relative"
                        onClick={() => isSelectionMode ? toggleSessionSelection(session.id) : handleSessionClick(session)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            {isSelectionMode && (
                              <SelectableItemCheckbox
                                isSelected={selectedSessions.has(session.id)}
                                onSelect={() => toggleSessionSelection(session.id)}
                              />
                            )}
                            {!isSelectionMode && needsAttention && (
                              <div className="absolute top-4 left-4">
                                <PulsingDot color="warning" size="md" />
                              </div>
                            )}
                            <ClientAvatar 
                              avatarPath={session.clients?.avatar_url}
                              clientName={session.clients?.nome || 'Cliente'}
                              size="lg"
                            />
                             <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-base md:text-lg font-semibold">{session.clients?.nome || 'Cliente não encontrado'}</h3>
                                <Badge variant={getStatusColor(session.status)}>
                                  {getStatusLabel(session.status)}
                                </Badge>
                                <GoogleSyncBadge syncType={session.google_sync_type} />
                                {session.package_id && (
                                  <Package className="h-4 w-4 text-primary" />
                                )}
                                {session.recurring_session_id && !session.package_id && (
                                  <>
                                    {(session as any).recurring_sessions?.billing_type === 'monthly_plan' && (
                                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                                        <CalendarDays className="h-3 w-3 mr-1" />
                                        Plano mensal
                                      </Badge>
                                    )}
                                    <Repeat className="h-4 w-4 text-primary" />
                                  </>
                                )}
                                {sessionNotes.some(note => note.session_id === session.id) && (
                                  <PenLine className="h-4 w-4 text-primary" />
                                )}
                                {evolucoes.some(evo => evo.session_id === session.id) && (
                                  <FileText className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 shrink-0" />
                                    <span>{formatDateBR(session.data)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4 shrink-0" />
                                    <span>{formatTimeBR(session.horario)}</span>
                                  </div>
                                  {(session.valor != null || session.package_id) && (
                                    <span className="font-medium text-primary whitespace-nowrap">
                                      {formatCurrencyBR(getSessionValue(session))}
                                      {session.package_id && <span className="text-xs text-muted-foreground ml-1">(Pacote {session.packages?.nome || ''})</span>}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {session.anotacoes && (
                                <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded p-2">
                                  <strong>Observações Iniciais:</strong>
                                  <p className="mt-1 line-clamp-2">{session.anotacoes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
          </Card>
        )}

        {/* Notes List */}
        {activeTab === 'notes' && (
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Anotações de sessões</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma anotação encontrada.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setReadOnlyNote(note)
                          setNoteReadOnlyModalOpen(true)
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                            <ClientAvatar 
                              avatarPath={note.clients?.avatar_url}
                              clientName={note.clients?.nome || 'Cliente'}
                              size="lg"
                              className="shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-base sm:text-lg font-semibold break-words">{note.clients?.nome || 'Cliente não encontrado'}</h3>
                                {note.sessions && (
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                                      {formatDateBR(note.sessions.data)} às {formatTimeBR(note.sessions.horario)}
                                    </Badge>
                                    <Badge variant={getStatusColor(note.sessions.status)} className="text-xs">
                                      {getStatusLabel(note.sessions.status)}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <div 
                                className="text-sm text-foreground/80 mb-2 line-clamp-5 max-w-none break-words overflow-hidden [&_*]:!text-foreground/80"
                                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.notes) }}
                              />
                              <div className="text-xs text-muted-foreground">
                                Criado em {formatDateBR(note.created_at)} às {formatTimeBR(note.created_at)}
                              </div>
                            </div>
                          </div>
                        
                          {/* Ícones de ação padronizados - sempre à direita no mobile */}
                          <div className="flex gap-1 shrink-0 self-end sm:self-start">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleIncluirNoProntuario(note)
                                  }}
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Incluir no prontuário</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditNote(note)
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar anotação</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteNoteId(note.id)
                                  }}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir anotação</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modals */}
        <SessionDetailsModal
          session={selectedSession}
          open={detailsModalOpen}
          onOpenChange={setDetailsModalOpen}
          onEdit={handleEditSession}
          onDelete={handleDeleteSession}
          onCancel={handleCancelSession}
          onMarkNoShow={handleMarkNoShow}
          onViewPayment={handleViewPayment}
          onAddNote={handleAddNote}
          hasNotes={selectedSession ? sessionNotes.some(note => note.session_id === selectedSession.id) : false}
          hasEvolution={selectedSession ? evolucoes.some(evo => evo.session_id === selectedSession.id) : false}
        />

        <SessionNoteModal
          session={selectedSession}
          open={noteModalOpen}
          onOpenChange={setNoteModalOpen}
          onNoteCreated={loadData}
          editingNote={editingNote}
        />

        <SessionNoteViewModal
          note={viewingNote}
          open={noteViewModalOpen}
          onOpenChange={setNoteViewModalOpen}
          onEdit={handleViewNoteEdit}
          onDelete={handleViewNoteDelete}
        />

        <SessionNoteReadOnlyModal
          note={readOnlyNote}
          open={noteReadOnlyModalOpen}
          onOpenChange={setNoteReadOnlyModalOpen}
        />
        
        <SessionEditModal
          session={selectedSession}
          clients={clients}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          onSessionUpdated={loadData}
        />

        <SessionModal
          open={newSessionModalOpen}
          onOpenChange={setNewSessionModalOpen}
          onSuccess={loadData}
        />

        <EvolucaoModal
          open={evolucaoModalOpen}
          onOpenChange={setEvolucaoModalOpen}
          clientId={selectedNoteForEvolucao?.client_id || ''}
          clientName={selectedNoteForEvolucao?.clients?.nome || ''}
          onEvolucaoCreated={() => {
            loadData()
            toast({
              title: "Lembrete incluído no prontuário",
              description: "O lembrete foi adicionado como evolução no prontuário.",
            })
          }}
          sessionData={selectedNoteForEvolucao && selectedNoteForEvolucao.sessions ? {
            id: selectedNoteForEvolucao.session_id,
            data: selectedNoteForEvolucao.sessions.data,
            horario: selectedNoteForEvolucao.sessions.horario
          } : undefined}
          initialContent={selectedNoteForEvolucao?.notes || ''}
        />

        {/* Diálogo de confirmação para excluir lembrete */}
        <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lembrete? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteNoteId) {
                    handleDeleteNote(deleteNoteId)
                    setDeleteNoteId(null)
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Diálogo de evolução já existente */}
        <AlertDialog open={evolucaoExistenteDialogOpen} onOpenChange={setEvolucaoExistenteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Evolução já existente
              </AlertDialogTitle>
              <AlertDialogDescription>
                Já existe uma evolução registrada para esta sessão. Você deve editar a evolução existente na página de Prontuários.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setEvolucaoExistenteDialogOpen(false)}>
                Entendi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <BatchEditByTypeModal
          open={batchEditModalOpen}
          onClose={() => setBatchEditModalOpen(false)}
          onConfirm={handleBatchEditConfirm}
          selectedSessions={getSelectedSessionsArray()}
          clients={clients}
        />
      </div>
    </Layout>
  )
}