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
        floatingElement.style.transform = `translate(-50%, -50%) translateY(${floatY}px) translateX(${floatX}px)`;
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
      className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Floating gift container - centered absolutely */}
      <div 
        ref={floatingRef}
        className="absolute top-1/2 left-1/2"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <img 
          src={giftImage} 
          alt="Gift box" 
          className="drop-shadow-2xl"
          style={{ 
            width: '700px',
            height: 'auto',
            filter: 'drop-shadow(0 15px 25px rgba(0, 0, 0, 0.3))'
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedGiftImage;
