import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function Sessoes() {
  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Sessões</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Sessões</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aqui você poderá visualizar e gerenciar o histórico das suas sessões.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}