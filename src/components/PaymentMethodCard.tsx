import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Edit, Trash2, Star } from 'lucide-react';

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
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  isDeleting?: boolean;
}

const getBrandIcon = (brand: string) => {
  const brandIcons = {
    visa: <CreditCard className="w-8 h-8 text-primary" />,
    mastercard: <CreditCard className="w-8 h-8 text-destructive" />,
    amex: <CreditCard className="w-8 h-8 text-success" />,
    discover: <CreditCard className="w-8 h-8 text-warning" />,
  };
  
  return brandIcons[brand as keyof typeof brandIcons] || <CreditCard className="w-8 h-8 text-muted-foreground" />;
};

const formatBrand = (brand: string) => {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  onEdit,
  onDelete,
  onSetDefault,
  isDeleting = false,
}) => {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getBrandIcon(paymentMethod.brand)}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">
                  •••• •••• •••• {paymentMethod.last4}
                </span>
                {paymentMethod.isDefault ? (
                  <Badge variant="default" className="text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Padrão
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSetDefault}
                    className="text-xs h-6 px-2"
                  >
                    Definir como padrão
                  </Button>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatBrand(paymentMethod.brand)} • Expira {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onEdit}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Alterar</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center space-x-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? "Excluindo..." : "Excluir"}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};