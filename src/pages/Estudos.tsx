import { Layout } from "@/components/Layout";
import { PlanProtection } from "@/components/PlanProtection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Lock } from "lucide-react";

const Estudos = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Estudos</h1>
            <p className="text-muted-foreground">Materiais e recursos educacionais</p>
          </div>
        </div>

        <PlanProtection feature="Estudos" requiresPremium={true}>
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
                Em breve você terá acesso a materiais de estudo, artigos científicos, 
                cursos e recursos educacionais para aprimorar sua prática profissional.
              </p>
            </CardContent>
          </Card>
        </PlanProtection>
      </div>
    </Layout>
  );
};

export default Estudos;