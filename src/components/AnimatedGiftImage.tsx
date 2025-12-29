import { useEffect, useRef, useState, useMemo } from 'react';
import referralGiftsImage from '@/assets/referral-gifts-transparent.png';

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
      angle += 0.012;
      const floatY = Math.sin(angle) * 6;
      const floatX = Math.cos(angle * 0.7) * 3;
      
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
      style={{ width: '400px', height: '280px' }}
    >
      {/* Floating Particles */}
      {particles.map(renderParticle)}

      {/* Sparkles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${4 + Math.random() * 4}px`,
            height: `${4 + Math.random() * 4}px`,
            left: `${5 + (i * 8)}%`,
            top: `${10 + Math.sin(i * 1.2) * 30}%`,
            background: i % 2 === 0 ? 'hsl(221, 83%, 53%)' : 'hsl(221, 83%, 65%)',
            animation: `sparkle ${2 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
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
        <div ref={floatingRef}>
          {/* Gift Image */}
          <img 
            src={referralGiftsImage} 
            alt="Presentes e recompensas do programa de indicação"
            className="w-80 h-auto object-contain drop-shadow-2xl"
            style={{
              filter: 'drop-shadow(0 25px 50px hsla(221, 83%, 53%, 0.4))',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0.9; }
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
