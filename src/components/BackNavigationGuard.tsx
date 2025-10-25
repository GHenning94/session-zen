import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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

const PUBLIC_ROUTES = ['/', '/login', '/signup']

export function BackNavigationGuard() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    // Marcar o ponto de entrada na sessão autenticada
    const sessionEntryMarker = 'app_session_entry'
    
    // Se ainda não marcamos a entrada da sessão, marcar agora
    if (!sessionStorage.getItem(sessionEntryMarker)) {
      sessionStorage.setItem(sessionEntryMarker, 'true')
      // Adicionar um estado especial no histórico para marcar onde a sessão começou
      window.history.pushState({ sessionBoundary: true }, '')
    }

    const handlePopState = (event: PopStateEvent) => {
      // Se encontrarmos o marcador de sessão, significa que o usuário
      // está tentando voltar para antes do login
      if (event.state && event.state.sessionBoundary) {
        // Bloquear a navegação
        window.history.pushState({ sessionBoundary: true }, '')
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
    // Limpar o marcador de sessão
    sessionStorage.removeItem('app_session_entry')
    await signOut()
    navigate('/', { replace: true })
  }

  const handleCancelLogout = () => {
    setShowDialog(false)
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
