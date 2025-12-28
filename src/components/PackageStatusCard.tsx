import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Package, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatCurrencyBR } from '@/utils/formatters'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'

interface PackageWithSessions {
  id: string
  nome: string
  total_sessoes: number
  sessoes_consumidas: number
  valor_total: number
  valor_por_sessao?: number
  metodo_pagamento?: string
  status: string
  client_id: string
  sessoes_criadas: number
}

interface PackageStats {
  totalPackages: number
  activePackages: number
  totalSessions: number
  consumedSessions: number
  remainingSessions: number
  totalRevenue: number
  packagesNearEnd: number
}

interface PackageStatusCardProps {
  stats: PackageStats
}

export const PackageStatusCard = ({ stats }: PackageStatusCardProps) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  
  // Animated progress values
  const [animatedCompletionRate, setAnimatedCompletionRate] = useState(0)
  const [animatedSessionsCreatedRate, setAnimatedSessionsCreatedRate] = useState(0)
  
  // Swipe gesture state
  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const minSwipeDistance = 50

  // Smooth transition handler
  const changePackage = (newIndex: number) => {
    if (newIndex === currentIndex || isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(newIndex)
      setTimeout(() => setIsTransitioning(false), 50)
    }, 150)
  }

  // Fetch active packages with session counts
  const { data: packages = [] } = useQuery({
    queryKey: ['active-packages-with-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      
      // Get active packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
      
      if (packagesError) throw packagesError
      if (!packagesData || packagesData.length === 0) return []

      // Get session counts for each package
      const packagesWithSessions = await Promise.all(
        packagesData.map(async (pkg) => {
          const { count } = await supabase
            .from('sessions')
            .select('*', { count: 'exact', head: true })
            .eq('package_id', pkg.id)
          
          return {
            ...pkg,
            sessoes_criadas: count || 0
          }
        })
      )

      return packagesWithSessions as PackageWithSessions[]
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true
  })

  const activePackages = packages.filter(p => p.status === 'ativo')
  const currentPackage = activePackages[currentIndex]

  // Calculate actual rates
  const completionRate = currentPackage 
    ? Math.round((currentPackage.sessoes_consumidas / currentPackage.total_sessoes) * 100) 
    : 0

  const sessionsCreatedRate = currentPackage 
    ? Math.round((currentPackage.sessoes_criadas / currentPackage.total_sessoes) * 100) 
    : 0

  // Animate progress bars when package changes
  useEffect(() => {
    // Reset to 0 immediately
    setAnimatedCompletionRate(0)
    setAnimatedSessionsCreatedRate(0)
    
    // Animate to actual value after a small delay
    const timeout = setTimeout(() => {
      setAnimatedCompletionRate(completionRate)
      setAnimatedSessionsCreatedRate(sessionsCreatedRate)
    }, 100)
    
    return () => clearTimeout(timeout)
  }, [currentIndex, completionRate, sessionsCreatedRate, currentPackage?.id])

  // Check package status
  const getPackageStatus = (pkg: PackageWithSessions | undefined) => {
    if (!pkg) return { allSessionsCreated: false, hasPaymentMethod: false }
    
    const allSessionsCreated = pkg.sessoes_criadas >= pkg.total_sessoes
    const hasPaymentMethod = pkg.metodo_pagamento && pkg.metodo_pagamento !== 'A definir'
    
    return { allSessionsCreated, hasPaymentMethod }
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newIndex = currentIndex === 0 ? activePackages.length - 1 : currentIndex - 1
    changePackage(newIndex)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newIndex = currentIndex === activePackages.length - 1 ? 0 : currentIndex + 1
    changePackage(newIndex)
  }

  const goToIndex = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    changePackage(index)
  }

  // Reset index if packages change
  useEffect(() => {
    if (currentIndex >= activePackages.length) {
      setCurrentIndex(0)
    }
  }, [activePackages.length, currentIndex])

  // Swipe gesture handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    
    const distance = touchStartX.current - touchEndX.current
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe && activePackages.length > 1) {
      // Swipe left = next package
      const newIndex = currentIndex === activePackages.length - 1 ? 0 : currentIndex + 1
      changePackage(newIndex)
    }
    if (isRightSwipe && activePackages.length > 1) {
      // Swipe right = previous package
      const newIndex = currentIndex === 0 ? activePackages.length - 1 : currentIndex - 1
      changePackage(newIndex)
    }
    
    touchStartX.current = null
    touchEndX.current = null
  }

  // If no active packages, show summary card with consistent height
  if (activePackages.length === 0) {
    const summaryCompletionRate = stats.totalSessions > 0 
      ? Math.round((stats.consumedSessions / stats.totalSessions) * 100) 
      : 0

    return (
      <Card 
        className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
        onClick={() => navigate('/pacotes')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pacotes de Sessões</CardTitle>
          <Package className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent className="flex flex-col min-h-[340px]">
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-2xl font-bold">{stats.activePackages}</span>
              <p className="text-xs text-muted-foreground">Pacotes ativos</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso Geral</span>
                <span className="font-medium">{summaryCompletionRate}%</span>
              </div>
              <Progress value={summaryCompletionRate} className="h-2" />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Sessões disponíveis</p>
              <span className="text-xl font-semibold">{stats.remainingSessions}</span>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); navigate('/pacotes'); }}>
                <Package className="h-4 w-4 mr-2" />
                {stats.activePackages > 0 ? 'Ver pacotes' : 'Criar primeiro pacote'}
              </Button>
            </div>
          </div>
          
          {/* Spacer to maintain consistent height */}
          <div className="flex-grow" />
        </CardContent>
      </Card>
    )
  }

  // Show individual package carousel
  const revenuePerSession = currentPackage?.valor_por_sessao || 
    (currentPackage ? currentPackage.valor_total / currentPackage.total_sessoes : 0)

  const { allSessionsCreated, hasPaymentMethod } = getPackageStatus(currentPackage)
  const isComplete = allSessionsCreated && hasPaymentMethod

  // Render status reminder
  const renderStatusReminder = () => {
    if (isComplete) {
      return (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Pacote configurado corretamente</span>
        </div>
      )
    }

    const missingItems: string[] = []
    if (!allSessionsCreated) {
      missingItems.push('criar todas as sessões')
    }
    if (!hasPaymentMethod) {
      missingItems.push('definir método de pagamento')
    }

    return (
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-warning/10 text-warning">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span className="text-sm">
          <span className="font-medium">Pendente:</span> {missingItems.join(' e ')}
        </span>
      </div>
    )
  }

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary select-none"
      onClick={() => navigate('/pacotes')}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Pacotes de Sessões</CardTitle>
        <Package className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className="flex flex-col min-h-[340px]">
        <div 
          className={`space-y-3 transition-all duration-200 ease-out ${
            isTransitioning 
              ? 'opacity-0 transform translate-x-2' 
              : 'opacity-100 transform translate-x-0'
          }`}
        >
          {/* Package Name */}
          <div className="space-y-1">
            <span className="text-lg font-bold truncate block">{currentPackage?.nome}</span>
            <p className="text-xs text-muted-foreground">Pacote ativo</p>
          </div>

          {/* Sessions Progress (consumidas) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sessões Consumidas</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress 
              value={animatedCompletionRate} 
              className="h-2 transition-all duration-500 ease-out" 
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentPackage?.sessoes_consumidas || 0} consumidas</span>
              <span>{(currentPackage?.total_sessoes || 0) - (currentPackage?.sessoes_consumidas || 0)} restantes</span>
            </div>
          </div>

          {/* Sessions Created Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sessões Criadas</span>
              <span className="font-medium">{sessionsCreatedRate}%</span>
            </div>
            <Progress 
              value={animatedSessionsCreatedRate} 
              className="h-2 transition-all duration-500 ease-out" 
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentPackage?.sessoes_criadas || 0} criadas</span>
              <span>{currentPackage?.total_sessoes || 0} total</span>
            </div>
          </div>

          {/* Revenue Info */}
          <div className="pt-1 border-t flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Receita/Sessão</p>
              <p className="text-sm font-semibold text-primary">
                {formatCurrencyBR(revenuePerSession)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Receita Total</p>
              <p className="text-sm font-semibold text-primary">
                {formatCurrencyBR(currentPackage?.valor_total || 0)}
              </p>
            </div>
          </div>

          {/* Dynamic Status Reminder */}
          <div className="pt-2 min-h-[70px]">
            {renderStatusReminder()}
          </div>
        </div>

        {/* Spacer to push navigation to bottom */}
        <div className="flex-grow" />

        {/* Carousel Navigation Dots */}
        {activePackages.length > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 mt-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              {activePackages.map((_, index) => (
                <button
                  key={index}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === currentIndex 
                      ? 'bg-primary' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  onClick={(e) => goToIndex(index, e)}
                />
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}