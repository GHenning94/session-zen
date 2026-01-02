import { useEffect, useRef, useState } from 'react';
import giftSvg from '@/assets/gift.svg';

const AnimatedGiftImage = () => {
  const floatingRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <div 
      className={`relative flex items-center justify-center transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'
      }`}
      style={{ width: '100%', maxWidth: '750px', height: 'auto' }}
    >
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

      {/* Floating container */}
      <div 
        ref={floatingRef}
        className="relative w-full"
      >
        <img 
          src={giftSvg} 
          alt="Gift boxes" 
          className="w-full h-auto"
        />
      </div>

      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
};

export default AnimatedGiftImage;
