import { useEffect, useRef } from 'react';

const AnimatedGiftBox = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add floating animation
    let animationFrame: number;
    let angle = 0;

    const animate = () => {
      angle += 0.02;
      const floatY = Math.sin(angle) * 8;
      const rotate = Math.sin(angle * 0.5) * 3;
      
      if (container) {
        container.style.transform = `translateY(${floatY}px) rotateY(${rotate}deg)`;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="relative w-64 h-40 flex items-center justify-center overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/20 rounded-2xl" />
      
      {/* Sparkles */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-pulse"
            style={{
              left: `${10 + (i * 7)}%`,
              top: `${15 + Math.sin(i) * 30}%`,
              animationDelay: `${i * 0.2}s`,
              opacity: 0.6 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      {/* 3D Gift Box */}
      <div 
        ref={containerRef}
        className="relative"
        style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
      >
        {/* Box Base */}
        <div className="relative">
          {/* Main box */}
          <div className="w-24 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-2xl relative">
            {/* Box shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-lg" />
            
            {/* Vertical ribbon */}
            <div className="absolute left-1/2 -translate-x-1/2 w-5 h-full bg-gradient-to-b from-yellow-400 to-amber-500 rounded-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
            
            {/* Horizontal ribbon */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-5 bg-gradient-to-r from-yellow-400 to-amber-500">
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
            </div>
          </div>

          {/* Box Lid */}
          <div 
            className="absolute -top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-gradient-to-br from-pink-400 to-rose-500 rounded-t-lg shadow-lg"
            style={{ 
              transformOrigin: 'bottom center',
              animation: 'lidFloat 3s ease-in-out infinite'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-t-lg" />
            
            {/* Lid ribbon */}
            <div className="absolute left-1/2 -translate-x-1/2 w-5 h-full bg-gradient-to-b from-yellow-400 to-amber-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>

          {/* Bow */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            {/* Bow loops */}
            <div className="relative">
              <div 
                className="absolute -left-6 top-1 w-8 h-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full"
                style={{ 
                  transform: 'rotate(-30deg)',
                  animation: 'bowLeft 2s ease-in-out infinite'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent rounded-full" />
              </div>
              <div 
                className="absolute -right-6 top-1 w-8 h-6 bg-gradient-to-bl from-yellow-400 to-amber-500 rounded-full"
                style={{ 
                  transform: 'rotate(30deg)',
                  animation: 'bowRight 2s ease-in-out infinite'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-bl from-white/40 to-transparent rounded-full" />
              </div>
              {/* Bow center */}
              <div className="relative w-4 h-4 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full z-10 left-1/2 -translate-x-1/2 top-2 shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full" />
              </div>
            </div>
          </div>

          {/* Floating particles */}
          <div className="absolute -inset-8">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${20 + i * 12}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  background: i % 2 === 0 ? 'linear-gradient(to br, #fbbf24, #f59e0b)' : 'linear-gradient(to br, #ec4899, #db2777)',
                  animation: `floatParticle ${2 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lidFloat {
          0%, 100% { transform: translateX(-50%) rotateX(0deg); }
          50% { transform: translateX(-50%) rotateX(-5deg) translateY(-2px); }
        }
        @keyframes bowLeft {
          0%, 100% { transform: rotate(-30deg) scale(1); }
          50% { transform: rotate(-35deg) scale(1.05); }
        }
        @keyframes bowRight {
          0%, 100% { transform: rotate(30deg) scale(1); }
          50% { transform: rotate(35deg) scale(1.05); }
        }
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { transform: translateY(-10px) scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedGiftBox;
