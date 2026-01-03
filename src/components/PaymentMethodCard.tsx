import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star } from 'lucide-react';
import { CreditCardVisual } from './CreditCardVisual';

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  onDelete: () => void;
  onSetDefault: () => void;
  isDeleting?: boolean;
}

const formatBrand = (brand: string) => {
  const brandNames: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    elo: 'Elo',
    hipercard: 'Hipercard',
    discover: 'Discover',
    diners: 'Diners Club',
  };
  return brandNames[brand.toLowerCase()] || brand.charAt(0).toUpperCase() + brand.slice(1);
};

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  onDelete,
  onSetDefault,
  isDeleting = false,
}) => {
  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Visual card thumbnail */}
          <div className="flex-shrink-0">
            <CreditCardVisual
              brand={paymentMethod.brand}
              last4={paymentMethod.last4}
              expMonth={paymentMethod.expMonth}
              expYear={paymentMethod.expYear}
              size="sm"
            />
          </div>
          
          {/* Card info and actions */}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-semibold">
                  {formatBrand(paymentMethod.brand)} •••• {paymentMethod.last4}
                </span>
                {paymentMethod.isDefault && (
                  <Badge variant="default" className="text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Padrão
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Expira {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {!paymentMethod.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSetDefault}
                  className="text-xs"
                >
                  Definir como padrão
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">{isDeleting ? "Excluindo..." : "Excluir"}</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
