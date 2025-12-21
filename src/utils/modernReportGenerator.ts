import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Colors
const COLORS = {
  primary: [59, 130, 246] as [number, number, number],      // Blue
  primaryLight: [147, 197, 253] as [number, number, number], // Light blue
  primaryDark: [30, 64, 175] as [number, number, number],   // Dark blue
  white: [255, 255, 255] as [number, number, number],
  gray: [107, 114, 128] as [number, number, number],
  grayLight: [229, 231, 235] as [number, number, number],
  grayDark: [55, 65, 81] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
}

interface ReportData {
  clients: any[]
  sessions: any[]
  professionalName?: string
  professionalCRP?: string
}

interface ReportFilters {
  startDate?: string
  endDate?: string
  clientId?: string
  status?: string
}

// Draw elegant wave pattern
const drawWavePattern = (doc: jsPDF, y: number, height: number, inverted: boolean = false) => {
  const pageWidth = doc.internal.pageSize.width
  
  // Draw multiple wave lines for elegant effect
  doc.setDrawColor(...COLORS.primaryLight)
  doc.setLineWidth(0.3)
  
  for (let i = 0; i < 15; i++) {
    const offsetY = y + (inverted ? height - (i * 4) : i * 4)
    const amplitude = 8 + (i * 0.5)
    const frequency = 0.015 - (i * 0.0005)
    
    doc.setDrawColor(...(inverted ? COLORS.white : COLORS.primaryLight))
    
    // Start path
    let prevX = 0
    let prevY = offsetY + Math.sin(0) * amplitude
    
    for (let x = 5; x <= pageWidth; x += 5) {
      const currentY = offsetY + Math.sin(x * frequency) * amplitude
      doc.line(prevX, prevY, x, currentY)
      prevX = x
      prevY = currentY
    }
  }
}

