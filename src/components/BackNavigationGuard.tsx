import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom'
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
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const navType = useNavigationType()
  const [showDialog, setShowDialog] = useState(false)
  const previousPathRef = useRef(location.pathname)
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    // Marcar que o usuário está em uma sessão autenticada
    if (user) {
      sessionStorage.setItem('session_active', 'true')
    }
  }, [user])

  useEffect(() => {
    const currentPath = location.pathname
    const previousPath = previousPathRef.current
    
    // Se estamos navegando devido ao dialog, ignorar
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false
      previousPathRef.current = currentPath
      return
    }

    // Só interceptar navegações POP (botão voltar/avançar do navegador)
    const isPop = navType === 'POP'
    const sessionActive = !!user
    const isCurrentPublic = PUBLIC_ROUTES.includes(currentPath)
    const wasPreviousPrivate = !PUBLIC_ROUTES.includes(previousPath)
    const dialogShown = sessionStorage.getItem('logout_dialog_shown') === 'true'

    if (sessionActive && isPop && isCurrentPublic && wasPreviousPrivate && !dialogShown) {
      // Bloquear a navegação avançando de volta
      sessionStorage.setItem('logout_dialog_shown', 'true')
      isNavigatingRef.current = true
      navigate(1) // Anula o back, voltando para a página privada
      setShowDialog(true)
    } else {
      // Atualizar o path anterior para navegações normais
      previousPathRef.current = currentPath
    }
  }, [location.pathname, navType, user, navigate])

  const handleConfirmLogout = async () => {
    setShowDialog(false)
    isNavigatingRef.current = true
    
    // Limpar todos os marcadores
    sessionStorage.removeItem('session_active')
    sessionStorage.removeItem('logout_dialog_shown')
    
    await signOut()
    navigate('/', { replace: true })
  }

  const handleCancelLogout = () => {
    setShowDialog(false)
    // Limpar o flag para permitir nova tentativa se o usuário tentar novamente
    sessionStorage.removeItem('logout_dialog_shown')
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
            onClick={handleCancelLogout}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Não
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmLogout}
            className="bg-transparent border border-input hover:bg-accent"
          >
            Sim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
