import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useMetas, MetaTipo } from '@/hooks/useMetas';
import { CheckCircle2, Target } from 'lucide-react';
import { formatCurrencyBR } from '@/utils/formatters';

export const MetasManager = () => {
  const { metas, isLoading, createMeta, getTipoLabel } = useMetas();
  const [novoValor, setNovoValor] = useState<Record<MetaTipo, string>>({
    sessoes: '',
    clientes: '',
    receita: '',
    pacotes: '',
    ticket_medio: ''
  });

  const tiposMeta: MetaTipo[] = ['sessoes', 'clientes', 'receita', 'pacotes', 'ticket_medio'];

  const handleCreateMeta = async (tipo: MetaTipo) => {
    const valor = parseFloat(novoValor[tipo]);
    if (isNaN(valor) || valor <= 0) {
      return;
    }

    await createMeta(tipo, valor);
    setNovoValor(prev => ({ ...prev, [tipo]: '' }));
  };

  const getMetaAtiva = (tipo: MetaTipo) => {
    return metas.find(m => m.tipo === tipo && m.ativa && !m.concluida);
  };

  const getMetaConcluida = (tipo: MetaTipo) => {
    return metas.find(m => m.tipo === tipo && m.concluida);
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
    return <div className="text-center">Carregando metas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Gerenciar Metas</h2>
      </div>

      <div className="grid gap-4">
        {tiposMeta.map((tipo) => {
          const metaAtiva = getMetaAtiva(tipo);
          const metaConcluida = getMetaConcluida(tipo);

          return (
            <Card key={tipo}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{getTipoLabel(tipo)}</CardTitle>
                  {metaConcluida && (
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Meta {metaConcluida.versao} Concluída
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {metaAtiva
                    ? `Meta ${metaAtiva.versao} em andamento: ${formatarValor(tipo, metaAtiva.valor_meta)}`
                    : 'Nenhuma meta definida'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!metaAtiva || metaConcluida ? (
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
                    <Button onClick={() => handleCreateMeta(tipo)}>
                      {metaConcluida ? `Definir Meta ${metaConcluida.versao + 1}` : 'Criar Meta'}
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    A meta atual está em progresso. Complete-a para definir uma nova.
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
