import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export default function Eventos() {
  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Eventos</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Gestão de Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aqui você poderá gerenciar seus eventos e atividades.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}