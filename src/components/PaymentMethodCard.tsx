import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Edit } from 'lucide-react';

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
}

const getBrandIcon = (brand: string) => {
  const brandColors = {
    visa: 'text-blue-600',
    mastercard: 'text-red-600',
    amex: 'text-green-600',
    discover: 'text-orange-600',
  };
  
  return (
    <CreditCard className={`w-8 h-8 ${brandColors[brand as keyof typeof brandColors] || 'text-gray-600'}`} />
  );
};

const formatBrand = (brand: string) => {
  return brand.charAt(0).toUpperCase() + brand.slice(1);
};

export const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  onEdit,
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
                {paymentMethod.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    Padrão
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatBrand(paymentMethod.brand)} • Expira {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit}
            className="flex items-center space-x-2"
          >
            <Edit className="w-4 h-4" />
            <span>Alterar</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};