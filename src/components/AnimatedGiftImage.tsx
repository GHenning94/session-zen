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

// Single gift box component with customizable size and offset
const GiftBox = ({ 
  scale = 1, 
  offsetX = 0,
  offsetY = 0,
  delay = 0 
}: { 
  scale?: number; 
  offsetX?: number;
  offsetY?: number;
  delay?: number;
}) => {
  return (
    <div 
      className="absolute"
      style={{ 
        left: '50%',
        bottom: '20px',
        marginLeft: `${offsetX}px`,
        marginBottom: `${-offsetY}px`,
        transform: `translateX(-50%) scale(${scale})`,
        transformStyle: 'preserve-3d',
        animation: `giftFloat ${3 + delay}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    >
      {/* Box Base */}
      <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
        {/* Main box */}
        <div 
          className="w-20 h-18 rounded-lg relative overflow-hidden"
          style={{
            width: '80px',
            height: '72px',
            background: 'linear-gradient(135deg, hsl(221, 83%, 65%) 0%, hsl(221, 83%, 53%) 50%, hsl(221, 83%, 40%) 100%)',
            boxShadow: '0 15px 35px -8px hsla(221, 83%, 53%, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          {/* Box shine */}
          <div 
            className="absolute inset-0 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
            }}
          />
          
          {/* Vertical ribbon */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-4 h-full"
            style={{
              background: 'linear-gradient(90deg, hsl(221, 83%, 75%) 0%, hsl(221, 83%, 85%) 30%, hsl(0, 0%, 100%) 50%, hsl(221, 83%, 85%) 70%, hsl(221, 83%, 75%) 100%)',
              boxShadow: '0 0 8px hsla(221, 83%, 53%, 0.4)',
            }}
          />
          
          {/* Horizontal ribbon */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-full h-4"
            style={{
              background: 'linear-gradient(180deg, hsl(221, 83%, 75%) 0%, hsl(221, 83%, 85%) 30%, hsl(0, 0%, 100%) 50%, hsl(221, 83%, 85%) 70%, hsl(221, 83%, 75%) 100%)',
              boxShadow: '0 0 8px hsla(221, 83%, 53%, 0.4)',
            }}
          />

          {/* Ribbon intersection */}
          <div 
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-sm"
            style={{
              background: 'radial-gradient(circle, hsl(0, 0%, 100%) 0%, hsl(221, 83%, 85%) 100%)',
            }}
          />
        </div>

        {/* Box Lid */}
        <div 
          className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-lg overflow-hidden"
          style={{ 
            width: '90px',
            height: '20px',
            background: 'linear-gradient(135deg, hsl(221, 83%, 70%) 0%, hsl(221, 83%, 53%) 50%, hsl(221, 83%, 45%) 100%)',
            boxShadow: '0 -3px 15px hsla(221, 83%, 53%, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
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
            className="absolute left-1/2 -translate-x-1/2 w-4 h-full"
            style={{
              background: 'linear-gradient(90deg, hsl(221, 83%, 75%) 0%, hsl(221, 83%, 85%) 30%, hsl(0, 0%, 100%) 50%, hsl(221, 83%, 85%) 70%, hsl(221, 83%, 75%) 100%)',
            }}
          />
        </div>

        {/* Bow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
          {/* Left loop */}
          <div 
            className="absolute -left-6 top-2 w-7 h-5 rounded-full"
            style={{ 
              background: 'linear-gradient(135deg, hsl(0, 0%, 100%) 0%, hsl(221, 83%, 85%) 40%, hsl(221, 83%, 65%) 100%)',
              transform: 'rotate(-25deg)',
              boxShadow: '0 3px 12px hsla(221, 83%, 53%, 0.4)',
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
            className="absolute -right-6 top-2 w-7 h-5 rounded-full"
            style={{ 
              background: 'linear-gradient(225deg, hsl(0, 0%, 100%) 0%, hsl(221, 83%, 85%) 40%, hsl(221, 83%, 65%) 100%)',
              transform: 'rotate(25deg)',
              boxShadow: '0 3px 12px hsla(221, 83%, 53%, 0.4)',
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
            className="absolute -left-2 top-6 w-2.5 h-8 rounded-b-full"
            style={{ 
              background: 'linear-gradient(180deg, hsl(221, 83%, 85%) 0%, hsl(221, 83%, 65%) 100%)',
              transform: 'rotate(-12deg)',
            }}
          />
          <div 
            className="absolute -right-2 top-6 w-2.5 h-8 rounded-b-full"
            style={{ 
              background: 'linear-gradient(180deg, hsl(221, 83%, 85%) 0%, hsl(221, 83%, 65%) 100%)',
              transform: 'rotate(12deg)',
            }}
          />
          
          {/* Bow center knot */}
          <div 
            className="relative w-4 h-4 rounded-full z-10 left-1/2 -translate-x-1/2 top-3"
            style={{
              background: 'radial-gradient(circle at 30% 30%, hsl(0, 0%, 100%) 0%, hsl(221, 83%, 80%) 50%, hsl(221, 83%, 53%) 100%)',
              boxShadow: '0 2px 8px hsla(221, 83%, 40%, 0.4)',
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
  );
};


const AnimatedGiftImage = () => {
  const floatingRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const colors = useMemo(() => [
    'hsl(221, 83%, 75%)',
    'hsl(221, 83%, 53%)',
    'hsl(221, 83%, 65%)',
    'hsl(210, 100%, 70%)',
    'hsl(230, 80%, 80%)',
    'hsl(45, 90%, 60%)',
  ], []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const generateParticles = () => {
    const newParticles: Particle[] = Array.from({ length: 25 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 120;
      const types: ('circle' | 'star' | 'sparkle')[] = ['circle', 'star', 'sparkle'];
      
      return {
        id: Date.now() + i + Math.random() * 1000,
        startX: 40 + Math.random() * 20,
        startY: 40 + Math.random() * 20,
        endX: 50 + Math.cos(angle) * distance * 0.5,
        endY: 50 + Math.sin(angle) * distance * 0.4,
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

  // Floating animation
  useEffect(() => {
    const floatingElement = floatingRef.current;
    if (!floatingElement) return;

    let animationFrame: number;
    let angle = 0;

    const animate = () => {
      angle += 0.01;
      const floatY = Math.sin(angle) * 4;
      const floatX = Math.cos(angle * 0.7) * 2;
      
      if (floatingElement) {
        floatingElement.style.transform = `translateY(${floatY}px) translateX(${floatX}px)`;
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
      className={`relative flex items-center justify-center transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'
      }`}
      style={{ width: '500px', height: '220px' }}
    >
      {/* Floating Particles */}
      {particles.map(renderParticle)}

      {/* Sparkles - distributed around the gifts */}
      {[...Array(24)].map((_, i) => {
        const size = 3 + Math.random() * 5;
        const opacity = 0.4 + Math.random() * 0.5;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${8 + (i * 3.5) + Math.sin(i) * 5}%`,
              top: `${12 + Math.sin(i * 0.8) * 35 + Math.cos(i * 1.5) * 15}%`,
              background: i % 3 === 0 
                ? 'hsl(221, 83%, 53%)' 
                : i % 3 === 1 
                  ? 'hsl(221, 83%, 65%)' 
                  : 'hsl(210, 100%, 70%)',
              opacity,
              animation: `sparkle ${1.8 + (i % 5) * 0.4}s ease-in-out infinite`,
              animationDelay: `${(i % 8) * 0.2}s`,
              boxShadow: `0 0 ${size * 2}px ${size / 2}px hsla(221, 83%, 53%, ${opacity * 0.8})`,
            }}
          />
        );
      })}

      {/* Hover wrapper */}
      <div 
        className={`relative cursor-pointer transition-transform duration-300 ease-out ${isHovered ? 'scale-105 -translate-y-2' : 'scale-100 translate-y-0'}`}
        style={{ 
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating container */}
        <div 
          ref={floatingRef}
          className="relative"
          style={{ width: '420px', height: '180px' }}
        >
          {/* Shadow */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-6 bg-black/10 rounded-full blur-xl"
            style={{ animation: 'shadowPulse 4s ease-in-out infinite' }}
          />

          {/* Multiple Gift Boxes - horizontal layout */}
          <GiftBox scale={0.75} offsetX={-140} offsetY={5} delay={0.3} />
          <GiftBox scale={0.95} offsetX={0} offsetY={0} delay={0} />
          <GiftBox scale={0.7} offsetX={135} offsetY={8} delay={0.5} />

        </div>
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0.9; }
        }
        @keyframes giftFloat {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }
        @keyframes particleFloatLoop {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateY(-10px) scale(1.15); opacity: 1; }
        }
        @keyframes shadowPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.1; }
          50% { transform: translateX(-50%) scale(1.05); opacity: 0.15; }
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

export default AnimatedGiftImage;