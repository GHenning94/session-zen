import { Heart } from 'lucide-react'

export function DashboardFooter() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="w-full py-6 mt-8 border-t border-border/50">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>Feito com</span>
          <Heart className="w-4 h-4 text-destructive fill-destructive animate-pulse" />
          <span>para transformar vidas</span>
        </div>
        <p className="text-xs text-muted-foreground/70">
          © {currentYear} Todos os direitos reservados
        </p>
      </div>
    </footer>
  )
}

export default DashboardFooter