// Draw cover page
const drawCoverPage = (doc: jsPDF, title: string, subtitle: string, professionalName?: string) => {
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  
  // White background
  doc.setFillColor(...COLORS.white)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  
  // Wave pattern at top
  drawWavePattern(doc, 10, 80, false)
  
  // Logo/Brand
  doc.setFillColor(...COLORS.primaryDark)
  doc.roundedRect(20, 90, 10, 30, 2, 2, 'F')
  doc.setFillColor(...COLORS.primary)
  doc.roundedRect(26, 95, 10, 25, 2, 2, 'F')
  
  doc.setTextColor(...COLORS.grayDark)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('TherapyPro', 42, 110)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.gray)
  doc.text('Gestão de Consultório', 42, 118)
  
  // Main title
  doc.setFontSize(42)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  
  // Word wrap for title
  const titleWords = title.split(' ')
  let yPos = pageHeight * 0.45
  let line = ''
  
  for (const word of titleWords) {
    const testLine = line + (line ? ' ' : '') + word
    const textWidth = doc.getTextWidth(testLine)
    
    if (textWidth > pageWidth - 40) {
      doc.text(line, 20, yPos)
      yPos += 50
      line = word
    } else {
      line = testLine
    }
  }
  if (line) {
    doc.text(line, 20, yPos)
    yPos += 50
  }
  
  // Subtitle
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.gray)
  doc.text(subtitle, 20, yPos + 10)
  
  // Professional name if available
  if (professionalName) {
    doc.setFontSize(12)
    doc.text(`Profissional: ${professionalName}`, 20, yPos + 30)
  }
  
  // Generation date
  doc.setFontSize(10)
  doc.text(`Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 20, pageHeight - 30)
}

// Draw section header page (blue background)
const drawSectionPage = (doc: jsPDF, sectionNumber: string, title: string) => {
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  
  // Blue background
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')
  
  // Wave pattern at bottom
  drawWavePattern(doc, pageHeight - 120, 80, true)
  
  // Section number
  doc.setFontSize(14)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...COLORS.white)
  doc.text(sectionNumber, 30, 60)
  
  // Title
  doc.setFontSize(48)
  doc.setFont('helvetica', 'bold')
  
  const titleWords = title.split(' ')
  let yPos = 90
  
  for (const word of titleWords) {
    doc.text(word, 30, yPos)
    yPos += 55
  }
}

// Draw circular progress chart
const drawCircularChart = (doc: jsPDF, x: number, y: number, radius: number, percentage: number, label: string, value: string) => {
  // Background circle
  doc.setDrawColor(...COLORS.grayLight)
  doc.setLineWidth(4)
  doc.circle(x, y, radius, 'S')
  
  // Progress arc (simplified as we can't draw arcs easily in jsPDF)
  doc.setDrawColor(...COLORS.primary)
  doc.setLineWidth(4)
  
  // Draw arc segments
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + (2 * Math.PI * (percentage / 100))
  
  const segments = Math.ceil((percentage / 100) * 36)
  for (let i = 0; i < segments; i++) {
    const angle1 = startAngle + (i / 36) * 2 * Math.PI
    const angle2 = startAngle + ((i + 1) / 36) * 2 * Math.PI
    
    if (angle2 <= endAngle) {
      const x1 = x + Math.cos(angle1) * radius
      const y1 = y + Math.sin(angle1) * radius
      const x2 = x + Math.cos(angle2) * radius
      const y2 = y + Math.sin(angle2) * radius
      doc.line(x1, y1, x2, y2)
    }
  }
  
  // Value in center
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(value, x, y + 3, { align: 'center' })
  
  // Label below
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.gray)
  doc.text(label, x, y + radius + 15, { align: 'center' })
}

// Draw content page header
const drawPageHeader = (doc: jsPDF, title: string) => {
  const pageWidth = doc.internal.pageSize.width
  
  // Small accent line
  doc.setFillColor(...COLORS.primary)
  doc.rect(20, 15, 40, 3, 'F')
  
  // Title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(title, 20, 35)
  
  // Page footer with logo
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.gray)
  doc.text('TherapyPro', 20, pageHeight - 10)
  doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 20, pageHeight - 10, { align: 'right' })
}

// Get client name helper
const getClientName = (clientId: string, clients: any[]) => {
  const client = clients.find(c => c.id === clientId)
  return client?.nome || 'Cliente não encontrado'
}

// Main report generation function
export const generateModernReport = async (
  data: ReportData,
  type: string,
  filters: ReportFilters,
  professionalName?: string,
  professionalCRP?: string
) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  
  // Calculate statistics
  const realizadas = data.sessions.filter(s => s.status === 'realizada')
  const canceladas = data.sessions.filter(s => s.status === 'cancelada')
  const faltas = data.sessions.filter(s => s.status === 'falta' || s.status === 'faltou')
  const agendadas = data.sessions.filter(s => s.status === 'agendada')
  
  const totalArrecadado = realizadas.reduce((sum, s) => sum + (Number(s.valor) || 0), 0)
  const totalPendente = agendadas.reduce((sum, s) => sum + (Number(s.valor) || 0), 0)
  const totalCancelado = canceladas.reduce((sum, s) => sum + (Number(s.valor) || 0), 0)
  
  const taxaRealizacao = data.sessions.length > 0 
    ? Math.round((realizadas.length / data.sessions.length) * 100) 
    : 0
  
  // Get report title
  const reportTitle = type === 'complete' ? 'Relatório Completo' :
                      type === 'sessions' ? 'Relatório de Sessões' :
                      type === 'financial' ? 'Relatório Financeiro' :
                      'Relatório de Clientes'
  
  // Subtitle with date range
  let subtitle = ''
  if (filters.startDate && filters.endDate) {
    subtitle = `Período: ${format(new Date(filters.startDate), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(filters.endDate), 'dd/MM/yyyy', { locale: ptBR })}`
  } else if (filters.startDate) {
    subtitle = `A partir de ${format(new Date(filters.startDate), 'dd/MM/yyyy', { locale: ptBR })}`
  } else if (filters.endDate) {
    subtitle = `Até ${format(new Date(filters.endDate), 'dd/MM/yyyy', { locale: ptBR })}`
  } else {
    subtitle = 'Dados completos do sistema'
  }
  
  // COVER PAGE
  drawCoverPage(doc, reportTitle, subtitle, professionalName)
  
  // TABLE OF CONTENTS
  doc.addPage()
  drawPageHeader(doc, 'Índice')
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.grayDark)
  
  let tocY = 60
  const tocItems = [
    { num: '01', title: 'Resumo Executivo' },
    { num: '02', title: 'Análise Financeira' },
    { num: '03', title: 'Sessões Detalhadas' },
    { num: '04', title: 'Lista de Clientes' },
  ]
  
  for (const item of tocItems) {
    doc.setFont('helvetica', 'bold')
    doc.text(item.num + '.', 30, tocY)
    doc.setFont('helvetica', 'normal')
    doc.text(item.title, 50, tocY)
    tocY += 15
  }
  
  // SECTION 1: EXECUTIVE SUMMARY
  doc.addPage()
  drawSectionPage(doc, '01', 'Resumo Executivo')
  
  doc.addPage()
  drawPageHeader(doc, 'Resumo Executivo')
  
  // Statistics cards
  const cardWidth = 80
  const cardHeight = 50
  const cardY = 55
  
  // Card 1: Total Revenue
  doc.setFillColor(...COLORS.grayLight)
  doc.roundedRect(20, cardY, cardWidth, cardHeight, 5, 5, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.gray)
  doc.text('Total Arrecadado', 25, cardY + 15)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.success)
  doc.text(`R$ ${totalArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, cardY + 38)
  
  // Card 2: Sessions
  doc.setFillColor(...COLORS.grayLight)
  doc.roundedRect(110, cardY, cardWidth, cardHeight, 5, 5, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.gray)
  doc.text('Total de Sessões', 115, cardY + 15)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(`${data.sessions.length}`, 115, cardY + 38)
  
  // Circular charts row
  const chartY = 140
  drawCircularChart(doc, 50, chartY, 25, taxaRealizacao, 'Taxa de Realização', `${taxaRealizacao}%`)
  drawCircularChart(doc, 110, chartY, 25, data.clients.filter(c => c.ativo).length / Math.max(data.clients.length, 1) * 100, 'Clientes Ativos', `${data.clients.filter(c => c.ativo).length}`)
  drawCircularChart(doc, 170, chartY, 25, realizadas.length / Math.max(data.sessions.length, 1) * 100, 'Sessões Realizadas', `${realizadas.length}`)
  
  // Session breakdown
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.grayDark)
  doc.text('Detalhamento de Sessões', 20, 200)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  
  const breakdownY = 215
  const items = [
    { label: 'Sessões Realizadas', value: realizadas.length, color: COLORS.success },
    { label: 'Sessões Agendadas', value: agendadas.length, color: COLORS.primary },
    { label: 'Sessões Canceladas', value: canceladas.length, color: COLORS.danger },
    { label: 'Faltas', value: faltas.length, color: COLORS.warning },
  ]
  
  items.forEach((item, i) => {
    const y = breakdownY + (i * 12)
    doc.setFillColor(...item.color)
    doc.circle(25, y - 2, 3, 'F')
    doc.setTextColor(...COLORS.grayDark)
    doc.text(item.label, 32, y)
    doc.text(`${item.value}`, 120, y)
  })
  
  // SECTION 2: FINANCIAL ANALYSIS
  if (type === 'financial' || type === 'complete') {
    doc.addPage()
    drawSectionPage(doc, '02', 'Análise Financeira')
    
    doc.addPage()
    drawPageHeader(doc, 'Análise Financeira')
    
    // Financial summary boxes
    const finY = 55
    
    // Revenue box
    doc.setFillColor(34, 197, 94)
    doc.roundedRect(20, finY, pageWidth - 40, 35, 5, 5, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.white)
    doc.text('Receita Total Realizada', 30, finY + 15)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(`R$ ${totalArrecadado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 30, finY + 28)
    
    // Pending box
    doc.setFillColor(...COLORS.primary)
    doc.roundedRect(20, finY + 45, (pageWidth - 50) / 2, 35, 5, 5, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.white)
    doc.text('Valor Pendente', 30, finY + 60)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 30, finY + 73)
    
    // Cancelled box
    doc.setFillColor(...COLORS.danger)
    doc.roundedRect(25 + (pageWidth - 50) / 2, finY + 45, (pageWidth - 50) / 2, 35, 5, 5, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...COLORS.white)
    doc.text('Valor Cancelado', 35 + (pageWidth - 50) / 2, finY + 60)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(`R$ ${totalCancelado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 35 + (pageWidth - 50) / 2, finY + 73)
    
    // Average per session
    const avgPerSession = realizadas.length > 0 ? totalArrecadado / realizadas.length : 0
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.grayDark)
    doc.text('Métricas Financeiras', 20, finY + 110)
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    const metrics = [
      { label: 'Valor médio por sessão', value: `R$ ${avgPerSession.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
      { label: 'Total de clientes atendidos', value: `${new Set(realizadas.map(s => s.client_id)).size}` },
      { label: 'Sessões realizadas no período', value: `${realizadas.length}` },
    ]
    
    metrics.forEach((metric, i) => {
      const y = finY + 125 + (i * 12)
      doc.setTextColor(...COLORS.gray)
      doc.text(metric.label, 25, y)
      doc.setTextColor(...COLORS.grayDark)
      doc.setFont('helvetica', 'bold')
      doc.text(metric.value, 130, y)
      doc.setFont('helvetica', 'normal')
    })
  }
  
  // SECTION 3: SESSIONS
  if (type === 'sessions' || type === 'complete') {
    doc.addPage()
    drawSectionPage(doc, '03', 'Sessões Detalhadas')
    
    doc.addPage()
    drawPageHeader(doc, 'Lista de Sessões')
    
    const sessionsData = data.sessions.slice(0, 50).map((session: any) => [
      getClientName(session.client_id, data.clients).substring(0, 20),
      format(new Date(session.data), 'dd/MM/yy', { locale: ptBR }),
      session.horario || '-',
      session.status === 'realizada' ? 'Realizada' : 
      session.status === 'cancelada' ? 'Cancelada' : 
      session.status === 'falta' || session.status === 'faltou' ? 'Falta' : 'Agendada',
      session.valor ? `R$ ${Number(session.valor).toFixed(0)}` : '-'
    ])
    
    autoTable(doc, {
      startY: 50,
      head: [['Cliente', 'Data', 'Hora', 'Status', 'Valor']],
      body: sessionsData,
      theme: 'plain',
      styles: { 
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        3: { cellWidth: 25 },
        4: { halign: 'right' },
      }
    })
    
    // Show note if more sessions exist
    if (data.sessions.length > 50) {
      const finalY = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(9)
      doc.setTextColor(...COLORS.gray)
      doc.text(`Mostrando 50 de ${data.sessions.length} sessões. Exporte em Excel para ver todas.`, 20, finalY)
    }
  }
  
  // SECTION 4: CLIENTS
  if (type === 'clients' || type === 'complete') {
    doc.addPage()
    drawSectionPage(doc, '04', 'Lista de Clientes')
    
    doc.addPage()
    drawPageHeader(doc, 'Clientes Cadastrados')
    
    const clientsData = data.clients.slice(0, 50).map((client: any) => [
      client.nome?.substring(0, 25) || 'N/A',
      client.email?.substring(0, 25) || '-',
      client.telefone || '-',
      client.ativo ? 'Ativo' : 'Inativo'
    ])
    
    autoTable(doc, {
      startY: 50,
      head: [['Nome', 'Email', 'Telefone', 'Status']],
      body: clientsData,
      theme: 'plain',
      styles: { 
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
    })
    
    // Show note if more clients exist
    if (data.clients.length > 50) {
      const finalY = (doc as any).lastAutoTable.finalY + 10
      doc.setFontSize(9)
      doc.setTextColor(...COLORS.gray)
      doc.text(`Mostrando 50 de ${data.clients.length} clientes. Exporte em Excel para ver todos.`, 20, finalY)
    }
  }
  
  // Save the PDF
  const fileName = `relatorio-${type}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`
  doc.save(fileName)
  
  return fileName
}
