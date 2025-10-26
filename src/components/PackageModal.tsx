import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { usePackages, Package } from '@/hooks/usePackages';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Package as PackageIcon } from 'lucide-react';
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
  const { createPackage, updatePackage, loading } = usePackages();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    client_id: clientId || '',
    nome: '',
    total_sessoes: 10,
    valor_total: 0,
    valor_por_sessao: 0,
    data_inicio: undefined as Date | undefined,
    data_fim: undefined as Date | undefined,
    observacoes: ''
  });

  // Carregar clientes
  const { data: clients = [] } = useQuery({
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

  useEffect(() => {
    if (open) {
      if (packageToEdit) {
        setFormData({
          client_id: packageToEdit.client_id,
          nome: packageToEdit.nome,
          total_sessoes: packageToEdit.total_sessoes,
          valor_total: packageToEdit.valor_total,
          valor_por_sessao: packageToEdit.valor_por_sessao || 0,
          data_inicio: packageToEdit.data_inicio ? new Date(packageToEdit.data_inicio) : undefined,
          data_fim: packageToEdit.data_fim ? new Date(packageToEdit.data_fim) : undefined,
          observacoes: packageToEdit.observacoes || ''
        });
      } else {
        // Reset ao abrir para novo
        setFormData({
          client_id: clientId || '',
          nome: '',
          total_sessoes: 10,
          valor_total: 0,
          valor_por_sessao: 0,
          data_inicio: undefined,
          data_fim: undefined,
          observacoes: ''
        });
      }
    }
  }, [packageToEdit, clientId, open]);

  useEffect(() => {
    // Calcular valor por sessão automaticamente
    if (formData.total_sessoes > 0) {
      setFormData(prev => ({
        ...prev,
        valor_por_sessao: prev.valor_total / prev.total_sessoes
      }));
    }
  }, [formData.valor_total, formData.total_sessoes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação de campos obrigatórios
    if (!formData.client_id) {
      return;
    }
    
    if (!formData.nome || formData.total_sessoes <= 0 || formData.valor_total <= 0) {
      return;
    }

    try {
      const data = {
        ...formData,
        client_id: formData.client_id,
        data_inicio: formData.data_inicio?.toISOString().split('T')[0],
        data_fim: formData.data_fim?.toISOString().split('T')[0]
      };

      if (packageToEdit) {
        await updatePackage(packageToEdit.id, data);
      } else {
        await createPackage(data);
      }

      onSave();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        client_id: '',
        nome: '',
        total_sessoes: 10,
        valor_total: 0,
        valor_por_sessao: 0,
        data_inicio: undefined,
        data_fim: undefined,
        observacoes: ''
      });
    } catch (error) {
      console.error('Error saving package:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            {packageToEdit ? 'Editar Pacote' : 'Novo Pacote de Sessões'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="col-span-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                disabled={!!packageToEdit} // Não permite trocar cliente em edição
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
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
              <Label htmlFor="nome">Nome do Pacote</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Pacote 10 Sessões"
                required
              />
            </div>

            <div>
              <Label htmlFor="total_sessoes">Total de Sessões</Label>
              <Input
                id="total_sessoes"
                type="number"
                min="1"
                value={formData.total_sessoes}
                onChange={(e) => setFormData({ ...formData, total_sessoes: parseInt(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="valor_total">Valor Total (R$)</Label>
              <Input
                id="valor_total"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor_total}
                onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) })}
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
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.data_inicio && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_inicio ? (
                      format(formData.data_inicio, 'PPP', { locale: ptBR })
                    ) : (
                      'Selecionar data'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.data_inicio}
                    onSelect={(date) => setFormData({ ...formData, data_inicio: date })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Data de Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.data_fim && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_fim ? (
                      format(formData.data_fim, 'PPP', { locale: ptBR })
                    ) : (
                      'Selecionar data'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.data_fim}
                    onSelect={(date) => setFormData({ ...formData, data_fim: date })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="col-span-2">
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

          <div className="flex gap-2 justify-end pt-4">
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
        </form>
      </DialogContent>
    </Dialog>
  );
};
