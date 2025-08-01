import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { toast } from '@/hooks/use-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getLogoBase64, LOGO_CONFIG } from '@/utils/logoUtils'

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
        .select('*')
        .eq('user_id', user.id)
        .order('nome')

      data.clients = clients || []

      // Buscar sessões com filtros
      let sessionsQuery = supabase
        .from('sessions')
        .select('*')
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
      console.log('📄 Iniciando geração PDF com dados:', data)
      
      // Verificar se os dados estão válidos
      if (!data || (!data.clients && !data.sessions)) {
        throw new Error('Dados insuficientes para gerar relatório')
      }
      
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.width

      // Add header with branding
      doc.setFillColor(59, 130, 246) // Primary blue
      doc.rect(0, 0, pageWidth, 40, 'F')
      
      // Add logo
      try {
        const logoBase64 = await getLogoBase64()
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', LOGO_CONFIG.x, LOGO_CONFIG.y, LOGO_CONFIG.width, LOGO_CONFIG.height)
        }
      } catch (error) {
        console.warn('Could not load logo:', error)
      }
      
      // Logo/Brand name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.text('TherapyPro', 70, 25)
      
      // Report title
      const reportTitle = type === 'complete' ? 'Relatório Completo' :
                         type === 'sessions' ? 'Relatório de Sessões' :
                         type === 'financial' ? 'Relatório Financeiro' :
                         'Relatório de Clientes'
      
      doc.setFontSize(16)
      doc.text(reportTitle, pageWidth / 2, 25, { align: 'center' })
      
      // Reset colors and add date
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(12)
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth / 2, 50, { align: 'center' })

      let yPosition = 70

      // Relatório de Clientes
      if (type === 'clients' || type === 'complete') {
        if (data.clients && data.clients.length > 0) {
          doc.setFontSize(14)
          doc.text('Clientes', 20, yPosition)
          yPosition += 10

          const clientsData = data.clients.map((client: any) => [
            client.nome || 'N/A',
            client.email || '-',
            client.telefone || '-',
            client.created_at ? format(new Date(client.created_at), 'dd/MM/yyyy', { locale: ptBR }) : '-'
          ])

          autoTable(doc, {
            startY: yPosition,
            head: [['Nome', 'Email', 'Telefone', 'Cadastro']],
            body: clientsData,
            theme: 'grid',
            styles: { fontSize: 10 }
          })

          yPosition = (doc as any).lastAutoTable.finalY + 20
        } else {
          doc.setFontSize(12)
          doc.text('Nenhum cliente encontrado.', 20, yPosition)
          yPosition += 20
        }
      }

    // Relatório de Sessões
    if (type === 'sessions' || type === 'complete') {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(14)
      doc.text('Sessões', 20, yPosition)
      yPosition += 10

      const sessionsData = data.sessions.map((session: any) => [
        getClientName(session.client_id, data.clients),
        format(new Date(session.data), 'dd/MM/yyyy', { locale: ptBR }),
        session.horario,
        session.status === 'realizada' ? 'Realizada' : 
        session.status === 'cancelada' ? 'Cancelada' : 'Agendada',
        session.valor ? `R$ ${Number(session.valor).toFixed(2)}` : '-'
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Cliente', 'Data', 'Horário', 'Status', 'Valor']],
        body: sessionsData,
        theme: 'grid'
      })

      yPosition = (doc as any).lastAutoTable.finalY + 20
    }

    // Relatório Financeiro
    if (type === 'financial' || type === 'complete') {
      if (yPosition > 200) {
        doc.addPage()
        yPosition = 20
      }

      const realizadas = data.sessions.filter((s: any) => s.status === 'realizada')
      const totalArrecadado = realizadas.reduce((sum: number, s: any) => sum + (Number(s.valor) || 0), 0)
      const totalPendente = data.sessions
        .filter((s: any) => s.status === 'agendada')
        .reduce((sum: number, s: any) => sum + (Number(s.valor) || 0), 0)

      doc.setFontSize(14)
      doc.text('Resumo Financeiro', 20, yPosition)
      yPosition += 15

      doc.setFontSize(12)
      doc.text(`Total Arrecadado: R$ ${totalArrecadado.toFixed(2)}`, 20, yPosition)
      yPosition += 10
      doc.text(`Total Pendente: R$ ${totalPendente.toFixed(2)}`, 20, yPosition)
      yPosition += 10
      doc.text(`Sessões Realizadas: ${realizadas.length}`, 20, yPosition)
      yPosition += 10
      doc.text(`Total de Clientes: ${data.clients.length}`, 20, yPosition)
    }

      // Salvar PDF
      const fileName = `relatorio-${type}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`
      doc.save(fileName)
      console.log('✅ PDF gerado com sucesso:', fileName)
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
                session.status === 'cancelada' ? 'Cancelada' : 'Agendada',
        Valor: session.valor ? Number(session.valor) : 0,
        Anotações: session.anotacoes || ''
      }))

      const sessionsSheet = XLSX.utils.json_to_sheet(sessionsData)
      XLSX.utils.book_append_sheet(workbook, sessionsSheet, 'Sessões')
    }

    // Aba Financeiro
    if (type === 'financial' || type === 'complete') {
      const realizadas = data.sessions.filter((s: any) => s.status === 'realizada')
      const totalArrecadado = realizadas.reduce((sum: number, s: any) => sum + (Number(s.valor) || 0), 0)
      const totalPendente = data.sessions
        .filter((s: any) => s.status === 'agendada')
        .reduce((sum: number, s: any) => sum + (Number(s.valor) || 0), 0)

      const financialData = [
        { Métrica: 'Total Arrecadado', Valor: totalArrecadado },
        { Métrica: 'Total Pendente', Valor: totalPendente },
        { Métrica: 'Sessões Realizadas', Valor: realizadas.length },
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