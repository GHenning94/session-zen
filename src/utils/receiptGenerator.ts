import jsPDF from 'jspdf'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { addLogoBranding } from './logoUtils'

interface ReceiptData {
  clientName: string
  sessionDate: string
  sessionTime: string
  value: number
  paymentMethod: string
  professionalName: string
  professionalCRP?: string
  sessionId: string
  // Campos opcionais para pacotes e sessões recorrentes
  type?: 'session' | 'package' | 'recurring'
  packageName?: string
  packageSessions?: string // "consumidas/total"
}

export const generateReceiptPDF = (data: ReceiptData) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  
  // Add logo branding
  addLogoBranding(doc, pageWidth)
  
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
  
  // Tipo de serviço
  const isPackage = data.type === 'package'
  const isRecurring = data.type === 'recurring'
  
  doc.setFontSize(14)
  if (isPackage) {
    doc.text('DADOS DO PACOTE:', 20, 205)
  } else if (isRecurring) {
    doc.text('DADOS DA SESSÃO RECORRENTE:', 20, 205)
  } else {
    doc.text('DADOS DA SESSÃO:', 20, 205)
  }
  
  doc.setFontSize(12)
  let yPos = 220
  
  if (isPackage && data.packageName) {
    doc.text(`Pacote: ${data.packageName}`, 20, yPos)
    yPos += 15
    if (data.packageSessions) {
      doc.text(`Sessões: ${data.packageSessions}`, 20, yPos)
      yPos += 15
    }
    doc.text(`Data de Referência: ${format(new Date(data.sessionDate), 'dd/MM/yyyy', { locale: ptBR })}`, 20, yPos)
    yPos += 15
  } else {
    doc.text(`Data da Sessão: ${format(new Date(data.sessionDate), 'dd/MM/yyyy', { locale: ptBR })}`, 20, yPos)
    yPos += 15
    doc.text(`Horário: ${data.sessionTime}`, 20, yPos)
    yPos += 15
    if (isRecurring) {
      doc.text(`Tipo: Sessão Recorrente`, 20, yPos)
      yPos += 15
    }
  }
  
  // Get readable payment method
  const methodLabels: Record<string, string> = {
    'dinheiro': 'Dinheiro',
    'pix': 'PIX',
    'cartao': 'Cartão',
    'transferencia': 'Transferência Bancária',
    'A definir': 'Não especificado'
  };
  const readableMethod = methodLabels[data.paymentMethod] || data.paymentMethod;
  doc.text(`Método de Pagamento: ${readableMethod}`, 20, yPos)
  yPos += 20
  
  // Valor - destacado
  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text(`VALOR PAGO: R$ ${data.value.toFixed(2).replace('.', ',')}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 20
  
  // Reset font
  doc.setFont(undefined, 'normal')
  
  // Texto de confirmação
  doc.setFontSize(12)
  let confirmationText: string
  let confirmationText2: string
  
  if (isPackage) {
    confirmationText = `Recebi do(a) Sr(a). ${data.clientName} a quantia de R$ ${data.value.toFixed(2).replace('.', ',')} `
    confirmationText2 = `referente ao pacote "${data.packageName || 'Pacote de Sessões'}".`
  } else {
    confirmationText = `Recebi do(a) Sr(a). ${data.clientName} a quantia de R$ ${data.value.toFixed(2).replace('.', ',')} `
    confirmationText2 = `referente à sessão${isRecurring ? ' recorrente' : ''} realizada em ${format(new Date(data.sessionDate), 'dd/MM/yyyy', { locale: ptBR })}.`
  }
  
  doc.text(confirmationText, 20, yPos)
  yPos += 15
  doc.text(confirmationText2, 20, yPos)
  yPos += 25
  
  // Data e local
  doc.text(`São Paulo, ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`, 20, yPos)
  yPos += 20
  
  // Linha para assinatura
  doc.line(pageWidth - 120, yPos, pageWidth - 20, yPos)
  yPos += 15
  doc.text(data.professionalName, pageWidth - 70, yPos, { align: 'center' })
  if (data.professionalCRP) {
    yPos += 10
    doc.text(`CRP: ${data.professionalCRP}`, pageWidth - 70, yPos, { align: 'center' })
  }
  
  // Observações
  yPos += 30
  doc.setFontSize(10)
  doc.text('* Este recibo tem validade fiscal conforme legislação vigente.', 20, yPos)
  doc.text('* Gerado automaticamente pelo sistema TherapyPro.', 20, yPos + 10)
  
  // Footer com informações do sistema
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text('Documento gerado em: ' + format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }), pageWidth / 2, 280, { align: 'center' })
  doc.text(`ID: ${data.sessionId}`, pageWidth / 2, 288, { align: 'center' })
  
  // Salvar o PDF
  const typeLabel = isPackage ? 'pacote' : isRecurring ? 'recorrente' : 'recibo'
  const fileName = `${typeLabel}-${data.clientName.replace(/\s+/g, '-')}-${format(new Date(data.sessionDate), 'yyyy-MM-dd')}.pdf`
  doc.save(fileName)
}