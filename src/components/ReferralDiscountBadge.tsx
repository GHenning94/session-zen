import { useState, useEffect } from "react";
import { Copy, Check, Gift, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const ReferralDiscountBadge = () => {
  const { user } = useAuth();
  const [showBadge, setShowBadge] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const COUPON_CODE = "INDICACAO20";

  useEffect(() => {
    const checkReferralStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Verificar se o usuário foi indicado
        const { data: referralData, error } = await supabase
          .from('referrals')
          .select('id, status, first_payment_date')
          .eq('referred_user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[ReferralDiscountBadge] Error:', error);
          setIsLoading(false);
          return;
        }

        // Mostrar badge apenas se:
        // 1. Usuário foi indicado (tem registro em referrals)
        // 2. Ainda não fez pagamento (first_payment_date é null)
        if (referralData && !referralData.first_payment_date) {
          setShowBadge(true);
        } else {
          setShowBadge(false);
        }
      } catch (err) {
        console.error('[ReferralDiscountBadge] Exception:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkReferralStatus();
  }, [user]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar código");
    }
  };

  const handleDismiss = () => {
    setShowBadge(false);
    // Salvar no localStorage para não mostrar novamente nesta sessão
    localStorage.setItem('referral_badge_dismissed', 'true');
  };

  // Verificar se foi dispensado anteriormente
  useEffect(() => {
    const dismissed = localStorage.getItem('referral_badge_dismissed');
    if (dismissed === 'true') {
      setShowBadge(false);
    }
  }, []);

  if (isLoading || !showBadge) return null;

  return (
    <div className="relative mb-4 overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-lg">
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/10" />
      
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
          <Gift className="h-6 w-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-semibold">🎉 Você tem um desconto especial!</h3>
          <p className="mt-0.5 text-xs text-white/90">
            Use o código abaixo e ganhe <strong>20% OFF</strong> no primeiro mês do plano Profissional
          </p>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-emerald-600 transition-all hover:bg-white/90 hover:shadow-lg active:scale-95"
        >
          <span className="font-mono">{COUPON_CODE}</span>
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
};
