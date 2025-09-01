import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Construction, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Eventos() {
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Eventos</h1>
          </div>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center">
                <Construction className="h-8 w-8 text-warning" />
              </div>
            </div>
            <CardTitle className="text-xl">Funcionalidade em Desenvolvimento</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              A funcionalidade de <strong>Eventos</strong> está sendo desenvolvida e estará disponível em breve.
            </p>
            <p className="text-sm text-muted-foreground">
              Em breve você poderá criar, gerenciar e acompanhar eventos profissionais 
              diretamente na plataforma.
            </p>
            <div className="pt-4">
              <Button onClick={() => navigate('/dashboard')}>
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}