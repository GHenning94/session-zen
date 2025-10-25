import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function BackNavigationGuard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    // Adicionar um estado na história para detectar navegação back
    window.history.pushState({ authenticated: true }, '')

    const handlePopState = (event: PopStateEvent) => {
      // Se o estado não tem a flag authenticated, significa que o usuário
      // está tentando voltar para uma página pré-login
      if (!event.state || !event.state.authenticated) {
        // Prevenir a navegação adicionando o estado novamente
        window.history.pushState({ authenticated: true }, '')
        // Mostrar o diálogo
        setShowDialog(true)
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleConfirmLogout = async () => {
    setShowDialog(false)
    await signOut()
    navigate('/', { replace: true })
  }

  const handleCancelLogout = () => {
    setShowDialog(false)
    // Não precisa fazer nada, já bloqueamos a navegação
  }

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você deseja sair da plataforma?</AlertDialogTitle>
          <AlertDialogDescription>
            Ao confirmar, você será desconectado e redirecionado para a página inicial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleConfirmLogout}
            className="bg-transparent hover:bg-accent"
          >
            Sim
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleCancelLogout}>
            Não
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
