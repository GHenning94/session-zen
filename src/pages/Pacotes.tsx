import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package as PackageIcon, Plus, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Package, usePackages } from '@/hooks/usePackages';
import { PackageModal } from '@/components/PackageModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { formatPaymentMethod } from '@/utils/formatters';
import { decryptSensitiveDataBatch } from '@/utils/encryptionMiddleware';
import { ClientAvatar } from '@/components/ClientAvatar';

export default function Pacotes() {
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const { getPackageProgress } = usePackages();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Function to recalculate sessoes_consumidas for all packages based on actual sessions
  const recalculateAllPackagesConsumption = useCallback(async (packagesData: Package[]) => {
    if (!packagesData || packagesData.length === 0) return;
    
    for (const pkg of packagesData) {
      // Count sessions with status 'realizada' for this package
      const { data: realizedSessions, error: countError } = await supabase
        .from('sessions')
        .select('id')
        .eq('package_id', pkg.id)
        .eq('status', 'realizada');
      
      if (countError) {
        console.error('Error counting realized sessions:', countError);
        continue;
      }

      const consumedCount = realizedSessions?.length || 0;
      
      // Only update if the count is different
      if (consumedCount !== pkg.sessoes_consumidas) {
        console.log(`[Pacotes] Updating package ${pkg.id}: ${pkg.sessoes_consumidas} -> ${consumedCount}`);
        
        let newStatus = pkg.status;
        if (pkg.status !== 'cancelado') {
          newStatus = consumedCount >= pkg.total_sessoes ? 'concluido' : 'ativo';
        }
        
        const { error: updateError } = await supabase
          .from('packages')
          .update({ 
            sessoes_consumidas: consumedCount,
            status: newStatus
          })
          .eq('id', pkg.id);
        
        if (updateError) {
          console.error('Error updating package:', updateError);
        }
      }
    }
  }, []);

  // Fetch packages with client info
  const { data: packages, refetch } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          clients (
            id,
            nome,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Recalculate consumption for all packages and then refetch
      const packagesData = data as (Package & { clients: { id: string; nome: string } })[];
      await recalculateAllPackagesConsumption(packagesData);
      
      // Refetch after recalculation to get updated values
      const { data: refreshedData, error: refreshError } = await supabase
        .from('packages')
        .select(`
          *,
          clients (
            id,
            nome,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });
        
      if (refreshError) throw refreshError;
      
      // Batch decrypt packages (observacoes field)
      const decryptedPackages = await decryptSensitiveDataBatch('packages', refreshedData || []);
      
      return decryptedPackages as (Package & { clients: { id: string; nome: string } })[];
    },
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Fetch sessions count per package
  const { data: sessionCounts } = useQuery({
    queryKey: ['package-session-counts'],
    queryFn: async () => {
      if (!packages || packages.length === 0) return {};
      
      const { data, error } = await supabase
        .from('sessions')
        .select('package_id')
        .in('package_id', packages.map(p => p.id));

      if (error) throw error;
      
      const counts: { [key: string]: number } = {};
      data?.forEach(s => {
        if (s.package_id) {
          counts[s.package_id] = (counts[s.package_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!packages && packages.length > 0,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  // Refetch data when page is focused or sessions are updated
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    
    const handleSessionUpdated = () => {
      refetch();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('sessionUpdated', handleSessionUpdated);
    window.addEventListener('packageUpdated', handleSessionUpdated);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('sessionUpdated', handleSessionUpdated);
      window.removeEventListener('packageUpdated', handleSessionUpdated);
    };
  }, [refetch]);

  // Check for packages without sessions and send notification - only after package creation
  useEffect(() => {
    const checkAndNotifyPackages = async () => {
      if (!packages || !sessionCounts || !user) return;

      // Only check packages that were just created (within last 5 minutes)
      // This prevents notifications from appearing just by visiting the page
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      for (const pkg of packages) {
        if (pkg.status !== 'ativo') continue;
        
        // Only process recently created packages
        if (pkg.created_at < fiveMinutesAgo) continue;
        const createdSessions = sessionCounts[pkg.id] || 0;
        const hasMissingPaymentMethod = !(pkg as any).metodo_pagamento || (pkg as any).metodo_pagamento === 'A definir';
        
        // Check if notification already sent recently (stored in localStorage)
        const notificationKey = `package_notification_${pkg.id}`;
        const lastNotified = localStorage.getItem(notificationKey);
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        
        if (lastNotified && parseInt(lastNotified) > oneDayAgo) continue;

        // Send notification for missing sessions
        if (createdSessions < pkg.total_sessoes) {
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .ilike('titulo', `%${pkg.nome}%`)
            .ilike('conteudo', '%criar sessões%')
            .eq('lida', false)
            .maybeSingle();

          if (!existingNotification) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              titulo: `Pacote "${pkg.nome}" - Sessões pendentes`,
              conteudo: `O pacote "${pkg.nome}" ainda não tem todas as sessões criadas (${createdSessions}/${pkg.total_sessoes}). Clique para criar as sessões. [REDIRECT:/pacotes]`
            });
            localStorage.setItem(notificationKey, Date.now().toString());
          }
        }

        // Send notification for missing payment method
        if (hasMissingPaymentMethod) {
          const { data: existingPaymentNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .ilike('titulo', `%${pkg.nome}%`)
            .ilike('conteudo', '%método de pagamento%')
            .eq('lida', false)
            .maybeSingle();

          if (!existingPaymentNotification) {
            await supabase.from('notifications').insert({
              user_id: user.id,
              titulo: `Pacote "${pkg.nome}" - Método de pagamento`,
              conteudo: `Defina o método de pagamento do pacote "${pkg.nome}" para manter suas métricas atualizadas. [PACKAGE_EDIT:${pkg.id}]`
            });
          }
        }
      }
    };

    checkAndNotifyPackages();
  }, [packages, sessionCounts, user]);

  const statusConfig = {
    ativo: { label: 'Ativo', variant: 'default' as const, color: 'bg-green-500' },
    concluido: { label: 'Concluído', variant: 'secondary' as const, color: 'bg-blue-500' },
    cancelado: { label: 'Cancelado', variant: 'destructive' as const, color: 'bg-red-500' }
  };

  const handleEditPackage = (pkg: Package) => {
    // Se modal já está aberto, fechar primeiro e reabrir
    if (isPackageModalOpen) {
      setIsPackageModalOpen(false);
      setModalKey(prev => prev + 1);
      
      setTimeout(() => {
        setSelectedPackage(pkg);
        setIsPackageModalOpen(true);
      }, 50);
    } else {
      // Modal não está aberto - definir pacote primeiro, depois abrir
      setSelectedPackage(pkg);
      setModalKey(prev => prev + 1);
      // Usar requestAnimationFrame para garantir que o state foi aplicado
      requestAnimationFrame(() => {
        setIsPackageModalOpen(true);
      });
    }
  };

  const handleCloseModal = () => {
    setIsPackageModalOpen(false);
  };

  const handleNewPackage = () => {
    setModalKey(prev => prev + 1);
    setSelectedPackage(null);
    setIsPackageModalOpen(true);
  };

  // Check URL for package edit redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editPackageId = params.get('edit');
    if (editPackageId && packages) {
      const pkg = packages.find(p => p.id === editPackageId);
      if (pkg) {
        handleEditPackage(pkg);
        // Clear URL param
        window.history.replaceState({}, '', '/pacotes');
      }
    }
  }, [packages]);

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <PackageIcon className="h-6 w-6 md:h-8 md:w-8" />
              Pacotes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie pacotes de sessões
            </p>
          </div>
          <Button onClick={handleNewPackage} size="sm" className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Pacote
          </Button>
        </div>

        {/* Stats Cards - Grid 2x2 no mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Pacotes Ativos</CardTitle>
              <PackageIcon className="h-4 w-4 text-muted-foreground hidden md:block" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                {packages?.filter(p => p.status === 'ativo').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Sessões Disp.</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground hidden md:block" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                {packages?.reduce((acc, p) => {
                  if (p.status === 'ativo') {
                    return acc + (p.total_sessoes - p.sessoes_consumidas);
                  }
                  return acc;
                }, 0) || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs md:text-sm font-medium">Valor Total Ativo</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground hidden md:block" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">
                R$ {packages?.filter(p => p.status === 'ativo')
                  .reduce((acc, p) => acc + p.valor_total, 0)
                  .toFixed(2) || '0.00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Packages Grid */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {packages?.map((pkg: any) => {
            const progress = getPackageProgress(pkg);
            const config = statusConfig[pkg.status];
            const createdSessions = sessionCounts?.[pkg.id] || 0;
            const allSessionsCreated = createdSessions >= pkg.total_sessoes;

            return (
              <Card key={pkg.id} className="hover:shadow-lg transition-shadow flex flex-col min-h-[350px] md:h-[420px]">
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{pkg.nome}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ClientAvatar 
                          clientName={pkg.clients?.nome || 'Cliente'} 
                          avatarPath={pkg.clients?.avatar_url} 
                          size="sm" 
                        />
                      </div>
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col flex-grow">
                  <div className="space-y-4 flex-grow overflow-hidden">
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
                          {progress.remaining} {progress.remaining === 1 ? 'sessão restante' : 'sessões restantes'}
                        </p>
                      )}
                    </div>

                    {/* Sessions Created Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sessões Criadas</span>
                        <span className="font-medium">
                          {createdSessions} / {pkg.total_sessoes}
                        </span>
                      </div>
                      <Progress 
                        value={(createdSessions / pkg.total_sessoes) * 100} 
                        className="h-2" 
                      />
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
                      {pkg.metodo_pagamento && pkg.metodo_pagamento !== 'A definir' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pagamento:</span>
                          <span className="font-medium">{formatPaymentMethod(pkg.metodo_pagamento)}</span>
                        </div>
                      )}
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
                  </div>

                  {/* Actions - Always at bottom */}
                  <div className="flex gap-2 pt-4 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditPackage(pkg)}
                    >
                      Editar
                    </Button>
                    {allSessionsCreated ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/sessoes?package_id=${pkg.id}`)}
                      >
                        Ver Sessões
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/sessoes?package_id=${pkg.id}&create=true`)}
                      >
                        Criar Sessões
                      </Button>
                    )}
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
              <Button onClick={handleNewPackage}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Pacote
              </Button>
            </div>
          )}
        </div>
      </div>

      <PackageModal
        key={modalKey}
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