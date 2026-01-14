import { useState, useEffect } from 'react';
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMetas, MetaTipo, MetaPeriodo } from '@/hooks/useMetas';
import { useTerminology } from '@/hooks/useTerminology';
import { useSubscription } from '@/hooks/useSubscription';
import { FeatureGate } from '@/components/FeatureGate';
import { NewFeatureBadge } from '@/components/NewFeatureBadge';
import { CheckCircle2, Target, Pencil, Trash2, History, Calendar, Info, AlertTriangle, Lock } from 'lucide-react';
import { formatCurrencyBR } from '@/utils/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function Metas() {
  const { hasAccessToFeature } = useSubscription();
  const { user } = useAuth();
  const { metas, isLoading, createMeta, updateMeta, updateMetaPeriodo, deleteMeta, getTipoLabel, getPeriodoLabel } = useMetas();
  const { clientTermPlural } = useTerminology();
  const [novoValor, setNovoValor] = useState<Record<MetaTipo, string>>({
    sessoes: '',
    clientes: '',
    receita: '',
    pacotes: '',
    ticket_medio: ''
  });
  const [novoPeriodo, setNovoPeriodo] = useState<Record<MetaTipo, MetaPeriodo>>({
    sessoes: 'diario',
    clientes: 'mensal',
    receita: 'mensal',
    pacotes: 'mensal',
    ticket_medio: 'mensal'
  });
  const [editingMeta, setEditingMeta] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editPeriodo, setEditPeriodo] = useState<MetaPeriodo>('mensal');
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [metaToDelete, setMetaToDelete] = useState<string | null>(null);
  
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningData, setWarningData] = useState<{
    tipo: MetaTipo;
    valorAtual: number;
    valorDefinido: number;
    isEdit?: boolean;
    metaId?: string;
  } | null>(null);
  
  const [valoresAtuais, setValoresAtuais] = useState<Record<MetaTipo, number>>({
    sessoes: 0,
    clientes: 0,
    receita: 0,
    pacotes: 0,
    ticket_medio: 0
  });

  const tiposMeta: MetaTipo[] = ['sessoes', 'clientes', 'receita', 'pacotes', 'ticket_medio'];
  
  useEffect(() => {
    const loadValoresAtuais = async () => {
      if (!user) return;
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      
      try {
        const [sessionsRes, clientsRes, paymentsRes, packagesRes, allSessionsRes] = await Promise.all([
          supabase.from('sessions').select('id').eq('user_id', user.id).gte('created_at', startOfMonth),
          supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('ativo', true),
          supabase.from('payments').select('valor').eq('user_id', user.id).eq('status', 'pago').gte('created_at', startOfMonth),
          supabase.from('packages').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'ativo'),
          supabase.from('sessions').select('status').eq('user_id', user.id)
        ]);
        
        const totalSessions = allSessionsRes.data?.length || 0;
        const completedSessions = allSessionsRes.data?.filter(s => s.status === 'realizada').length || 0;
        const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
        
        setValoresAtuais({
          sessoes: sessionsRes.data?.length || 0,
          clientes: clientsRes.count || 0,
          receita: paymentsRes.data?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0,
          pacotes: packagesRes.count || 0,
          ticket_medio: completionRate
        });
      } catch (error) {
        console.error('Erro ao carregar valores atuais:', error);
      }
    };
    
    loadValoresAtuais();
  }, [user]);

  const handleCreateMeta = async (tipo: MetaTipo, forceCreate = false) => {
    const valor = parseFloat(novoValor[tipo]);
    if (isNaN(valor) || valor <= 0) {
      return;
    }
    
    const valorAtual = valoresAtuais[tipo];
    if (!forceCreate && valor <= valorAtual) {
      setWarningData({ tipo, valorAtual, valorDefinido: valor });
      setWarningModalOpen(true);
      return;
    }

    await createMeta(tipo, valor, novoPeriodo[tipo]);
    setNovoValor(prev => ({ ...prev, [tipo]: '' }));
  };
  
  const handleConfirmCreateMeta = async () => {
    if (!warningData) return;
    
    await createMeta(warningData.tipo, warningData.valorDefinido, novoPeriodo[warningData.tipo]);
    setNovoValor(prev => ({ ...prev, [warningData.tipo]: '' }));
    setWarningModalOpen(false);
    setWarningData(null);
  };

  const handleUpdatePeriodo = async (metaId: string, periodo: MetaPeriodo) => {
    await updateMetaPeriodo(metaId, periodo);
  };

  const getMetaAtiva = (tipo: MetaTipo) => {
    return metas.find(m => m.tipo === tipo && m.ativa && !m.concluida);
  };

  const getMetaConcluida = (tipo: MetaTipo) => {
    const metasConcluidas = metas.filter(m => m.tipo === tipo && m.concluida && !m.ativa);
    if (metasConcluidas.length === 0) return undefined;
    
    return metasConcluidas.sort((a, b) => 
      new Date(b.data_conclusao || b.created_at).getTime() - new Date(a.data_conclusao || a.created_at).getTime()
    )[0];
  };

  const getHistoricoMetas = (tipo: MetaTipo) => {
    return metas.filter(m => m.tipo === tipo && m.concluida).sort((a, b) => 
      new Date(b.data_conclusao!).getTime() - new Date(a.data_conclusao!).getTime()
    );
  };

  const handleEdit = async (metaId: string, forceEdit = false) => {
    const valor = parseFloat(editValue);
    if (isNaN(valor) || valor <= 0) {
      return;
    }
    
    const meta = metas.find(m => m.id === metaId);
    if (!meta) return;
    
    const valorAtual = valoresAtuais[meta.tipo as MetaTipo];
    if (!forceEdit && valor <= valorAtual) {
      setWarningData({ 
        tipo: meta.tipo as MetaTipo, 
        valorAtual, 
        valorDefinido: valor, 
        isEdit: true, 
        metaId 
      });
      setWarningModalOpen(true);
      return;
    }

    await updateMeta(metaId, valor);
    setEditingMeta(null);
    setEditValue('');
  };
  
  const handleConfirmEditMeta = async () => {
    if (!warningData || !warningData.isEdit || !warningData.metaId) return;
    
    await updateMeta(warningData.metaId, warningData.valorDefinido);
    setEditingMeta(null);
    setEditValue('');
    setWarningModalOpen(false);
    setWarningData(null);
  };

  const handleDelete = async () => {
    if (!metaToDelete) return;
    await deleteMeta(metaToDelete);
    setDeleteConfirmOpen(false);
    setMetaToDelete(null);
  };

  const openDeleteConfirm = (metaId: string) => {
    setMetaToDelete(metaId);
    setDeleteConfirmOpen(true);
  };

  const startEdit = (metaId: string, currentValue: number, currentPeriodo: MetaPeriodo) => {
    setEditingMeta(metaId);
    setEditValue(currentValue.toString());
    setEditPeriodo(currentPeriodo);
  };

  const formatarValor = (tipo: MetaTipo, valor: number) => {
    if (tipo === 'receita') {
      return formatCurrencyBR(valor);
    }
    if (tipo === 'ticket_medio') {
      return `${valor}%`;
    }
    return valor.toString();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
            <p className="text-muted-foreground mt-1">
              Defina e acompanhe suas metas de crescimento profissional
            </p>
          </div>
          <div className="space-y-4">
            {tiposMeta.map((tipo) => (
              <Card key={tipo}>
                <CardHeader>
                  <div className="h-6 bg-muted animate-pulse rounded w-32" />
                  <div className="h-4 bg-muted animate-pulse rounded w-48 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Feature Gate - block entire page for basic plan
  if (!hasAccessToFeature('goals')) {
    return (
      <Layout>
        <div className="space-y-4 md:space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
            <p className="text-muted-foreground mt-1">
              Defina e acompanhe suas metas de crescimento profissional
            </p>
          </div>
          
          <FeatureGate feature="goals" showLocked={true}>
            <Card className="min-h-[400px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Sistema de Metas
                </CardTitle>
                <CardDescription>
                  Defina metas de sessões, receita, pacientes e acompanhe seu progresso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {['Sessões', 'Clientes', 'Receita', 'Pacotes'].map((tipo) => (
                    <Card key={tipo} className="p-4">
                      <div className="h-4 bg-muted rounded w-24 mb-2" />
                      <div className="h-6 bg-muted rounded w-16" />
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FeatureGate>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
            <p className="text-muted-foreground mt-1">
              Defina e acompanhe suas metas de crescimento profissional
            </p>
          </div>
          <NewFeatureBadge featureKey="goals" />
        </div>
        
        <Tabs defaultValue="gerenciar" className="w-full">
          <Collapsible open={isLegendOpen} onOpenChange={setIsLegendOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
                <span>Como funciona o sistema de metas?</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2 bg-muted/50">
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p><strong>Sessões:</strong> Conta sessões do período atual (dia, semana ou mês corrente), independente do status.</p>
                  </div>
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p><strong>Clientes:</strong> Considera o total de clientes ativos na sua base.</p>
                  </div>
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p><strong>Receita:</strong> Soma os pagamentos com status "pago" no período selecionado (diário, semanal ou mensal).</p>
                  </div>
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p><strong>Pacotes:</strong> Conta pacotes ativos no momento.</p>
                  </div>
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p><strong>Performance:</strong> Calcula a taxa de sessões realizadas sobre o total de sessões.</p>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <p className="text-muted-foreground">
                      <strong>Período:</strong> Define se a meta é diária, semanal ou mensal. A contagem é zerada ao início de cada período.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
          
          <TabsList className="grid w-full grid-cols-2 mt-4">
            <TabsTrigger value="gerenciar">
              <Target className="h-4 w-4 mr-2" />
              Gerenciar Metas
            </TabsTrigger>
            <TabsTrigger value="historico">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gerenciar" className="mt-4 space-y-4">
            {tiposMeta.map((tipo) => {
              const metaAtiva = getMetaAtiva(tipo);
              const metaConcluida = getMetaConcluida(tipo);

              return (
                <Card key={tipo}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{getTipoLabel(tipo, clientTermPlural)}</CardTitle>
                      {!metaAtiva && metaConcluida && (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Meta {metaConcluida.versao} Concluída
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {metaAtiva
                        ? `Meta ${metaAtiva.versao} (${getPeriodoLabel(metaAtiva.periodo)}): ${formatarValor(tipo, metaAtiva.valor_meta)}`
                        : 'Nenhuma meta definida'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!metaAtiva ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label htmlFor={`meta-${tipo}`} className="sr-only">
                              Valor da meta
                            </Label>
                            <Input
                              id={`meta-${tipo}`}
                              type="number"
                              placeholder={
                                tipo === 'receita'
                                  ? 'Ex: 10000'
                                  : tipo === 'ticket_medio'
                                  ? 'Ex: 90'
                                  : 'Ex: 100'
                              }
                              value={novoValor[tipo]}
                              onChange={(e) =>
                                setNovoValor((prev) => ({ ...prev, [tipo]: e.target.value }))
                              }
                            />
                          </div>
                          <Select 
                            value={novoPeriodo[tipo]} 
                            onValueChange={(v) => setNovoPeriodo(prev => ({ ...prev, [tipo]: v as MetaPeriodo }))}
                          >
                            <SelectTrigger className="w-[130px]">
                              <Calendar className="h-4 w-4 mr-2" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="diario">Diário</SelectItem>
                              <SelectItem value="semanal">Semanal</SelectItem>
                              <SelectItem value="mensal">Mensal</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button onClick={() => handleCreateMeta(tipo)} size="sm" className="bg-gradient-primary hover:opacity-90">
                            {metaConcluida ? `Meta ${metaConcluida.versao + 1}` : 'Criar'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editingMeta === metaAtiva.id ? (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="Novo valor"
                            />
                            <Button onClick={() => handleEdit(metaAtiva.id)} size="sm">
                              Salvar
                            </Button>
                            <Button 
                              onClick={() => {
                                setEditingMeta(null);
                                setEditValue('');
                              }} 
                              variant="outline" 
                              size="sm"
                            >
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {getPeriodoLabel(metaAtiva.periodo)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Meta em progresso
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Select 
                                  value={metaAtiva.periodo} 
                                  onValueChange={(v) => handleUpdatePeriodo(metaAtiva.id, v as MetaPeriodo)}
                                >
                                  <SelectTrigger className="w-[110px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="diario">Diário</SelectItem>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                    <SelectItem value="mensal">Mensal</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => startEdit(metaAtiva.id, metaAtiva.valor_meta, metaAtiva.periodo)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => openDeleteConfirm(metaAtiva.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="historico" className="mt-4 space-y-4">
            {tiposMeta.map((tipo) => {
              const historico = getHistoricoMetas(tipo);
              
              if (historico.length === 0) return null;

              return (
                <Card key={tipo}>
                  <CardHeader>
                    <CardTitle className="text-lg">{getTipoLabel(tipo, clientTermPlural)}</CardTitle>
                    <CardDescription>
                      {historico.length} meta{historico.length > 1 ? 's' : ''} concluída{historico.length > 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {historico.map((meta) => (
                        <div key={meta.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="success" className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Meta {meta.versao}
                              </Badge>
                              <span className="text-sm font-medium">
                                {formatarValor(tipo, meta.valor_meta)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Concluída em {new Date(meta.data_conclusao!).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {tiposMeta.every(tipo => getHistoricoMetas(tipo).length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma meta concluída ainda. Continue trabalhando em suas metas!
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Meta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A meta será permanentemente excluída.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setMetaToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={warningModalOpen} onOpenChange={setWarningModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Meta Já Cumprida
              </DialogTitle>
              <DialogDescription className="pt-4 space-y-3">
                <p>
                  O valor definido (<strong>{warningData ? formatarValor(warningData.tipo, warningData.valorDefinido) : ''}</strong>) 
                  é menor ou igual ao seu valor atual.
                </p>
                <p className="text-foreground font-medium">
                  Valor atual: <span className="text-primary">{warningData ? formatarValor(warningData.tipo, warningData.valorAtual) : ''}</span>
                </p>
                <p>
                  Para definir uma meta desafiadora, utilize um valor acima de{' '}
                  <strong className="text-primary">{warningData ? formatarValor(warningData.tipo, warningData.valorAtual) : ''}</strong>.
                </p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setWarningModalOpen(false)}>
                Alterar Valor
              </Button>
              <Button variant="secondary" onClick={warningData?.isEdit ? handleConfirmEditMeta : handleConfirmCreateMeta}>
                {warningData?.isEdit ? 'Editar Mesmo Assim' : 'Criar Mesmo Assim'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
