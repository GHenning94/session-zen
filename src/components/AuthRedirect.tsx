import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export const AuthRedirect = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    console.log('🔀 AuthRedirect: checking auth state', { user: !!user, loading, pathname: location.pathname })
    
    if (loading) {
      console.log('🔀 AuthRedirect: still loading, waiting...')
      return
    }

    // ONLY redirect logged users away from landing page to dashboard IF they just logged in
    // Allow logged users to visit landing page after logout
    if (user && location.pathname === '/' && location.state?.fromLogin) {
      console.log('🔀 AuthRedirect: user logged in on landing page, redirecting to dashboard')
      navigate('/dashboard', { replace: true })
    }
    
    // If logged user is on login page, redirect to dashboard
    if (user && location.pathname === '/login') {
      console.log('🔀 AuthRedirect: user logged in on login page, redirecting to dashboard')
      navigate('/dashboard', { replace: true })
    }

    if (!user && loading === false) {
      console.log('🔀 AuthRedirect: no user detected, staying on current page:', location.pathname)
    }
  }, [user, loading, location.pathname, navigate])

  return null
}