import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { useRecurringSessions, RecurringSession } from '@/hooks/useRecurringSessions';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

export const RecurringSessionModal = ({ 
  open, 
  onOpenChange, 
  recurringSession, 
  clientId,
  onSave 
}: RecurringSessionModalProps) => {
  const { createRecurring, updateRecurring, loading } = useRecurringSessions();
  
  const [formData, setFormData] = useState({
    recurrence_type: 'semanal' as 'diaria' | 'semanal' | 'quinzenal' | 'mensal',
    recurrence_interval: 1,
    dia_da_semana: 1,
    horario: '10:00',
    valor: 0,
    recurrence_end_date: undefined as Date | undefined,
    recurrence_count: undefined as number | undefined,
    google_calendar_sync: false,
    end_type: 'never' as 'never' | 'date' | 'count'
  });

  useEffect(() => {
    if (recurringSession) {
      setFormData({
        recurrence_type: recurringSession.recurrence_type,
        recurrence_interval: recurringSession.recurrence_interval,
        dia_da_semana: recurringSession.dia_da_semana || 1,
        horario: recurringSession.horario,
        valor: recurringSession.valor || 0,
        recurrence_end_date: recurringSession.recurrence_end_date 
          ? new Date(recurringSession.recurrence_end_date) 
          : undefined,
        recurrence_count: recurringSession.recurrence_count || undefined,
        google_calendar_sync: recurringSession.google_calendar_sync,
        end_type: recurringSession.recurrence_end_date 
          ? 'date' 
          : recurringSession.recurrence_count 
            ? 'count' 
            : 'never'
      });
    }
  }, [recurringSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientId && !recurringSession) {
      return;
    }

    try {
      const data = {
        client_id: clientId || recurringSession?.client_id || '',
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_interval,
        dia_da_semana: formData.dia_da_semana,
        horario: formData.horario,
        valor: formData.valor,
        recurrence_end_date: formData.end_type === 'date' && formData.recurrence_end_date
          ? formData.recurrence_end_date.toISOString().split('T')[0]
          : undefined,
        recurrence_count: formData.end_type === 'count' ? formData.recurrence_count : undefined,
        google_calendar_sync: formData.google_calendar_sync
      };

      if (recurringSession) {
        await updateRecurring(recurringSession.id, data);
      } else {
        await createRecurring(data);
      }

      onSave();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        recurrence_type: 'semanal',
        recurrence_interval: 1,
        dia_da_semana: 1,
        horario: '10:00',
        valor: 0,
        recurrence_end_date: undefined,
        recurrence_count: undefined,
        google_calendar_sync: false,
        end_type: 'never'
      });
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
                  onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) })}
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

            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
              />
            </div>

            <div className="col-span-2 space-y-3">
              <Label>Término da Recorrência</Label>
              
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={formData.end_type === 'never' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, end_type: 'never' })}
                >
                  Nunca
                </Button>
                <Button
                  type="button"
                  variant={formData.end_type === 'date' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({ ...formData, end_type: 'date' })}
                >
                  Em uma data
                </Button>
                <Button
                  type="button"
                  variant={formData.end_type === 'count' ? 'default' : 'outline'}
                  size="sm"
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : recurringSession ? 'Atualizar' : 'Criar Recorrência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
