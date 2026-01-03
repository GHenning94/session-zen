import React, { useState, useCallback, useMemo } from 'react';
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

// Stripe publishable key - same key used for checkout
const STRIPE_PUBLIC_KEY = 'pk_live_51MjxMVBJ2uJnSxl1IxfXyCHCUqvGgWfMPujVXCWNOeZQCJjLzCQnGLv1VQmTMJQqYBfnzL1cXQZQiNMZW4gZ9P5A00T5wIvQjR';

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

  // Detect card brand from number
  const detectBrand = (number: string): string => {
    const cleaned = number.replace(/\D/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(cleaned)) return 'elo';
    if (/^(38|60)/.test(cleaned)) return 'hipercard';
    return '';
  };

  // Handle card number change from Stripe element (for validation)
  const handleCardNumberChange = useCallback((event: StripeCardNumberElementChangeEvent) => {
    // We still use Stripe's brand detection as fallback
    if (event.brand && event.brand !== 'unknown') {
      setCardPreview(prev => ({
        ...prev,
        brand: prev.brand || event.brand || '',
      }));
    }
  }, []);

  // Track card number input via a hidden input synced with Stripe element
  const [rawCardNumber, setRawCardNumber] = useState('');

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
          brand={cardPreview.brand || detectBrand(rawCardNumber)}
          cardHolder={cardPreview.cardHolder}
          expMonth={expiryParts.month}
          expYear={expiryParts.year}
          size="md"
          isFlipped={isCvvFocused}
          showFullNumber={true}
          cardNumber={rawCardNumber}
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

        {/* Card Number - Single input that syncs with Stripe */}
        <div>
          <Label htmlFor="card-number">Número do Cartão</Label>
          <div className="mt-1 relative">
            {/* Custom overlay to capture and display card number for preview */}
            <Input
              id="card-number-display"
              placeholder="0000 0000 0000 0000"
              className="font-mono tracking-wider"
              value={rawCardNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim()}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                setRawCardNumber(value);
                setCardPreview(prev => ({ ...prev, brand: detectBrand(value) }));
              }}
              maxLength={19}
            />
          </div>
          {/* Hidden Stripe element for secure payment processing */}
          <div className="sr-only" aria-hidden="true">
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
  // Initialize Stripe lazily when modal opens
  const stripePromise = useMemo(() => loadStripe(STRIPE_PUBLIC_KEY), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Cartão de Pagamento</DialogTitle>
        </DialogHeader>
        <Elements stripe={stripePromise}>
          <PaymentForm 
            onSuccess={onSuccess} 
            onClose={() => onOpenChange(false)} 
          />
        </Elements>
      </DialogContent>
    </Dialog>
  );
};
