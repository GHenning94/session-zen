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
      className={`relative flex items-center justify-center transition-all duration-1000 ease-out w-full h-full ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90'
      }`}
    >
      {/* Sparkles - distributed around the image */}
      {[...Array(16)].map((_, i) => {
        const size = 4 + Math.random() * 5;
        const opacity = 0.5 + Math.random() * 0.4;
        const angle = (i / 16) * Math.PI * 2;
        const radius = 35 + Math.random() * 15;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${50 + Math.cos(angle) * radius}%`,
              top: `${50 + Math.sin(angle) * radius}%`,
              background: i % 3 === 0 
                ? 'hsl(221, 83%, 53%)' 
                : i % 3 === 1 
                  ? 'hsl(221, 83%, 65%)' 
                  : 'hsl(210, 100%, 70%)',
              opacity,
              animation: `sparkle ${1.8 + (i % 5) * 0.4}s ease-in-out infinite`,
              animationDelay: `${(i % 8) * 0.2}s`,
              boxShadow: `0 0 ${size * 2}px ${size / 2}px hsla(221, 83%, 53%, ${opacity * 0.8})`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}

      {/* Floating container */}
      <div 
        ref={floatingRef}
        className="relative flex items-center justify-center w-full h-full"
      >
        <img 
          src={giftSvg} 
          alt="Gift boxes" 
          className="object-contain drop-shadow-2xl"
          style={{ 
            width: '300px',
            height: 'auto',
            minHeight: '180px',
            filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.4))'
          }}
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
