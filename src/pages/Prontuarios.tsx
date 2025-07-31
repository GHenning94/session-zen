import { Layout } from '@/components/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

export default function Prontuarios() {
  return (
    <Layout>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Prontuários</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sistema de Prontuários</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Aqui você poderá gerenciar os prontuários dos seus pacientes.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}