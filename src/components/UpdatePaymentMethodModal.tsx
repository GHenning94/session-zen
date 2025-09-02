import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe('pk_live_51QT8oWCJopckKnVm5NfCgVsvkH0lElE2ipUVhfrcg2go4XhikZQ1OSsWEfgv8DgGZJUQqLkQ4W4M8avH8HnLFn0100e90pTSYo');

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
  const [clientSecret, setClientSecret] = useState<string>('');

  useEffect(() => {
    const createSetupIntent = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('create-setup-intent');
        if (error) throw error;
        setClientSecret(data.client_secret);
      } catch (error) {
        console.error('Error creating setup intent:', error);
        toast({
          title: "Erro",
          description: "Não foi possível inicializar o formulário de pagamento.",
          variant: "destructive",
        });
      }
    };

    createSetupIntent();
  }, [toast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setLoading(true);

    const cardNumberElement = elements.getElement(CardNumberElement);
    
    if (!cardNumberElement) {
      setLoading(false);
      return;
    }

    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (error) {
        throw error;
      }

      if (setupIntent?.payment_method) {
        // Set as default payment method
        const { error: updateError } = await supabase.functions.invoke(
          'update-default-payment-method',
          {
            body: { paymentMethodId: setupIntent.payment_method }
          }
        );

        if (updateError) throw updateError;

        toast({
          title: "Sucesso!",
          description: "Cartão atualizado com sucesso.",
        });

        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar o cartão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="card-number">Número do Cartão</Label>
          <div className="mt-1 p-3 border rounded-md">
            <CardNumberElement id="card-number" options={elementOptions} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="card-expiry">Validade</Label>
            <div className="mt-1 p-3 border rounded-md">
              <CardExpiryElement id="card-expiry" options={elementOptions} />
            </div>
          </div>
          <div>
            <Label htmlFor="card-cvc">CVC</Label>
            <div className="mt-1 p-3 border rounded-md">
              <CardCvcElement id="card-cvc" options={elementOptions} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!stripe || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Cartão
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Cartão de Pagamento</DialogTitle>
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