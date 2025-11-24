import { Layout } from "@/components/Layout"
import { MetasManager } from "@/components/MetasManager"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Metas() {
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
            <p className="text-muted-foreground mt-1">
              Defina e acompanhe suas metas de crescimento profissional
            </p>
          </div>
        </div>

        <MetasManager />
      </div>
    </Layout>
  )
}
