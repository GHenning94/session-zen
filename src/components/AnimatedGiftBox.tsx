import { useEffect, useRef } from 'react';

const AnimatedGiftBox = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrame: number;
    let angle = 0;

    const animate = () => {
      angle += 0.015;
      const floatY = Math.sin(angle) * 6;
      const floatX = Math.cos(angle * 0.7) * 3;
      const rotateY = Math.sin(angle * 0.5) * 8;
      const rotateX = Math.cos(angle * 0.3) * 3;
      
      if (container) {
        container.style.transform = `translateY(${floatY}px) translateX(${floatX}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Sparkles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-yellow-400"
          style={{
            width: `${3 + Math.random() * 4}px`,
            height: `${3 + Math.random() * 4}px`,
            left: `${15 + (i * 10)}%`,
            top: `${10 + Math.sin(i * 1.5) * 35}%`,
            animation: `sparkle ${1.5 + i * 0.2}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
            boxShadow: '0 0 6px 2px rgba(251, 191, 36, 0.6)',
          }}
        />
      ))}

      {/* 3D Gift Box */}
      <div 
        ref={containerRef}
        className="relative"
        style={{ 
          perspective: '800px', 
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Shadow */}
        <div 
          className="absolute top-28 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/20 rounded-full blur-md"
          style={{ animation: 'shadowPulse 3s ease-in-out infinite' }}
        />

        {/* Box Base */}
        <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {/* Main box - front face */}
          <div 
            className="w-28 h-24 rounded-xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #be185d 100%)',
              boxShadow: '0 20px 40px -10px rgba(236, 72, 153, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Box shine */}
            <div 
              className="absolute inset-0 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
              }}
            />
            
            {/* Vertical ribbon */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-6 h-full"
              style={{
                background: 'linear-gradient(90deg, #d97706 0%, #fbbf24 30%, #fef08a 50%, #fbbf24 70%, #d97706 100%)',
                boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
              }}
            />
            
            {/* Horizontal ribbon */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-full h-6"
              style={{
                background: 'linear-gradient(180deg, #d97706 0%, #fbbf24 30%, #fef08a 50%, #fbbf24 70%, #d97706 100%)',
                boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
              }}
            />

            {/* Ribbon intersection shine */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-sm"
              style={{
                background: 'radial-gradient(circle, #fef08a 0%, #fbbf24 100%)',
              }}
            />
          </div>

          {/* Box Lid */}
          <div 
            className="absolute -top-5 left-1/2 -translate-x-1/2 w-32 h-7 rounded-xl overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, #f9a8d4 0%, #ec4899 50%, #db2777 100%)',
              boxShadow: '0 -5px 20px rgba(236, 72, 153, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
              transformOrigin: 'bottom center',
              animation: 'lidBounce 3s ease-in-out infinite',
            }}
          >
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 60%)',
              }}
            />
            
            {/* Lid ribbon */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 w-6 h-full"
              style={{
                background: 'linear-gradient(90deg, #d97706 0%, #fbbf24 30%, #fef08a 50%, #fbbf24 70%, #d97706 100%)',
              }}
            />
          </div>

          {/* Bow */}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2">
            {/* Left loop */}
            <div 
              className="absolute -left-8 top-3 w-10 h-7 rounded-full"
              style={{ 
                background: 'linear-gradient(135deg, #fef08a 0%, #fbbf24 40%, #d97706 100%)',
                transform: 'rotate(-25deg)',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)',
                animation: 'bowWiggleLeft 2s ease-in-out infinite',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 60%)',
                }}
              />
            </div>
            
            {/* Right loop */}
            <div 
              className="absolute -right-8 top-3 w-10 h-7 rounded-full"
              style={{ 
                background: 'linear-gradient(225deg, #fef08a 0%, #fbbf24 40%, #d97706 100%)',
                transform: 'rotate(25deg)',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.4)',
                animation: 'bowWiggleRight 2s ease-in-out infinite',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(225deg, rgba(255,255,255,0.5) 0%, transparent 60%)',
                }}
              />
            </div>

            {/* Ribbon tails */}
            <div 
              className="absolute -left-3 top-8 w-3 h-10 rounded-b-full"
              style={{ 
                background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
                transform: 'rotate(-15deg)',
                animation: 'tailSwing 2.5s ease-in-out infinite',
              }}
            />
            <div 
              className="absolute -right-3 top-8 w-3 h-10 rounded-b-full"
              style={{ 
                background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
                transform: 'rotate(15deg)',
                animation: 'tailSwing 2.5s ease-in-out infinite reverse',
              }}
            />
            
            {/* Bow center knot */}
            <div 
              className="relative w-6 h-6 rounded-full z-10 left-1/2 -translate-x-1/2 top-4"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #fef08a 0%, #fbbf24 50%, #b45309 100%)',
                boxShadow: '0 4px 10px rgba(180, 83, 9, 0.4)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6) 0%, transparent 50%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes lidBounce {
          0%, 100% { transform: translateX(-50%) translateY(0) rotateX(0deg); }
          50% { transform: translateX(-50%) translateY(-3px) rotateX(-3deg); }
        }
        @keyframes bowWiggleLeft {
          0%, 100% { transform: rotate(-25deg) scale(1); }
          50% { transform: rotate(-30deg) scale(1.05); }
        }
        @keyframes bowWiggleRight {
          0%, 100% { transform: rotate(25deg) scale(1); }
          50% { transform: rotate(30deg) scale(1.05); }
        }
        @keyframes tailSwing {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(-5deg); }
        }
        @keyframes shadowPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.2; }
          50% { transform: translateX(-50%) scale(1.1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedGiftBox;
