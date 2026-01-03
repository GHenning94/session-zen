import React, { useState, useCallback } from 'react';
import { loadStripe, StripeCardNumberElementChangeEvent } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { CreditCardVisual } from './CreditCardVisual';

// Fetch Stripe key from environment - requires VITE_STRIPE_PUBLIC_KEY to be set
const getStripeKey = (): string => {
  const envKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (!envKey) {
    console.error('[Stripe] VITE_STRIPE_PUBLIC_KEY environment variable not configured');
    throw new Error('Stripe key not configured. Please set VITE_STRIPE_PUBLIC_KEY environment variable.');
  }
  return envKey;
};

// Initialize Stripe promise - will throw if key not configured
let stripePromise: ReturnType<typeof loadStripe> | null = null;
try {
  stripePromise = loadStripe(getStripeKey());
} catch (error) {
  console.error('[Stripe] Failed to initialize:', error);
}

interface UpdatePaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const elementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

const PaymentForm: React.FC<{ onSuccess: () => void; onClose: () => void }> = ({ 
  onSuccess, 
  onClose 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isCvvFocused, setIsCvvFocused] = useState(false);
  
  // Card preview state
  const [cardPreview, setCardPreview] = useState({
    brand: '',
    last4: '',
    expiry: '',
    cardHolder: '',
    cardNumber: '',
  });

  // Handle card number change to detect brand and capture last 4 digits
  const handleCardNumberChange = useCallback((event: StripeCardNumberElementChangeEvent) => {
    // Extract the last 4 digits if complete
    let cardNum = '';
    if (event.complete && event.brand) {
      // When complete, we know it's valid - show masked with bullets
      cardNum = '••••••••••••' + (event.brand === 'amex' ? '•••••' : '••••');
    }
    
    setCardPreview(prev => ({
      ...prev,
      brand: event.brand || '',
      cardNumber: cardNum,
    }));
  }, []);

  // NOTE: AdBlocker errors (net::ERR_BLOCKED_BY_ADBLOCKER) are normal and expected
  // Stripe SDK automatically tries alternative URLs if blocked. No action needed.

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const cardNumberElement = elements.getElement(CardNumberElement);
    
    if (!cardNumberElement) {
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create SetupIntent (deferred until submit)
      const { data, error: setupIntentError } = await supabase.functions.invoke('create-setup-intent');
      
      if (setupIntentError) {
        // Distinguish configuration errors from real errors
        if (setupIntentError.message?.includes('No customer') || 
            setupIntentError.message?.includes('not set') ||
            setupIntentError.message?.includes('not found')) {
          console.warn('[Stripe] Configuration issue:', setupIntentError);
          toast({
            title: "Configuração Necessária",
            description: "Configure sua assinatura antes de adicionar um método de pagamento.",
            variant: "destructive",
          });
          onClose();
          return;
        }
        throw setupIntentError;
      }

      if (!data?.client_secret) {
        throw new Error('No client secret returned from server');
      }

      // Step 2: Confirm card setup with Stripe
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(data.client_secret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: cardPreview.cardHolder || undefined,
          },
        },
      });

      if (confirmError) {
        throw confirmError;
      }

      if (setupIntent?.payment_method) {
        // Step 3: Set as default payment method
        const { error: updateError } = await supabase.functions.invoke(
          'update-default-payment-method',
          {
            body: { paymentMethodId: setupIntent.payment_method }
          }
        );

        if (updateError) throw updateError;

        toast({
          title: "Sucesso!",
          description: "Cartão adicionado com sucesso.",
        });

        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('[Stripe] Error updating payment method:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar o cartão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Parse expiry for preview
  const parseExpiry = (expiry: string) => {
    const parts = expiry.split('/');
    return {
      month: parts[0] || '',
      year: parts[1] || '',
    };
  };

  const expiryParts = parseExpiry(cardPreview.expiry);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card preview */}
      <div className="flex justify-center py-2">
        <CreditCardVisual
          brand={cardPreview.brand}
          cardHolder={cardPreview.cardHolder}
          expMonth={expiryParts.month}
          expYear={expiryParts.year}
          size="md"
          isFlipped={isCvvFocused}
          showFullNumber={true}
          cardNumber={cardPreview.cardNumber}
        />
      </div>

      <div className="space-y-4">
        {/* Card Holder */}
        <div>
          <Label htmlFor="card-holder">Nome no Cartão</Label>
          <Input
            id="card-holder"
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            className="mt-1 uppercase"
            value={cardPreview.cardHolder}
            onChange={(e) => setCardPreview(prev => ({ ...prev, cardHolder: e.target.value.toUpperCase() }))}
          />
        </div>

        {/* Card Number */}
        <div>
          <Label htmlFor="card-number">Número do Cartão</Label>
          <div className="mt-1 p-3 border rounded-md bg-background">
            <CardNumberElement 
              id="card-number" 
              options={elementOptions}
              onChange={handleCardNumberChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Expiry */}
          <div>
            <Label htmlFor="card-expiry">Validade</Label>
            <div className="mt-1 p-3 border rounded-md bg-background">
              <CardExpiryElement 
                id="card-expiry" 
                options={elementOptions}
              />
            </div>
          </div>
          {/* CVC */}
          <div>
            <Label htmlFor="card-cvc">CVV</Label>
            <div className="mt-1 p-3 border rounded-md bg-background">
              <CardCvcElement 
                id="card-cvc" 
                options={elementOptions}
                onFocus={() => setIsCvvFocused(true)}
                onBlur={() => setIsCvvFocused(false)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!stripe || loading} className="min-w-[140px]">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Salvando...' : 'Salvar Cartão'}
        </Button>
      </div>
    </form>
  );
};

export const UpdatePaymentMethodModal: React.FC<UpdatePaymentMethodModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Cartão de Pagamento</DialogTitle>
        </DialogHeader>
        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <PaymentForm 
              onSuccess={onSuccess} 
              onClose={() => onOpenChange(false)} 
            />
          </Elements>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Erro ao carregar o formulário de pagamento. Verifique a configuração do Stripe.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
