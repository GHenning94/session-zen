import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

const WhatsAppButton = () => {
  const handleWhatsAppClick = () => {
    const phoneNumber = "+5511945539883"
    const message = "Olá! Preciso de ajuda com o TherapyPro."
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleWhatsAppClick}
        className="w-14 h-14 rounded-full shadow-lg hover:opacity-90 transition-all bg-green-600"
        size="icon"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </Button>
    </div>
  )
}

export default WhatsAppButton