import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package as PackageIcon, Plus, Users, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Package, usePackages } from '@/hooks/usePackages';
import { PackageModal } from '@/components/PackageModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';

export default function Pacotes() {
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const { getPackageProgress } = usePackages();

  const { data: packages, refetch } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          clients (
            id,
            nome
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (Package & { clients: { id: string; nome: string } })[];
    }
  });

  const statusConfig = {
    ativo: { label: 'Ativo', variant: 'default' as const, color: 'bg-green-500' },
    concluido: { label: 'Concluído', variant: 'secondary' as const, color: 'bg-blue-500' },
    cancelado: { label: 'Cancelado', variant: 'destructive' as const, color: 'bg-red-500' }
  };

  const handleEditPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    setIsPackageModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedPackage(null);
    setIsPackageModalOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <PackageIcon className="h-8 w-8" />
              Pacotes de Sessões
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie pacotes de sessões para seus clientes
            </p>
          </div>
          <Button onClick={() => setIsPackageModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pacote
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pacotes Ativos</CardTitle>
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {packages?.filter(p => p.status === 'ativo').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sessões Disponíveis</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {packages?.reduce((acc, p) => {
                  if (p.status === 'ativo') {
                    return acc + (p.total_sessoes - p.sessoes_consumidas);
                  }
                  return acc;
                }, 0) || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valor Total Ativo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {packages?.filter(p => p.status === 'ativo')
                  .reduce((acc, p) => acc + p.valor_total, 0)
                  .toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Packages Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {packages?.map((pkg: any) => {
            const progress = getPackageProgress(pkg);
            const config = statusConfig[pkg.status];

            return (
              <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{pkg.nome}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {pkg.clients?.nome}
                      </div>
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {progress.consumed} / {progress.total} sessões
                      </span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                    {progress.remaining > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {progress.remaining} sessão{progress.remaining !== 1 ? 'ões' : ''} restante{progress.remaining !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Package Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor Total:</span>
                      <span className="font-medium">R$ {pkg.valor_total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor/Sessão:</span>
                      <span className="font-medium">
                        R$ {pkg.valor_por_sessao?.toFixed(2) || (pkg.valor_total / pkg.total_sessoes).toFixed(2)}
                      </span>
                    </div>
                    {pkg.data_inicio && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Início:</span>
                        <span>{format(new Date(pkg.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                    )}
                    {pkg.data_fim && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Término:</span>
                        <span>{format(new Date(pkg.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditPackage(pkg)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        // TODO: Navigate to sessions filtered by package
                        window.location.href = `/sessoes?package_id=${pkg.id}`;
                      }}
                    >
                      Ver Sessões
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {packages?.length === 0 && (
            <div className="col-span-full text-center py-12">
              <PackageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum pacote criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro pacote de sessões para começar
              </p>
              <Button onClick={() => setIsPackageModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Pacote
              </Button>
            </div>
          )}
        </div>
      </div>

      <PackageModal
        open={isPackageModalOpen}
        onOpenChange={handleCloseModal}
        package={selectedPackage}
        onSave={() => {
          refetch();
          handleCloseModal();
        }}
      />
    </Layout>
  );
}
