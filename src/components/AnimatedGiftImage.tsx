import { useEffect, useRef, useState } from 'react';
import giftImage from '@/assets/gift.png';

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
      {/* Floating container */}
      <div 
        ref={floatingRef}
        className="relative flex items-center justify-center w-full h-full"
      >
        <img 
          src={giftImage} 
          alt="Gift box" 
          className="object-contain drop-shadow-2xl"
          style={{ 
            width: '300px',
            height: 'auto',
            filter: 'drop-shadow(0 15px 25px rgba(0, 0, 0, 0.3))'
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedGiftImage;
