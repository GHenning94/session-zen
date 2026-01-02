import { useEffect, useRef, useState } from 'react';
import giftImage from '@/assets/gift.png';

const AnimatedGiftImage = () => {
  const floatingRef = useRef<HTMLImageElement>(null);
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
      className={`w-full h-full flex items-center justify-center transition-opacity duration-1000 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <img 
        ref={floatingRef}
        src={giftImage} 
        alt="Gift box" 
        className="drop-shadow-2xl max-w-none"
        style={{ 
          width: '500px',
          height: 'auto',
          filter: 'drop-shadow(0 15px 25px rgba(0, 0, 0, 0.3))'
        }}
      />
    </div>
  );
};

export default AnimatedGiftImage;
