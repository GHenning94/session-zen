import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star } from 'lucide-react';

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

// SVG icons for card brands
const CardBrandIcon = ({ brand }: { brand: string }) => {
  const brandLower = brand.toLowerCase();
  
  if (brandLower === 'visa') {
    return (
      <svg viewBox="0 0 48 32" className="w-12 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#1A1F71"/>
        <path d="M19.5 21.5L21.5 10.5H24.5L22.5 21.5H19.5Z" fill="white"/>
        <path d="M32 10.5L29.5 18L29 15.5L28 11.5C28 11.5 27.8 10.5 26.5 10.5H22L22 10.7C22 10.7 23.5 11 25 12L27.5 21.5H30.5L34.5 10.5H32Z" fill="white"/>
        <path d="M17 10.5L14 18L13.7 16.5L12.5 11.5C12.5 11.5 12.3 10.5 11 10.5H6L6 10.7C6 10.7 8 11.2 10 12.7L13 21.5H16L20.5 10.5H17Z" fill="white"/>
        <path d="M36 18.5C36 18.5 35.5 18 34.5 18C33 18 32 19 32 20C32 21.5 34 21.5 34 22.5C34 23 33.5 23.5 32.5 23.5C31.5 23.5 31 23 31 23L30.5 24.5C30.5 24.5 31.5 25 32.5 25C34.5 25 36 23.5 36 22C36 20.5 34 20.5 34 19.5C34 19 34.5 18.5 35.5 18.5C36 18.5 36.5 18.7 36.5 18.7L36 18.5Z" fill="white"/>
      </svg>
    );
  }
  
  if (brandLower === 'mastercard') {
    return (
      <svg viewBox="0 0 48 32" className="w-12 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#000"/>
        <circle cx="19" cy="16" r="9" fill="#EB001B"/>
        <circle cx="29" cy="16" r="9" fill="#F79E1B"/>
        <path d="M24 9.5C25.8 11 27 13.3 27 16C27 18.7 25.8 21 24 22.5C22.2 21 21 18.7 21 16C21 13.3 22.2 11 24 9.5Z" fill="#FF5F00"/>
      </svg>
    );
  }
  
  if (brandLower === 'amex' || brandLower === 'american express') {
    return (
      <svg viewBox="0 0 48 32" className="w-12 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#006FCF"/>
        <path d="M10 12L8 20H11L11.3 19H13.7L14 20H17L15 12H10ZM12 14L12.8 17H11.2L12 14Z" fill="white"/>
        <path d="M18 12V20H21L23 17V20H26V12H23L21 15V12H18Z" fill="white"/>
        <path d="M27 12V20H30V17H32V20H35V12H32V15H30V12H27Z" fill="white"/>
        <path d="M36 12V20H42L40 16L42 12H36ZM38 14H40L39 16L40 18H38V14Z" fill="white"/>
      </svg>
    );
  }
  
  if (brandLower === 'elo') {
    return (
      <svg viewBox="0 0 48 32" className="w-12 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#000"/>
        <circle cx="16" cy="16" r="6" fill="#FFCB05"/>
        <circle cx="24" cy="16" r="6" fill="#00A4E0"/>
        <circle cx="32" cy="16" r="6" fill="#EF4123"/>
      </svg>
    );
  }
  
  if (brandLower === 'hipercard') {
    return (
      <svg viewBox="0 0 48 32" className="w-12 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#822124"/>
        <text x="24" y="18" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">HIPER</text>
      </svg>
    );
  }
  
  if (brandLower === 'discover') {
    return (
      <svg viewBox="0 0 48 32" className="w-12 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#FF6600"/>
        <circle cx="30" cy="16" r="8" fill="#FFF"/>
        <text x="16" y="18" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">DISCOVER</text>
      </svg>
    );
  }
  
  if (brandLower === 'diners' || brandLower === 'diners club') {
    return (
      <svg viewBox="0 0 48 32" className="w-12 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#0079BE"/>
        <circle cx="24" cy="16" r="10" fill="#FFF"/>
        <circle cx="20" cy="16" r="6" fill="none" stroke="#0079BE" strokeWidth="1.5"/>
        <circle cx="28" cy="16" r="6" fill="none" stroke="#0079BE" strokeWidth="1.5"/>
      </svg>
    );
  }
  
  // Generic card for unknown brands
  return (
    <svg viewBox="0 0 48 32" className="w-12 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="hsl(var(--muted))"/>
      <rect x="6" y="10" width="12" height="3" rx="1" fill="hsl(var(--muted-foreground))"/>
      <rect x="6" y="16" width="20" height="2" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.5"/>
      <rect x="6" y="20" width="16" height="2" rx="1" fill="hsl(var(--muted-foreground))" opacity="0.5"/>
      <rect x="30" y="18" width="12" height="8" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.3"/>
    </svg>
  );
};

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Card info */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              <CardBrandIcon brand={paymentMethod.brand} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-semibold">
                  •••• {paymentMethod.last4}
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
              <div className="text-sm text-muted-foreground mt-0.5">
                {formatBrand(paymentMethod.brand)} • Expira {paymentMethod.expMonth.toString().padStart(2, '0')}/{paymentMethod.expYear}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{isDeleting ? "Excluindo..." : "Excluir"}</span>
              <span className="sm:hidden">{isDeleting ? "..." : ""}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};