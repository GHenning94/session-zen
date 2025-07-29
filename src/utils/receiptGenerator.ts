import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ReceiptData {
  clientName: string
  sessionDate: string
  sessionTime: string
  value: number
  paymentMethod: string
  professionalName: string
  professionalCRP?: string
  sessionId: string
}

export const generateReceiptPDF = (data: ReceiptData) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  
  // Header com branding TherapyPro
  doc.setFillColor(59, 130, 246) // Primary blue
  doc.rect(0, 0, pageWidth, 50, 'F')
  
  // Logo/Brand name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('TherapyPro', 20, 25)
  
  // Subtitle
  doc.setFontSize(14)
  doc.text('Gestão Profissional de Psicoterapia', 20, 40)
  
  // Reset colors
  doc.setTextColor(0, 0, 0)
  
  // Título do recibo
  doc.setFontSize(20)
  doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, 70, { align: 'center' })
  
  // Número do recibo e data
  doc.setFontSize(12)
  const receiptNumber = `REC-${Date.now().toString().slice(-6)}`
  doc.text(`Recibo Nº: ${receiptNumber}`, 20, 90)
  doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, pageWidth - 20, 90, { align: 'right' })
  
  // Linha separadora
  doc.setLineWidth(0.5)
  doc.line(20, 100, pageWidth - 20, 100)
  
  // Dados do profissional
  doc.setFontSize(14)
  doc.text('DADOS DO PROFISSIONAL:', 20, 120)
  
  doc.setFontSize(12)
  doc.text(`Nome: ${data.professionalName}`, 20, 135)
  if (data.professionalCRP) {
    doc.text(`CRP: ${data.professionalCRP}`, 20, 150)
  }
  
  // Dados do cliente
  doc.setFontSize(14)
  doc.text('DADOS DO CLIENTE:', 20, 170)
  
  doc.setFontSize(12)
  doc.text(`Cliente: ${data.clientName}`, 20, 185)
  
  // Dados da sessão
  doc.setFontSize(14)
  doc.text('DADOS DA SESSÃO:', 20, 205)
  
  doc.setFontSize(12)
  doc.text(`Data da Sessão: ${format(new Date(data.sessionDate), 'dd/MM/yyyy', { locale: ptBR })}`, 20, 220)
  doc.text(`Horário: ${data.sessionTime}`, 20, 235)
  doc.text(`Método de Pagamento: ${data.paymentMethod}`, 20, 250)
  
  // Valor - destacado
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text(`VALOR PAGO: R$ ${data.value.toFixed(2).replace('.', ',')}`, pageWidth / 2, 270, { align: 'center' })
  
  // Reset font
  doc.setFont(undefined, 'normal')
  
  // Texto de confirmação
  doc.setFontSize(12)
  const confirmationText = `Recebi do(a) Sr(a). ${data.clientName} a quantia de R$ ${data.value.toFixed(2).replace('.', ',')} `
  const confirmationText2 = `referente à sessão de psicoterapia realizada em ${format(new Date(data.sessionDate), 'dd/MM/yyyy', { locale: ptBR })}.`
  
  doc.text(confirmationText, 20, 290)
  doc.text(confirmationText2, 20, 305)
  
  // Data e local
  doc.text(`São Paulo, ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, 20, 330)
  
  // Linha para assinatura
  doc.line(pageWidth - 120, 350, pageWidth - 20, 350)
  doc.text(data.professionalName, pageWidth - 70, 365, { align: 'center' })
  if (data.professionalCRP) {
    doc.text(`CRP: ${data.professionalCRP}`, pageWidth - 70, 375, { align: 'center' })
  }
  
  // Observações
  doc.setFontSize(10)
  doc.text('* Este recibo tem validade fiscal conforme legislação vigente.', 20, 400)
  doc.text('* Gerado automaticamente pelo sistema TherapyPro.', 20, 410)
  
  // Footer com informações do sistema
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text('Documento gerado em: ' + format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }), pageWidth / 2, 280, { align: 'center' })
  doc.text(`ID da Sessão: ${data.sessionId}`, pageWidth / 2, 290, { align: 'center' })
  
  // Salvar o PDF
  const fileName = `recibo-${data.clientName.replace(/\s+/g, '-')}-${format(new Date(data.sessionDate), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
}