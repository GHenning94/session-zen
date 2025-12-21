import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { generateModernReport } from '@/utils/modernReportGenerator'

interface ReportFilters {
  startDate?: string
  endDate?: string
  clientId?: string
  status?: string
}

console.log('🎯 useReports hook carregado')

export const useReports = () => {
  const { user } = useAuth()
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchReportData = async (type: string, filters: ReportFilters) => {
    console.log('📊 fetchReportData: iniciando busca de dados', { type, filters, user: !!user })
    if (!user) {
      console.log('❌ fetchReportData: usuário não encontrado')
      return null
    }

    try {
      let data: any = {}

      // Buscar clientes
      const { data: clients } = await supabase
        .from('clients')
        .select('id, nome, email, telefone, ativo, created_at, dados_clinicos, historico')
        .eq('user_id', user.id)
        .order('nome')

      data.clients = clients || []

      // Buscar sessões com filtros
      let sessionsQuery = supabase
        .from('sessions')
        .select('id, client_id, data, horario, status, valor, anotacoes')
        .eq('user_id', user.id)

      if (filters.startDate) {
        sessionsQuery = sessionsQuery.gte('data', filters.startDate)
      }
      if (filters.endDate) {
        sessionsQuery = sessionsQuery.lte('data', filters.endDate)
      }
      if (filters.clientId) {
        sessionsQuery = sessionsQuery.eq('client_id', filters.clientId)
      }
      if (filters.status) {
        sessionsQuery = sessionsQuery.eq('status', filters.status)
      }

      const { data: sessions } = await sessionsQuery.order('data', { ascending: false })
      data.sessions = sessions || []
      
      // Buscar dados do profissional
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome, crp')
        .eq('user_id', user.id)
        .single()
      
      data.professionalName = profile?.nome
      data.professionalCRP = profile?.crp

      return data
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      toast({
        title: "Erro",
        description: "Erro ao buscar dados para o relatório",
        variant: "destructive"
      })
      return null
    }
  }

  const getClientName = (clientId: string, clients: any[]) => {
    const client = clients.find(c => c.id === clientId)
    return client?.nome || 'Cliente não encontrado'
  }

  const generatePDF = async (data: any, type: string, filters: ReportFilters) => {
    try {
      console.log('📄 Iniciando geração PDF moderno com dados:', data)
      
      // Verificar se os dados estão válidos
      if (!data || (!data.clients && !data.sessions)) {
        throw new Error('Dados insuficientes para gerar relatório')
      }
      
      // Use the new modern report generator
      await generateModernReport(
        data,
        type,
        filters,
        data.professionalName,
        data.professionalCRP
      )
      
      console.log('✅ PDF moderno gerado com sucesso')
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error)
      throw error
    }
  }

  const generateExcel = (data: any, type: string, filters: ReportFilters) => {
    try {
      console.log('📊 Iniciando geração Excel com dados:', data)
      
      // Verificar se os dados estão válidos
      if (!data || (!data.clients && !data.sessions)) {
        throw new Error('Dados insuficientes para gerar relatório')
      }
      
      const workbook = XLSX.utils.book_new()

      // Aba de Clientes
      if (type === 'clients' || type === 'complete') {
        if (data.clients && data.clients.length > 0) {
          const clientsData = data.clients.map((client: any) => ({
            Nome: client.nome || 'N/A',
            Email: client.email || '',
            Telefone: client.telefone || '',
            'Data Cadastro': client.created_at ? format(new Date(client.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '',
            'Dados Clínicos': client.dados_clinicos || '',
            Histórico: client.historico || ''
          }))

          const clientsSheet = XLSX.utils.json_to_sheet(clientsData)
          XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clientes')
        }
      }

    // Aba de Sessões
    if (type === 'sessions' || type === 'complete') {
      const sessionsData = data.sessions.map((session: any) => ({
        Cliente: getClientName(session.client_id, data.clients),
        Data: format(new Date(session.data), 'dd/MM/yyyy', { locale: ptBR }),
        Horário: session.horario,
        Status: session.status === 'realizada' ? 'Realizada' : 
                session.status === 'cancelada' ? 'Cancelada' : 
                session.status === 'falta' ? 'Falta' : 'Agendada',
        Valor: session.valor ? Number(session.valor) : 0,
        Anotações: session.anotacoes || ''
      }))

      const sessionsSheet = XLSX.utils.json_to_sheet(sessionsData)
      XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Sessões')
    }

    // Aba Financeiro
    if (type === 'financial' || type === 'complete') {
      const realizadas = data.sessions.filter((s: any) => s.status === 'realizada')
      const canceladas = data.sessions.filter((s: any) => s.status === 'cancelada')
      const faltas = data.sessions.filter((s: any) => s.status === 'falta')
      const totalArrecadado = realizadas.reduce((sum: number, s: any) => sum + (Number(s.valor) || 0), 0)
      const totalPendente = data.sessions
        .filter((s: any) => s.status === 'agendada')
        .reduce((sum: number, s: any) => sum + (Number(s.valor) || 0), 0)
      const totalCancelado = canceladas.reduce((sum: number, s: any) => sum + (Number(s.valor) || 0), 0)

      const financialData = [
        { Métrica: 'Total Arrecadado', Valor: totalArrecadado },
        { Métrica: 'Total Pendente', Valor: totalPendente },
        { Métrica: 'Total Cancelado', Valor: totalCancelado },
        { Métrica: 'Sessões Realizadas', Valor: realizadas.length },
        { Métrica: 'Sessões Canceladas', Valor: canceladas.length },
        { Métrica: 'Sessões com Falta', Valor: faltas.length },
        { Métrica: 'Total de Clientes', Valor: data.clients.length }
      ]

      const financialSheet = XLSX.utils.json_to_sheet(financialData)
      XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financeiro')
    }

      // Salvar Excel
      const fileName = `relatorio-${type}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`
      XLSX.writeFile(workbook, fileName)
      console.log('✅ Excel gerado com sucesso:', fileName)
    } catch (error) {
      console.error('❌ Erro ao gerar Excel:', error)
      throw error
    }
  }

  const generateReport = async (type: string, format: 'pdf' | 'excel', filters: ReportFilters = {}) => {
    console.log('🎯 Iniciando geração de relatório:', { type, format, filters })
    setIsGenerating(true)
    
    try {
      console.log('📊 Buscando dados para o relatório...')
      const data = await fetchReportData(type, filters)
      if (!data) {
        console.error('❌ Dados não encontrados para o relatório')
        return
      }

      console.log('📈 Dados carregados:', { 
        clients: data.clients?.length, 
        sessions: data.sessions?.length 
      })

      if (format === 'pdf') {
        console.log('📄 Gerando PDF...')
        await generatePDF(data, type, filters)
        toast({
          title: "Sucesso",
          description: "Relatório PDF gerado com sucesso!"
        })
      } else {
        console.log('📊 Gerando Excel...')
        generateExcel(data, type, filters)
        toast({
          title: "Sucesso", 
          description: "Relatório Excel gerado com sucesso!"
        })
      }
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error)
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateCompleteReport = async (filters: ReportFilters = {}) => {
    console.log('🎯 Gerando relatório completo')
    await generateReport('complete', 'pdf', filters)
    await generateReport('complete', 'excel', filters)
  }

  return {
    generateReport,
    generateCompleteReport,
    isGenerating
  }
}