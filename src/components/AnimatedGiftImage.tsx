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
        transform: `translateX(${offsetX}px) translateY(${offsetY}px) scale(${scale})`,
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

// Floating particle (replacing coins) with intense glow
const FloatingParticle = ({ 
  x, 
  y, 
  size = 20,
  delay = 0 
}: { 
  x: number; 
  y: number; 
  size?: number;
  delay?: number;
}) => {
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, hsl(221, 83%, 75%) 0%, hsl(221, 83%, 60%) 40%, transparent 70%)`,
        boxShadow: `0 0 ${size * 2}px ${size}px hsla(221, 83%, 60%, 0.7), 0 0 ${size * 3}px ${size * 1.5}px hsla(221, 83%, 53%, 0.5), 0 0 ${size * 4}px ${size * 2}px hsla(221, 83%, 50%, 0.3)`,
        animation: `particleFloatLoop ${2.5 + delay}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
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
      style={{ width: '380px', height: '200px' }}
    >
      {/* Floating Particles */}
      {particles.map(renderParticle)}

      {/* Sparkles */}
      {[...Array(14)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${3 + Math.random() * 4}px`,
            height: `${3 + Math.random() * 4}px`,
            left: `${5 + (i * 7)}%`,
            top: `${15 + Math.sin(i * 1.2) * 25}%`,
            background: i % 2 === 0 ? 'hsl(221, 83%, 53%)' : 'hsl(221, 83%, 65%)',
            animation: `sparkle ${2 + i * 0.25}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
            boxShadow: '0 0 8px 2px hsla(221, 83%, 53%, 0.5)',
          }}
        />
      ))}

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
          className="relative flex items-end justify-center"
          style={{ width: '340px', height: '160px' }}
        >
          {/* Shadow */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-6 bg-black/10 rounded-full blur-xl"
            style={{ animation: 'shadowPulse 4s ease-in-out infinite' }}
          />

          {/* Multiple Gift Boxes - horizontal layout */}
          <GiftBox scale={0.9} offsetX={-120} offsetY={10} delay={0.3} />
          <GiftBox scale={1.1} offsetX={0} offsetY={0} delay={0} />
          <GiftBox scale={0.85} offsetX={115} offsetY={15} delay={0.5} />

          {/* Floating Particles */}
          <FloatingParticle x={8} y={55} size={18} delay={0.2} />
          <FloatingParticle x={15} y={75} size={14} delay={0.8} />
          <FloatingParticle x={30} y={20} size={16} delay={0.4} />
          <FloatingParticle x={55} y={10} size={12} delay={0.6} />
          <FloatingParticle x={70} y={25} size={15} delay={0.3} />
          <FloatingParticle x={85} y={60} size={17} delay={0.7} />
          <FloatingParticle x={90} y={80} size={13} delay={0.1} />
        </div>
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0.9; }
        }
        @keyframes giftFloat {
          0%, 100% { transform: translateX(var(--offset-x, 0)) translateY(var(--offset-y, 0)) scale(var(--scale, 1)); }
          50% { transform: translateX(var(--offset-x, 0)) translateY(calc(var(--offset-y, 0) - 5px)) scale(var(--scale, 1)); }
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