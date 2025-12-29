import { useEffect, useRef, useState, useMemo } from 'react';

interface Particle {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
  type: 'circle' | 'star' | 'sparkle';
}

const AnimatedGiftBox = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const colors = useMemo(() => [
    'hsl(221, 83%, 75%)',
    'hsl(221, 83%, 53%)',
    'hsl(221, 83%, 65%)',
    'hsl(210, 100%, 70%)',
    'hsl(230, 80%, 80%)',
  ], []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const generateParticles = () => {
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => {
      const angle = (Math.PI * 0.3) + (Math.random() * Math.PI * 1.4); // Mostly upward
      const distance = 60 + Math.random() * 80;
      const types: ('circle' | 'star' | 'sparkle')[] = ['circle', 'star', 'sparkle'];
      
      return {
        id: Date.now() + i + Math.random() * 1000,
        startX: 45 + Math.random() * 10,
        startY: 35 + Math.random() * 10,
        endX: 50 + Math.cos(angle) * distance * 0.6,
        endY: 50 - Math.sin(angle) * distance * 0.5,
        size: 3 + Math.random() * 6,
        delay: Math.random() * 0.3,
        duration: 0.8 + Math.random() * 0.6,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: types[Math.floor(Math.random() * types.length)],
      };
    });
    return newParticles;
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isHovered) {
      setParticles(generateParticles());
      intervalId = setInterval(() => {
        setParticles(generateParticles());
      }, 800);
    } else {
      setParticles([]);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isHovered, colors]);

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

  const renderParticle = (particle: Particle) => {
    const baseStyle = {
      left: `${particle.startX}%`,
      top: `${particle.startY}%`,
      animationDelay: `${particle.delay}s`,
      animationDuration: `${particle.duration}s`,
      '--end-x': `${particle.endX - particle.startX}%`,
      '--end-y': `${particle.endY - particle.startY}%`,
    } as React.CSSProperties;

    if (particle.type === 'star') {
      return (
        <svg
          key={particle.id}
          className="absolute pointer-events-none animate-particle-float"
          style={baseStyle}
          width={particle.size}
          height={particle.size}
          viewBox="0 0 24 24"
          fill={particle.color}
        >
          <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
        </svg>
      );
    }

    if (particle.type === 'sparkle') {
      return (
        <div
          key={particle.id}
          className="absolute pointer-events-none animate-particle-float"
          style={{
            ...baseStyle,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.size / 2}px ${particle.color}`,
            borderRadius: '50%',
          }}
        />
      );
    }

    return (
      <div
        key={particle.id}
        className="absolute pointer-events-none animate-particle-float"
        style={{
          ...baseStyle,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          background: `linear-gradient(135deg, ${particle.color}, hsl(221, 83%, 53%))`,
          boxShadow: `0 0 ${particle.size}px 2px ${particle.color}`,
          borderRadius: '50%',
        }}
      />
    );
  };

  return (
    <div 
      ref={wrapperRef}
      className={`relative w-64 h-64 flex items-center justify-center -ml-56 mt-8 transition-all duration-1000 ease-out group ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating Particles */}
      {particles.map(renderParticle)}

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
        className="relative transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3"
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
        @keyframes particleFloat {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(var(--end-x), var(--end-y)) scale(0.2) rotate(180deg);
          }
        }
        .animate-particle-float {
          animation: particleFloat ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AnimatedGiftBox;
