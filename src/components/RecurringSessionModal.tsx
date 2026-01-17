import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { useRecurringSessions, RecurringSession } from '@/hooks/useRecurringSessions';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Repeat, CreditCard, CalendarDays, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RecurringSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurringSession?: RecurringSession | null;
  clientId?: string;
  onSave: () => void;
}

const WEEKDAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' }
];

const PAYMENT_METHODS = [
  { value: 'A definir', label: 'A definir' },
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Cartão', label: 'Cartão' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'Transferência', label: 'Transferência' }
];

export const RecurringSessionModal = ({ 
  open, 
  onOpenChange, 
  recurringSession, 
  clientId,
  onSave 
}: RecurringSessionModalProps) => {
  const { user } = useAuth();
  const { createRecurring, updateRecurring, loading } = useRecurringSessions();
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || '');

  // Fetch clients for the selector
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-recurring', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, nome, ativo')
        .eq('user_id', user.id)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && open && !clientId
  });

  // Update selectedClientId when clientId prop changes
  useEffect(() => {
    if (clientId) {
      setSelectedClientId(clientId);
    }
  }, [clientId]);
  const [formData, setFormData] = useState({
    recurrence_type: 'semanal' as 'diaria' | 'semanal' | 'quinzenal' | 'mensal',
    recurrence_interval: 1,
    dia_da_semana: 1,
    horario: '10:00',
    valor: 0,
    metodo_pagamento: 'A definir',
    recurrence_end_date: undefined as Date | undefined,
    recurrence_count: undefined as number | undefined,
    end_type: 'never' as 'never' | 'date' | 'count',
    // Campos para tipo de cobrança
    billing_type: 'per_session' as 'per_session' | 'monthly_plan',
    // Campos para plano mensal
    monthly_value: 0,
    billing_day: 1,
    start_date: new Date(),
    auto_renewal: true
  });

  useEffect(() => {
    if (recurringSession) {
      setFormData({
        recurrence_type: recurringSession.recurrence_type,
        recurrence_interval: recurringSession.recurrence_interval,
        dia_da_semana: recurringSession.dia_da_semana || 1,
        horario: recurringSession.horario?.slice(0, 5) || '10:00',
        valor: recurringSession.valor || 0,
        metodo_pagamento: recurringSession.metodo_pagamento || 'A definir',
        recurrence_end_date: recurringSession.recurrence_end_date 
          ? new Date(recurringSession.recurrence_end_date) 
          : undefined,
        recurrence_count: recurringSession.recurrence_count || undefined,
        end_type: recurringSession.recurrence_end_date 
          ? 'date' 
          : recurringSession.recurrence_count 
            ? 'count' 
            : 'never',
        billing_type: (recurringSession as any).billing_type || 'per_session',
        monthly_value: 0,
        billing_day: 1,
        start_date: new Date(),
        auto_renewal: true
      });
    } else {
      // Reset form for new session
      setFormData({
        recurrence_type: 'semanal',
        recurrence_interval: 1,
        dia_da_semana: 1,
        horario: '10:00',
        valor: 0,
        metodo_pagamento: 'A definir',
        recurrence_end_date: undefined,
        recurrence_count: undefined,
        end_type: 'date',
        billing_type: 'per_session',
        monthly_value: 0,
        billing_day: 1,
        start_date: new Date(),
        auto_renewal: true
      });
    }
  }, [recurringSession, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const effectiveClientId = selectedClientId || clientId || recurringSession?.client_id;
    
    if (!effectiveClientId && !recurringSession) {
      return;
    }

    try {
      const data: any = {
        client_id: effectiveClientId || '',
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_interval,
        dia_da_semana: formData.dia_da_semana,
        horario: formData.horario,
        valor: formData.billing_type === 'per_session' ? formData.valor : 0,
        metodo_pagamento: formData.metodo_pagamento,
        recurrence_end_date: formData.end_type === 'date' && formData.recurrence_end_date
          ? formData.recurrence_end_date.toISOString().split('T')[0]
          : undefined,
        recurrence_count: formData.end_type === 'count' ? formData.recurrence_count : undefined,
        google_calendar_sync: false,
        billing_type: formData.billing_type
      };

      // Adicionar dados do plano mensal se for esse tipo
      if (formData.billing_type === 'monthly_plan') {
        data.monthly_plan_data = {
          valor_mensal: formData.monthly_value,
          dia_cobranca: formData.billing_day,
          data_inicio: formData.start_date.toISOString().split('T')[0],
          renovacao_automatica: formData.auto_renewal
        };
      }

      if (recurringSession) {
        await updateRecurring(recurringSession.id, data);
      } else {
        await createRecurring(data);
      }

      onSave();
      onOpenChange(false);
      
      // Dispatch event to notify other pages
      window.dispatchEvent(new Event('recurringSessionUpdated'));
      
    } catch (error) {
      console.error('Error saving recurring session:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            {recurringSession ? 'Editar Recorrência' : 'Nova Sessão Recorrente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seletor de Cliente - apenas na criação sem clientId pré-definido */}
          {!recurringSession && !clientId && (
            <div className="space-y-2">
              <Label htmlFor="client">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </span>
              </Label>
              <Select
                value={selectedClientId}
                onValueChange={setSelectedClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <span>{client.nome}</span>
                        {!client.ativo && (
                          <span className="text-xs text-muted-foreground">(inativo)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tipo de Cobrança - apenas na criação */}
          {!recurringSession && (
            <div className="space-y-3">
              <Label>Tipo de Cobrança</Label>
              <RadioGroup
                value={formData.billing_type}
                onValueChange={(value: 'per_session' | 'monthly_plan') => 
                  setFormData({ ...formData, billing_type: value })
                }
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
              <Label 
                  htmlFor="per_session" 
                  className="cursor-pointer"
                >
                <Card className={cn(
                  "cursor-pointer transition-all",
                  formData.billing_type === 'per_session' && "border-primary ring-2 ring-primary/20"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="per_session" id="per_session" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Cobrança por Sessão
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Cada sessão gera um pagamento individual
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>

              <Label 
                  htmlFor="monthly_plan" 
                  className="cursor-pointer"
                >
                <Card className={cn(
                  "cursor-pointer transition-all",
                  formData.billing_type === 'monthly_plan' && "border-primary ring-2 ring-primary/20"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="monthly_plan" id="monthly_plan" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Plano Mensal
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Valor fixo mensal independente do número de sessões
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Label>
              </RadioGroup>
            </div>
          )}

          {/* Configurações da Recorrência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recurrence_type">Tipo de Recorrência</Label>
              <Select
                value={formData.recurrence_type}
                onValueChange={(value: any) => setFormData({ ...formData, recurrence_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diária</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="recurrence_interval">Repetir a cada</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="recurrence_interval"
                  type="number"
                  min="1"
                  value={formData.recurrence_interval}
                  onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {formData.recurrence_type === 'diaria' && 'dia(s)'}
                  {formData.recurrence_type === 'semanal' && 'semana(s)'}
                  {formData.recurrence_type === 'quinzenal' && 'quinzena(s)'}
                  {formData.recurrence_type === 'mensal' && 'mês(es)'}
                </span>
              </div>
            </div>

            {formData.recurrence_type === 'semanal' && (
              <div className="col-span-2">
                <Label htmlFor="dia_da_semana">Dia da Semana</Label>
                <Select
                  value={formData.dia_da_semana?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, dia_da_semana: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="horario">Horário</Label>
              <Input
                id="horario"
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                required
              />
            </div>

            {/* Valor - apenas para cobrança por sessão */}
            {formData.billing_type === 'per_session' && (
              <div>
                <Label htmlFor="valor">Valor por Sessão (R$)</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}

            {formData.billing_type === 'per_session' && (
              <div className="col-span-2">
                <Label htmlFor="metodo_pagamento">Método de Pagamento</Label>
                <Select
                  value={formData.metodo_pagamento}
                  onValueChange={(value) => setFormData({ ...formData, metodo_pagamento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Configurações do Plano Mensal */}
          {formData.billing_type === 'monthly_plan' && !recurringSession && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <h3 className="font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Configurações do Plano Mensal
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthly_value">Valor Mensal (R$)</Label>
                  <Input
                    id="monthly_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_value}
                    onChange={(e) => setFormData({ ...formData, monthly_value: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="billing_day">Dia de Cobrança</Label>
                  <Select
                    value={formData.billing_day.toString()}
                    onValueChange={(value) => setFormData({ ...formData, billing_day: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Data de Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.start_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? (
                          format(formData.start_date, 'PPP', { locale: ptBR })
                        ) : (
                          'Selecionar data'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => date && setFormData({ ...formData, start_date: date })}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    id="auto_renewal"
                    checked={formData.auto_renewal}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_renewal: checked })}
                  />
                  <Label htmlFor="auto_renewal" className="cursor-pointer">
                    Renovação automática
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Término da Recorrência */}
          <div className="space-y-3">
            <Label>Término da Recorrência *</Label>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={formData.end_type === 'date' ? 'default' : 'outline'}
                size="default"
                className="min-w-[140px]"
                onClick={() => setFormData({ ...formData, end_type: 'date' })}
              >
                Em uma data
              </Button>
              <Button
                type="button"
                variant={formData.end_type === 'count' ? 'default' : 'outline'}
                size="default"
                className="min-w-[160px]"
                onClick={() => setFormData({ ...formData, end_type: 'count' })}
              >
                Após X ocorrências
              </Button>
            </div>

            {formData.end_type === 'date' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.recurrence_end_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.recurrence_end_date ? (
                      format(formData.recurrence_end_date, 'PPP', { locale: ptBR })
                    ) : (
                      'Selecionar data de término'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.recurrence_end_date}
                    onSelect={(date) => setFormData({ ...formData, recurrence_end_date: date })}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            )}

            {formData.end_type === 'count' && (
              <Input
                type="number"
                min="1"
                placeholder="Número de ocorrências"
                value={formData.recurrence_count || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  recurrence_count: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (!clientId && !selectedClientId && !recurringSession)}
            >
              {loading ? 'Salvando...' : recurringSession ? 'Atualizar' : 'Criar Recorrência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};