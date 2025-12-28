import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Copy, 
  Check, 
  MessageCircle, 
  Mail, 
  Link2, 
  Facebook, 
  Twitter, 
  Linkedin,
  Send
} from 'lucide-react';

interface ShareReferralModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralLink: string;
  referralCode: string;
}

const ShareReferralModal = ({ 
  open, 
  onOpenChange, 
  referralLink,
  referralCode 
}: ShareReferralModalProps) => {
  const [copied, setCopied] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  const defaultMessage = `Olá! 👋

Estou usando o Meu Consultório para gerenciar minha prática profissional e está sendo incrível!

Com ele consigo:
✅ Organizar toda minha agenda
✅ Gerenciar prontuários digitais
✅ Controlar pagamentos e finanças
✅ E muito mais!

Use meu link exclusivo para criar sua conta:
${referralLink}

Tenho certeza que vai te ajudar muito também! 🚀`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(defaultMessage);
      toast({
        title: "Mensagem copiada!",
        description: "A mensagem completa foi copiada.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive",
      });
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(defaultMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent('Convite para conhecer o Meu Consultório');
    const body = encodeURIComponent(defaultMessage);
    
    if (emailTo) {
      window.location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;
    } else {
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent('Conheça o Meu Consultório - Sistema completo de gestão para profissionais da saúde!')}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Conheça o Meu Consultório - Sistema completo de gestão para profissionais da saúde! 🚀')}&url=${encodeURIComponent(referralLink)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const handleLinkedInShare = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
    window.open(linkedinUrl, '_blank', 'width=600,height=400');
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Conheça o Meu Consultório - Sistema completo de gestão para profissionais da saúde!')}`;
    window.open(telegramUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Compartilhar Link de Indicação
          </DialogTitle>
          <DialogDescription>
            Escolha como você quer compartilhar seu link e ganhar 30% de comissão
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Copy Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Seu link exclusivo</Label>
            <div className="flex gap-2">
              <Input 
                value={referralLink} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                onClick={handleCopyLink} 
                variant="outline" 
                size="icon"
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Código: <span className="font-mono font-medium">{referralCode}</span>
            </p>
          </div>

          <Separator />

          {/* WhatsApp - Main CTA */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Compartilhar via WhatsApp</Label>
            <Button 
              onClick={handleWhatsAppShare}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Enviar pelo WhatsApp
            </Button>
          </div>

          <Separator />

          {/* Email Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Enviar por E-mail</Label>
            <div className="flex gap-2">
              <Input 
                type="email"
                placeholder="email@exemplo.com (opcional)"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
              <Button 
                onClick={handleEmailShare}
                variant="outline"
                className="shrink-0"
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>

          <Separator />

          {/* Social Networks */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Redes Sociais</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleFacebookShare}
                variant="outline"
                className="justify-start"
              >
                <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                Facebook
              </Button>
              <Button 
                onClick={handleTwitterShare}
                variant="outline"
                className="justify-start"
              >
                <Twitter className="w-4 h-4 mr-2 text-sky-500" />
                Twitter
              </Button>
              <Button 
                onClick={handleLinkedInShare}
                variant="outline"
                className="justify-start"
              >
                <Linkedin className="w-4 h-4 mr-2 text-blue-700" />
                LinkedIn
              </Button>
              <Button 
                onClick={handleTelegramShare}
                variant="outline"
                className="justify-start"
              >
                <Send className="w-4 h-4 mr-2 text-sky-500" />
                Telegram
              </Button>
            </div>
          </div>

          <Separator />

          {/* Copy Full Message */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Mensagem pronta para copiar</Label>
            <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-line max-h-32 overflow-y-auto">
              {defaultMessage}
            </div>
            <Button 
              onClick={handleCopyMessage}
              variant="secondary"
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar mensagem completa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareReferralModal;
