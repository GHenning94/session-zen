import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void
  }
}

export const useGoogleAnalytics = () => {
  const location = useLocation()

  useEffect(() => {
    // Track page view on route change
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'G-KB3SCVSH9B', {
        page_path: location.pathname + location.search,
        page_title: document.title,
      })
      
      // Send page view event
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: location.pathname + location.search,
      })
    }
  }, [location])

  const trackEvent = (eventName: string, parameters?: any) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, parameters)
    }
  }

  const trackConversion = (conversionId: string, parameters?: any) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'conversion', {
        send_to: conversionId,
        ...parameters
      })
    }
  }

  return { trackEvent, trackConversion }
}