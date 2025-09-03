import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Gift, Users, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface InviteReferralModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const InviteReferralModal = ({ open, onOpenChange }: InviteReferralModalProps) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [referralStats] = useState({
    totalInvites: 5,
    acceptedInvites: 2,
    bonusEarned: 59.80
  })

  const referralLink = user ? `${window.location.origin}/signup?ref=${user.id}` : ''

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink)
    toast({
      title: "Link copiado!",
      description: "O link de convite foi copiado para a área de transferência.",
    })
  }

  const benefits = [
    { icon: Gift, title: "Desconto de 20%", description: "Seus amigos ganham 20% de desconto no primeiro mês" },
    { icon: Star, title: "Você ganha R$ 29,90", description: "Para cada amigo que se inscrever, você recebe créditos" },
    { icon: Users, title: "Sem limite", description: "Convide quantos amigos quiser e ganhe sempre" }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Programa de Indicação
          </DialogTitle>
          <DialogDescription>
            Convide amigos e ganhe recompensas! Compartilhe o TherapyPro e receba créditos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Link de Convite */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Seu Link de Convite</CardTitle>
              <CardDescription>
                Compartilhe este link exclusivo com seus colegas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input 
                  value={referralLink} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={copyToClipboard}
                  variant="outline"
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Benefícios */}
          <div>
            <h3 className="font-semibold mb-3">Como funciona:</h3>
            <div className="grid gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{benefit.title}</h4>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estatísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Suas Estatísticas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{referralStats.totalInvites}</div>
                  <div className="text-sm text-muted-foreground">Convites Enviados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{referralStats.acceptedInvites}</div>
                  <div className="text-sm text-muted-foreground">Inscrições</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warning">R$ {referralStats.bonusEarned.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Créditos Ganhos</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-3">
            <Button onClick={copyToClipboard} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}