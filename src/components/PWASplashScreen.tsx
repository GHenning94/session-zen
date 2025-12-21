import { useEffect, useState } from 'react';

interface PWASplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export const PWASplashScreen = ({ onFinish, duration = 2500 }: PWASplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 500);

    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      onFinish();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
    >
      {/* Animated background lines */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Horizontal pulse lines */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            style={{
              top: `${10 + i * 12}%`,
              left: '-100%',
              right: '-100%',
              animation: `slideRight ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
        
        {/* Vertical pulse lines */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent"
            style={{
              left: `${15 + i * 15}%`,
              top: '-100%',
              bottom: '-100%',
              animation: `slideDown ${4 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}

        {/* ECG-style heartbeat line */}
        <svg 
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 opacity-20"
          viewBox="0 0 1200 100" 
          preserveAspectRatio="none"
          style={{
            height: '60px',
            animation: 'ecgSlide 2s linear infinite',
          }}
        >
          <path
            d="M0,50 L200,50 L220,50 L240,20 L260,80 L280,10 L300,90 L320,50 L340,50 L600,50 L620,50 L640,20 L660,80 L680,10 L700,90 L720,50 L740,50 L1000,50 L1020,50 L1040,20 L1060,80 L1080,10 L1100,90 L1120,50 L1200,50"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`p-${i}`}
            className="absolute rounded-full bg-primary/30"
            style={{
              width: `${2 + Math.random() * 4}px`,
              height: `${2 + Math.random() * 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `floatParticle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}

        {/* Radial glow behind logo */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
            animation: 'pulseGlow 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Stethoscope Icon with animation */}
      <div className="relative z-10 flex flex-col items-center">
        <div 
          className="relative"
          style={{
            animation: 'logoEntrance 0.8s ease-out forwards, logoPulse 2s ease-in-out infinite 0.8s',
          }}
        >
          {/* Glow ring */}
          <div 
            className="absolute inset-0 rounded-3xl"
            style={{
              background: 'hsl(var(--primary))',
              filter: 'blur(20px)',
              opacity: 0.4,
              animation: 'ringPulse 1.5s ease-in-out infinite',
            }}
          />
          
          {/* Icon container */}
          <div 
            className="relative w-32 h-32 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)',
              boxShadow: '0 20px 60px -10px hsl(var(--primary) / 0.5)',
            }}
          >
            {/* Animated stethoscope SVG - exact match to favicon */}
            <svg 
              viewBox="0 0 100 100" 
              className="w-20 h-20"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
              }}
            >
              {/* U-shaped tube with earpieces */}
              <path
                d="M28,18 L28,45 C28,62 40,72 50,72 C60,72 72,62 72,45 L72,18"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 160,
                  strokeDashoffset: 160,
                  animation: 'drawPath 1s ease-out forwards 0.3s',
                }}
              />
              
              {/* Left earpiece (rounded cap) */}
              <circle
                cx="28"
                cy="15"
                r="5"
                fill="white"
                style={{
                  opacity: 0,
                  animation: 'fadeInScale 0.3s ease-out forwards 1s',
                }}
              />
              
              {/* Right earpiece (rounded cap) */}
              <circle
                cx="72"
                cy="15"
                r="5"
                fill="white"
                style={{
                  opacity: 0,
                  animation: 'fadeInScale 0.3s ease-out forwards 1s',
                }}
              />
              
              {/* Tube curving from bottom center to chest piece */}
              <path
                d="M50,72 Q60,76 70,76 Q82,76 86,66"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 50,
                  strokeDashoffset: 50,
                  animation: 'drawPath 0.5s ease-out forwards 1.1s',
                }}
              />
              
              {/* Chest piece (diaphragm) outer circle */}
              <circle
                cx="86"
                cy="56"
                r="10"
                fill="none"
                stroke="white"
                strokeWidth="5"
                style={{
                  strokeDasharray: 65,
                  strokeDashoffset: 65,
                  animation: 'drawPath 0.4s ease-out forwards 1.4s',
                }}
              />
              
              {/* Chest piece inner dot */}
              <circle
                cx="86"
                cy="56"
                r="4"
                fill="white"
                style={{
                  opacity: 0,
                  animation: 'fadeInScale 0.3s ease-out forwards 1.7s',
                }}
              />
            </svg>
          </div>
        </div>

        {/* App name */}
        <div 
          className="mt-8 text-center"
          style={{
            opacity: 0,
            animation: 'fadeInUp 0.6s ease-out forwards 1s',
          }}
        >
          <h1 className="text-3xl font-bold text-white tracking-tight">
            TherapyPro
          </h1>
          <p className="text-sm text-white/60 mt-2">
            Gestão Clínica Inteligente
          </p>
        </div>

        {/* Loading indicator */}
        <div 
          className="mt-12 flex items-center gap-2"
          style={{
            opacity: 0,
            animation: 'fadeInUp 0.6s ease-out forwards 1.3s',
          }}
        >
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                style={{
                  animation: 'loadingDot 1s ease-in-out infinite',
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideRight {
          0%, 100% { transform: translateX(-50%); opacity: 0; }
          50% { transform: translateX(50%); opacity: 1; }
        }
        
        @keyframes slideDown {
          0%, 100% { transform: translateY(-50%); opacity: 0; }
          50% { transform: translateY(50%); opacity: 1; }
        }
        
        @keyframes ecgSlide {
          0% { transform: translateX(-33.33%) translateY(-50%); }
          100% { transform: translateX(0%) translateY(-50%); }
        }
        
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.6; }
        }
        
        @keyframes pulseGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.25; }
        }
        
        @keyframes logoEntrance {
          0% { transform: scale(0.5) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        
        @keyframes logoPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }
        
        @keyframes drawPath {
          to { stroke-dashoffset: 0; }
        }
        
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes loadingDot {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// Hook to detect if running as installed PWA
export const useIsPWA = (): boolean => {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    setIsPWA(isStandalone || isIOSStandalone);
  }, []);

  return isPWA;
};
