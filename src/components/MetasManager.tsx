import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMetas, MetaTipo, MetaPeriodo } from '@/hooks/useMetas';
import { useTerminology } from '@/hooks/useTerminology';
import { CheckCircle2, Target, Pencil, Trash2, History, Calendar } from 'lucide-react';
import { formatCurrencyBR } from '@/utils/formatters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const MetasManager = () => {
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

  const tiposMeta: MetaTipo[] = ['sessoes', 'clientes', 'receita', 'pacotes', 'ticket_medio'];

  const handleCreateMeta = async (tipo: MetaTipo) => {
    const valor = parseFloat(novoValor[tipo]);
    if (isNaN(valor) || valor <= 0) {
      return;
    }

    await createMeta(tipo, valor, novoPeriodo[tipo]);
    setNovoValor(prev => ({ ...prev, [tipo]: '' }));
  };

  const handleUpdatePeriodo = async (metaId: string, periodo: MetaPeriodo) => {
    await updateMetaPeriodo(metaId, periodo);
  };

  const getMetaAtiva = (tipo: MetaTipo) => {
    return metas.find(m => m.tipo === tipo && m.ativa && !m.concluida);
  };

  const getMetaConcluida = (tipo: MetaTipo) => {
    // Pegar a meta mais recente concluída e não ativa
    const metasConcluidas = metas.filter(m => m.tipo === tipo && m.concluida && !m.ativa);
    if (metasConcluidas.length === 0) return undefined;
    
    // Retornar a mais recente baseado na data de conclusão
    return metasConcluidas.sort((a, b) => 
      new Date(b.data_conclusao || b.created_at).getTime() - new Date(a.data_conclusao || a.created_at).getTime()
    )[0];
  };

  const getHistoricoMetas = (tipo: MetaTipo) => {
    return metas.filter(m => m.tipo === tipo && m.concluida).sort((a, b) => 
      new Date(b.data_conclusao!).getTime() - new Date(a.data_conclusao!).getTime()
    );
  };

  const handleEdit = async (metaId: string) => {
    const valor = parseFloat(editValue);
    if (isNaN(valor) || valor <= 0) {
      return;
    }

    await updateMeta(metaId, valor);
    setEditingMeta(null);
    setEditValue('');
  };

  const handleDelete = async (metaId: string) => {
    await deleteMeta(metaId);
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
    );
  }

  return (
    <Tabs defaultValue="gerenciar" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="gerenciar">
          <Target className="h-4 w-4 mr-2" />
          Gerenciar Metas
        </TabsTrigger>
        <TabsTrigger value="historico">
          <History className="h-4 w-4 mr-2" />
          Histórico
        </TabsTrigger>
      </TabsList>

      <TabsContent value="gerenciar" className="space-y-4">
        <div className="grid gap-4">
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
                        <Button onClick={() => handleCreateMeta(tipo)}>
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Meta?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. A meta será permanentemente excluída.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(metaAtiva.id)}>
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
        </div>
      </TabsContent>

      <TabsContent value="historico" className="space-y-4">
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
  );
};
