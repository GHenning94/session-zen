import { Layout } from "@/components/Layout"
import { MetasManager } from "@/components/MetasManager"

export default function Metas() {
  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground mt-1">
            Defina e acompanhe suas metas de crescimento profissional
          </p>
        </div>
      </div>
      <MetasManager />
    </Layout>
  )
}
