import { useEffect, useRef } from 'react';

const AnimatedGiftBox = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrame: number;
    let angle = 0;

    const animate = () => {
      angle += 0.012;
      const floatY = Math.sin(angle) * 5;
      const floatX = Math.cos(angle * 0.7) * 2;
      const rotateY = Math.sin(angle * 0.4) * 6;
      const rotateX = Math.cos(angle * 0.3) * 2;
      
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
    <div className="relative w-56 h-56 flex items-center justify-center -ml-8">
      {/* Sparkles */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${4 + Math.random() * 4}px`,
            height: `${4 + Math.random() * 4}px`,
            left: `${10 + (i * 9)}%`,
            top: `${8 + Math.sin(i * 1.5) * 35}%`,
            background: i % 2 === 0 ? 'hsl(221, 83%, 53%)' : 'hsl(221, 83%, 65%)',
            animation: `sparkle ${2 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
            boxShadow: '0 0 8px 2px hsla(221, 83%, 53%, 0.5)',
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
          className="absolute top-32 left-1/2 -translate-x-1/2 w-24 h-5 bg-black/15 rounded-full blur-lg"
          style={{ animation: 'shadowPulse 4s ease-in-out infinite' }}
        />

        {/* Box Base */}
        <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {/* Main box - front face */}
          <div 
            className="w-32 h-28 rounded-xl relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(221, 83%, 65%) 0%, hsl(221, 83%, 53%) 50%, hsl(221, 83%, 40%) 100%)',
              boxShadow: '0 25px 50px -12px hsla(221, 83%, 53%, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
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
              className="absolute left-1/2 -translate-x-1/2 w-7 h-full"
              style={{
                background: 'linear-gradient(90deg, hsl(221, 83%, 75%) 0%, hsl(221, 83%, 85%) 30%, hsl(0, 0%, 100%) 50%, hsl(221, 83%, 85%) 70%, hsl(221, 83%, 75%) 100%)',
                boxShadow: '0 0 12px hsla(221, 83%, 53%, 0.4)',
              }}
            />
            
            {/* Horizontal ribbon */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-full h-7"
              style={{
                background: 'linear-gradient(180deg, hsl(221, 83%, 75%) 0%, hsl(221, 83%, 85%) 30%, hsl(0, 0%, 100%) 50%, hsl(221, 83%, 85%) 70%, hsl(221, 83%, 75%) 100%)',
                boxShadow: '0 0 12px hsla(221, 83%, 53%, 0.4)',
              }}
            />

            {/* Ribbon intersection shine */}
            <div 
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-sm"
              style={{
                background: 'radial-gradient(circle, hsl(0, 0%, 100%) 0%, hsl(221, 83%, 85%) 100%)',
              }}
            />
          </div>

          {/* Box Lid */}
          <div 
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-36 h-8 rounded-xl overflow-hidden"
            style={{ 
              background: 'linear-gradient(135deg, hsl(221, 83%, 70%) 0%, hsl(221, 83%, 53%) 50%, hsl(221, 83%, 45%) 100%)',
              boxShadow: '0 -5px 25px hsla(221, 83%, 53%, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
              transformOrigin: 'bottom center',
              animation: 'lidFloat 4s ease-in-out infinite',
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
              className="absolute left-1/2 -translate-x-1/2 w-7 h-full"
              style={{
                background: 'linear-gradient(90deg, hsl(221, 83%, 75%) 0%, hsl(221, 83%, 85%) 30%, hsl(0, 0%, 100%) 50%, hsl(221, 83%, 85%) 70%, hsl(221, 83%, 75%) 100%)',
              }}
            />
          </div>

          {/* Bow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
            {/* Left loop */}
            <div 
              className="absolute -left-9 top-3 w-11 h-8 rounded-full"
              style={{ 
                background: 'linear-gradient(135deg, hsl(0, 0%, 100%) 0%, hsl(221, 83%, 85%) 40%, hsl(221, 83%, 65%) 100%)',
                transform: 'rotate(-25deg)',
                boxShadow: '0 4px 18px hsla(221, 83%, 53%, 0.4)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 60%)',
                }}
              />
            </div>
            
            {/* Right loop */}
            <div 
              className="absolute -right-9 top-3 w-11 h-8 rounded-full"
              style={{ 
                background: 'linear-gradient(225deg, hsl(0, 0%, 100%) 0%, hsl(221, 83%, 85%) 40%, hsl(221, 83%, 65%) 100%)',
                transform: 'rotate(25deg)',
                boxShadow: '0 4px 18px hsla(221, 83%, 53%, 0.4)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(225deg, rgba(255,255,255,0.6) 0%, transparent 60%)',
                }}
              />
            </div>

            {/* Ribbon tails */}
            <div 
              className="absolute -left-4 top-9 w-4 h-12 rounded-b-full"
              style={{ 
                background: 'linear-gradient(180deg, hsl(221, 83%, 85%) 0%, hsl(221, 83%, 65%) 100%)',
                transform: 'rotate(-12deg)',
              }}
            />
            <div 
              className="absolute -right-4 top-9 w-4 h-12 rounded-b-full"
              style={{ 
                background: 'linear-gradient(180deg, hsl(221, 83%, 85%) 0%, hsl(221, 83%, 65%) 100%)',
                transform: 'rotate(12deg)',
              }}
            />
            
            {/* Bow center knot */}
            <div 
              className="relative w-7 h-7 rounded-full z-10 left-1/2 -translate-x-1/2 top-5"
              style={{
                background: 'radial-gradient(circle at 30% 30%, hsl(0, 0%, 100%) 0%, hsl(221, 83%, 80%) 50%, hsl(221, 83%, 53%) 100%)',
                boxShadow: '0 4px 12px hsla(221, 83%, 40%, 0.4)',
              }}
            >
              <div 
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7) 0%, transparent 50%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0.9; }
        }
        @keyframes lidFloat {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-2px); }
        }
        @keyframes shadowPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.15; }
          50% { transform: translateX(-50%) scale(1.05); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedGiftBox;
