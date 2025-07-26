import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Clock, Info, CreditCard, DollarSign, Mail, Phone, CheckCircle } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

const BookingPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const [therapistData, setTherapistData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadTherapistData = useCallback(async () => {
    if (!slug) {
      setIsLoading(false)
      return
    }

    try {
      // CHAMANDO A NOVA FUNÇÃO RPC
      const { data, error } = await supabase
        .rpc('get_public_profile_by_slug', { page_slug: slug });

      if (error || !data) {
        console.error('Erro ao chamar a função get_public_profile_by_slug:', error);
        setTherapistData(null);
        return;
      }
      
      // A função retorna um objeto JSON com duas chaves: 'config' e 'profile'
      // Vamos unificá-las em um único objeto para a página usar
      const unifiedData = { ...data.config, ...data.profile };
      setTherapistData(unifiedData);

    } catch (error) {
      console.error('Erro geral ao buscar terapeuta:', error);
    } finally {
      setIsLoading(false);
    }
  }, [slug])

  useEffect(() => { loadTherapistData() }, [loadTherapistData])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="ml-4">Carregando informações...</p>
      </div>
    )
  }
  
  if (!therapistData) {
    return (
      <div className="min-h-screen flex items-center justify-center"><p>Perfil de agendamento não encontrado.</p></div>
    )
  }

  const paymentMethods = [
    { key: 'aceita_pix', label: 'Pix' }, { key: 'aceita_cartao', label: 'Cartão de Crédito' },
    { key: 'aceita_transferencia', label: 'Transferência' }, { key: 'aceita_dinheiro', label: 'Dinheiro' }
  ].filter(method => therapistData[method.key])

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">{therapistData.page_title || 'Agendar Consulta'}</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{therapistData.page_description || `Agende sua consulta com ${therapistData.nome}`}</p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div className="text-left">
                <h2 className="text-2xl font-semibold">{therapistData.nome}</h2>
                <p className="text-muted-foreground capitalize">{therapistData.profissao}{therapistData.especialidade ? ` - ${therapistData.especialidade}` : ''}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {therapistData.show_duration && <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /><span>{therapistData.duracao_sessao || '50'} minutos</span></div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          {therapistData.bio && (
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Info className="w-5 h-5 text-primary"/>Sobre</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{therapistData.bio}</p></CardContent></Card>
          )}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary"/>Contato e Credenciais</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {therapistData.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4"/>{therapistData.email}</div>}
              {therapistData.telefone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4"/>{therapistData.telefone}</div>}
              {therapistData.crp && <div className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4"/>{therapistData.crp}</div>}
            </CardContent>
          </Card>
          {paymentMethods.length > 0 && (
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary"/>Formas de Pagamento</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{paymentMethods.map(method => <Badge key={method.key} variant="secondary">{method.label}</Badge>)}</CardContent></Card>
          )}
        </div>
        <div className="lg:col-span-2">
          <Card className="shadow-lg"><CardHeader><CardTitle>Agendar Consulta</CardTitle><CardDescription>Preencha seus dados para agendar</CardDescription></CardHeader><CardContent><p>Formulário de agendamento entra aqui.</p></CardContent></Card>
        </div>
      </main>
    </div>
  )
}

export default BookingPage