import { Layout } from "@/components/Layout";
import { PlanProtection } from "@/components/PlanProtection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, Lock } from "lucide-react";

const RedesSociais = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Share2 className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Redes Sociais</h1>
            <p className="text-muted-foreground">Integração e gerenciamento de mídias sociais</p>
          </div>
        </div>

        <PlanProtection feature="Redes Sociais" requiresPremium={true}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Funcionalidade em Desenvolvimento
              </CardTitle>
              <CardDescription>
                Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Em breve você poderá integrar suas redes sociais, programar posts, 
                gerenciar seu conteúdo e acompanhar métricas de engajamento.
              </p>
            </CardContent>
          </Card>
        </PlanProtection>
      </div>
    </Layout>
  );
};

export default RedesSociais;