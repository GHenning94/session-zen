import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, User, CheckCircle, Stethoscope } from "lucide-react"
import "./PublicRegistration.styles.css"

interface ClientData {
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  genero: string;
  endereco: string;
  cpf: string;
  profissao: string;
  plano_saude: string;
  medicamentos: string[];
  tratamento: string;
  eh_crianca_adolescente: boolean;
  nome_pai: string;
  telefone_pai: string;
  nome_mae: string;
  telefone_mae: string;
  contato_emergencia_1_nome: string;
  contato_emergencia_1_telefone: string;
  contato_emergencia_2_nome: string;
  contato_emergencia_2_telefone: string;
  pais: string;
  emergencia_igual_pais: boolean;
}

const PublicRegistration = () => {
  const { token } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'used' | 'expired' | 'not_found' | 'error'>('valid')
  const [professionalName, setProfessionalName] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [isCompleteForm, setIsCompleteForm] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState<ClientData>({
    nome: "",
    email: "",
    telefone: "",
    data_nascimento: "",
    genero: "",
    endereco: "",
    cpf: "",
    profissao: "",
    plano_saude: "",
    medicamentos: [],
    tratamento: "",
    eh_crianca_adolescente: false,
    nome_pai: "",
    telefone_pai: "",
    nome_mae: "",
    telefone_mae: "",
    contato_emergencia_1_nome: "",
    contato_emergencia_1_telefone: "",
    contato_emergencia_2_nome: "",
    contato_emergencia_2_telefone: "",
    pais: "",
    emergencia_igual_pais: false,
  })

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenStatus('not_found')
        setErrorMessage('Link inválido ou expirado')
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.functions.invoke('validate-registration-token', {
          body: { token }
        })

        if (error) {
          console.error('Error validating token:', error)
          setTokenStatus('error')
          setErrorMessage('Erro ao validar link')
        } else {
          setTokenStatus(data.status)
          
          if (data.status === 'valid') {
            setProfessionalName(data.professionalName || 'Profissional')
          } else if (data.status === 'used') {
            setErrorMessage('Este link já foi utilizado.')
          } else if (data.status === 'expired' || data.status === 'not_found') {
            setErrorMessage('Link inválido ou expirado')
          } else {
            setErrorMessage(data.error || 'Erro ao validar link')
          }
        }
      } catch (error) {
        console.error('Error validating token:', error)
        setTokenStatus('error')
        setErrorMessage('Erro ao validar link')
      } finally {
        setIsLoading(false)
      }
    }

    validateToken()
  }, [token])

  const handleInputChange = (field: keyof ClientData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMedicamentosChange = (value: string) => {
    // CORREÇÃO: Não enviar array vazio, enviar array vazio real para evitar '[]'
    const medicamentos = value.split(',').map(med => med.trim()).filter(med => med)
    handleInputChange('medicamentos', medicamentos.length > 0 ? medicamentos : [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha pelo menos o nome e e-mail.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      const { data, error } = await supabase.functions.invoke('register-client-via-token', {
        body: {
          token,
          clientData: formData
        }
      })

      if (error) {
        throw new Error(error.message || 'Erro ao cadastrar')
      }

      if (data.success) {
        setIsSuccess(true)
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "O profissional será notificado sobre seu cadastro.",
        })
      } else {
        throw new Error(data.error || 'Erro desconhecido')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      toast({
        title: "Erro no cadastro",
        description: error.message || "Não foi possível realizar o cadastro.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-radial from-primary/20 via-background to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Validando convite...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenStatus !== 'valid') {
    return (
      <div className="min-h-screen bg-gradient-radial from-primary/20 via-background to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8 space-y-4">
            <User className="w-12 h-12 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">
              {tokenStatus === 'used' ? 'Link Já Utilizado' : 'Link Inválido'}
            </h1>
            <p className="text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              {tokenStatus === 'used' 
                ? 'Este link já foi usado para cadastrar um paciente.' 
                : 'Entre em contato com o profissional para obter um novo link.'}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-radial from-primary/20 via-background to-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-8 space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
            <h1 className="text-2xl font-bold text-green-600">Cadastro Realizado!</h1>
            <p className="text-muted-foreground">
              Cadastro realizado com sucesso! O profissional será notificado.
            </p>
            <p className="text-sm text-muted-foreground">
              Você pode fechar esta página agora.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-radial from-primary/20 via-background to-background light relative overflow-hidden">
      {/* Blob effect no canto direito */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="blob blob-right-1"></div>
        <div className="blob blob-right-2"></div>
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b relative z-10">
        <div className="container mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Stethoscope className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">TherapyPro</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        {/* Welcome Message */}
        <Card className="mb-6 shadow-soft bg-white">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Bem-vindo ao Cadastro de Paciente</h2>
            <p className="text-gray-600">
              Olá! Você foi convidado(a) por <strong>{professionalName}</strong> para preencher seu cadastro.
              <br />Por favor, complete os dados abaixo.
            </p>
          </CardContent>
        </Card>

        {/* Form Type Toggle */}
        <Card className="mb-6 shadow-soft bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-4">
              <Button 
                type="button"
                variant={!isCompleteForm ? "default" : "outline"}
                onClick={() => setIsCompleteForm(false)}
                className="px-6"
              >
                Cadastro Rápido
              </Button>
              <Button 
                type="button"
                variant={isCompleteForm ? "default" : "outline"}
                onClick={() => setIsCompleteForm(true)}
                className="px-6"
              >
                Cadastro Completo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card className="shadow-soft bg-white">
          <CardHeader>
            <CardTitle className="text-gray-900">
              {isCompleteForm ? "Cadastro Completo" : "Cadastro Rápido"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              Preencha suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
              {/* Checkbox Criança/Adolescente - Sempre visível */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Switch
                  id="eh_crianca_adolescente"
                  checked={formData.eh_crianca_adolescente}
                  onCheckedChange={(checked) => handleInputChange('eh_crianca_adolescente', checked)}
                />
                <Label htmlFor="eh_crianca_adolescente" className="text-gray-900">É criança ou adolescente</Label>
              </div>

              {/* Campos obrigatórios sempre visíveis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-gray-900">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    required
                    className="bg-white text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-900">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                  />
                </div>
              </div>

              {/* CORREÇÃO: Adicionar TODOS os campos em ambos cadastros (exceto foto) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genero">Gênero</Label>
                  <Select value={formData.genero} onValueChange={(value) => handleInputChange('genero', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                      <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profissao">Profissão</Label>
                  <Input
                    id="profissao"
                    value={formData.profissao}
                    onChange={(e) => handleInputChange('profissao', e.target.value)}
                  />
                </div>
              </div>

              {isCompleteForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pais">País</Label>
                    <Input
                      id="pais"
                      value={formData.pais}
                      onChange={(e) => handleInputChange('pais', e.target.value)}
                      placeholder="Digite o país"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Textarea
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  placeholder="Digite o endereço completo: CEP / Bairro etc (opcional)"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plano_saude">Plano de Saúde</Label>
                  <Input
                    id="plano_saude"
                    value={formData.plano_saude}
                    onChange={(e) => handleInputChange('plano_saude', e.target.value)}
                    placeholder="Digite para buscar..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tratamento">Tratamento</Label>
                  <Input
                    id="tratamento"
                    value={formData.tratamento}
                    onChange={(e) => handleInputChange('tratamento', e.target.value)}
                    placeholder="Digite para buscar..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicamentos">Medicamento:</Label>
                <Textarea
                  id="medicamentos"
                  value={formData.medicamentos.join(', ')}
                  onChange={(e) => handleMedicamentosChange(e.target.value)}
                  placeholder="Digite para buscar..."
                  rows={2}
                />
              </div>

              {isCompleteForm && (
                <>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="eh_crianca_adolescente"
                      checked={formData.eh_crianca_adolescente}
                      onCheckedChange={(checked) => handleInputChange('eh_crianca_adolescente', checked)}
                    />
                    <Label htmlFor="eh_crianca_adolescente">É criança ou adolescente</Label>
                  </div>

                  {formData.eh_crianca_adolescente && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nome_pai">Nome do Pai</Label>
                          <Input
                            id="nome_pai"
                            value={formData.nome_pai}
                            onChange={(e) => handleInputChange('nome_pai', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone_pai">Telefone do Pai</Label>
                          <Input
                            id="telefone_pai"
                            value={formData.telefone_pai}
                            onChange={(e) => handleInputChange('telefone_pai', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nome_mae">Nome da Mãe</Label>
                          <Input
                            id="nome_mae"
                            value={formData.nome_mae}
                            onChange={(e) => handleInputChange('nome_mae', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="telefone_mae">Telefone da Mãe</Label>
                          <Input
                            id="telefone_mae"
                            value={formData.telefone_mae}
                            onChange={(e) => handleInputChange('telefone_mae', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="emergencia_igual_pais"
                          checked={formData.emergencia_igual_pais}
                          onCheckedChange={(checked) => handleInputChange('emergencia_igual_pais', checked)}
                        />
                        <Label htmlFor="emergencia_igual_pais">Contato de emergência igual aos pais</Label>
                      </div>
                    </>
                  )}

                  {!formData.emergencia_igual_pais && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contato_emergencia_1_nome">Contato Emergência 1 - Nome</Label>
                          <Input
                            id="contato_emergencia_1_nome"
                            value={formData.contato_emergencia_1_nome}
                            onChange={(e) => handleInputChange('contato_emergencia_1_nome', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contato_emergencia_1_telefone">Contato Emergência 1 - Telefone</Label>
                          <Input
                            id="contato_emergencia_1_telefone"
                            value={formData.contato_emergencia_1_telefone}
                            onChange={(e) => handleInputChange('contato_emergencia_1_telefone', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contato_emergencia_2_nome">Contato Emergência 2 - Nome</Label>
                          <Input
                            id="contato_emergencia_2_nome"
                            value={formData.contato_emergencia_2_nome}
                            onChange={(e) => handleInputChange('contato_emergencia_2_nome', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contato_emergencia_2_telefone">Contato Emergência 2 - Telefone</Label>
                          <Input
                            id="contato_emergencia_2_telefone"
                            value={formData.contato_emergencia_2_telefone}
                            onChange={(e) => handleInputChange('contato_emergencia_2_telefone', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-gradient-primary hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          TherapyPro © Todos os direitos reservados
        </div>
      </div>
    </div>
  )
}

export default PublicRegistration