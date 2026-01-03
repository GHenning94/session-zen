import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useRef } from 'react';
import { usePackages, Package } from '@/hooks/usePackages';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Package as PackageIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface PackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package?: Package | null;
  clientId?: string;
  onSave: () => void;
}

export const PackageModal = ({ 
  open, 
  onOpenChange, 
  package: packageToEdit, 
  clientId,
  onSave 
}: PackageModalProps) => {
  const { createPackage, updatePackage, deletePackage, loading } = usePackages();
  const { user } = useAuth();
  
  // Estado separado para o AlertDialog - completamente independente
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deletePackageRef = useRef<Package | null>(null);
  
  // Inicializar formData baseado em packageToEdit (se existir)
  const getInitialFormData = () => {
    if (packageToEdit) {
      return {
        client_id: packageToEdit.client_id,
        nome: packageToEdit.nome,
        total_sessoes: packageToEdit.total_sessoes,
        valor_total: packageToEdit.valor_total,
        valor_por_sessao: packageToEdit.valor_por_sessao || (packageToEdit.valor_total / packageToEdit.total_sessoes),
        metodo_pagamento: packageToEdit.metodo_pagamento || '',
        data_inicio: packageToEdit.data_inicio ? new Date(packageToEdit.data_inicio) : undefined,
        data_fim: packageToEdit.data_fim ? new Date(packageToEdit.data_fim) : undefined,
        observacoes: packageToEdit.observacoes || ''
      };
    }
    return {
      client_id: clientId || '',
      nome: '',
      total_sessoes: 10,
      valor_total: 0,
      valor_por_sessao: 0,
      metodo_pagamento: '',
      data_inicio: undefined as Date | undefined,
      data_fim: undefined as Date | undefined,
      observacoes: ''
    };
  };
  
  const [formData, setFormData] = useState(getInitialFormData);

  // Carregar clientes
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nome')
        .eq('user_id', user!.id)
        .order('nome');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open
  });

  // Buscar nome do cliente selecionado
  const selectedClientName = clients.find(c => c.id === formData.client_id)?.nome;

  // Resetar estado do AlertDialog quando o componente é desmontado ou modal fecha
  useEffect(() => {
    if (!open) {
      setShowDeleteConfirm(false);
    }
  }, [open]);

  // Calcular valor por sessão automaticamente quando valor_total ou total_sessoes mudam
  const handleValorTotalChange = (newValor: number) => {
    setFormData(prev => ({
      ...prev,
      valor_total: newValor,
      valor_por_sessao: prev.total_sessoes > 0 ? newValor / prev.total_sessoes : 0
    }));
  };

  const handleTotalSessoesChange = (newTotal: number) => {
    setFormData(prev => ({
      ...prev,
      total_sessoes: newTotal,
      valor_por_sessao: newTotal > 0 ? prev.valor_total / newTotal : 0
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.nome || formData.total_sessoes <= 0 || formData.valor_total <= 0 || !formData.data_inicio || !formData.data_fim) {
      return;
    }

    try {
      const data = {
        ...formData,
        client_id: formData.client_id,
        metodo_pagamento: formData.metodo_pagamento || 'A definir',
        data_inicio: formData.data_inicio?.toISOString().split('T')[0],
        data_fim: formData.data_fim?.toISOString().split('T')[0]
      };

      if (packageToEdit) {
        await updatePackage(packageToEdit.id, data);
        
        if (formData.metodo_pagamento) {
          await supabase
            .from('payments')
            .update({ metodo_pagamento: formData.metodo_pagamento })
            .eq('package_id', packageToEdit.id);
        }
      } else {
        await createPackage(data);
      }

      onSave();
      onOpenChange(false);
      
      setFormData({
        client_id: '',
        nome: '',
        total_sessoes: 10,
        valor_total: 0,
        valor_por_sessao: 0,
        metodo_pagamento: '',
        data_inicio: undefined,
        data_fim: undefined,
        observacoes: ''
      });
    } catch (error) {
      console.error('Error saving package:', error);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Guardar referência do pacote antes de fechar
    deletePackageRef.current = packageToEdit || null;
    
    // Fechar Dialog primeiro
    onOpenChange(false);
    
    // Aguardar cleanup do portal e então mostrar AlertDialog
    setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 200);
  };

  const handleDelete = async () => {
    const pkgToDelete = deletePackageRef.current;
    if (!pkgToDelete) return;
    
    try {
      await deletePackage(pkgToDelete.id);
      setShowDeleteConfirm(false);
      deletePackageRef.current = null;
      onSave();
    } catch (error) {
      console.error('Error deleting package:', error);
      setShowDeleteConfirm(false);
      deletePackageRef.current = null;
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    
    // Reabrir Dialog após AlertDialog fechar completamente
    setTimeout(() => {
      if (deletePackageRef.current) {
        onOpenChange(true);
      }
      deletePackageRef.current = null;
    }, 200);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5" />
              {packageToEdit ? 'Editar Pacote' : 'Novo Pacote de Sessões'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {/* Cliente */}
              <div className="col-span-2">
                <Label htmlFor="client_id">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  disabled={!!packageToEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={clientsLoading ? "Carregando..." : "Selecione um cliente"}>
                      {selectedClientName || (formData.client_id ? "Carregando..." : undefined)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="nome">Nome do Pacote *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Pacote 10 Sessões"
                  required
                />
              </div>

              {/* Row 1: Total de Sessões, Valor Total, Valor por Sessão, Método de Pagamento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="total_sessoes">Total de Sessões *</Label>
                  <Input
                    id="total_sessoes"
                    type="number"
                    min="1"
                    value={formData.total_sessoes}
                    onChange={(e) => handleTotalSessoesChange(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="valor_total">Valor Total (R$) *</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor_total}
                    onChange={(e) => handleValorTotalChange(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div>
                  <Label>Valor por Sessão (calculado)</Label>
                  <Input
                    value={`R$ ${formData.valor_por_sessao.toFixed(2)}`}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
                  <Select
                    value={formData.metodo_pagamento}
                    onValueChange={(value) => setFormData({ ...formData, metodo_pagamento: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Dates side by side on web, stacked on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Data de Início *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.data_inicio && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {formData.data_inicio ? (
                            format(formData.data_inicio, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            'Selecionar'
                          )}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.data_inicio}
                        onSelect={(date) => setFormData({ ...formData, data_inicio: date })}
                        initialFocus
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Data de Término *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.data_fim && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {formData.data_fim ? (
                            format(formData.data_fim, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            'Selecionar'
                          )}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.data_fim}
                        onSelect={(date) => setFormData({ ...formData, data_fim: date })}
                        initialFocus
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações adicionais sobre o pacote..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-4">
              {packageToEdit ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={loading}
                  className="w-full sm:w-auto"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              ) : (
                <div />
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : packageToEdit ? 'Atualizar' : 'Criar Pacote'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog completamente independente */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pacote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pacote? Esta ação não pode ser desfeita.
              <br /><br />
              <strong>Todas as sessões e pagamentos associados a este pacote serão permanentemente excluídos.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
