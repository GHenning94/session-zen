import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Banknote, Smartphone, Building2, FileText } from "lucide-react";

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: string) => void;
  loading?: boolean;
}

const PaymentMethodModal = ({ open, onOpenChange, onConfirm, loading = false }: PaymentMethodModalProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string>("");

  const paymentMethods = [
    { value: "pix", label: "PIX", icon: Smartphone },
    { value: "cartao", label: "Cartão", icon: CreditCard },
    { value: "boleto", label: "Boleto", icon: FileText },
    { value: "transferencia", label: "Transferência", icon: Building2 },
    { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  ];

  const handleConfirm = () => {
    if (selectedMethod) {
      onConfirm(selectedMethod);
      setSelectedMethod("");
    }
  };

  const handleCancel = () => {
    setSelectedMethod("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Método de Pagamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Como foi realizado o pagamento?
            </label>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedMethod || loading}
            >
              {loading ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodModal;