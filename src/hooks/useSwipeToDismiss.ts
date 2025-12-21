import { useState, useRef, useCallback } from 'react';

interface SwipeToDismissOptions {
  threshold?: number;
  onDismiss: () => void;
}

interface SwipeState {
  offsetX: number;
  opacity: number;
  isDragging: boolean;
}

export const useSwipeToDismiss = ({ threshold = 150, onDismiss }: SwipeToDismissOptions) => {
  const [state, setState] = useState<SwipeState>({
    offsetX: 0,
    opacity: 1,
    isDragging: false,
  });
  
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleStart = useCallback((clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    isDraggingRef.current = true;
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!isDraggingRef.current) return;
    
    currentXRef.current = clientX;
    const diff = clientX - startXRef.current;
    
    // Calculate opacity based on how far user has swiped
    const absOffset = Math.abs(diff);
    const newOpacity = Math.max(0.3, 1 - (absOffset / (threshold * 1.5)));
    
    setState({
      offsetX: diff,
      opacity: newOpacity,
      isDragging: true,
    });
  }, [threshold]);

  const handleEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    const diff = currentXRef.current - startXRef.current;
    
    if (Math.abs(diff) > threshold) {
      // Trigger dismiss animation
      const direction = diff > 0 ? 1 : -1;
      setState({
        offsetX: direction * window.innerWidth,
        opacity: 0,
        isDragging: false,
      });
      
      // Call onDismiss after animation
      setTimeout(onDismiss, 200);
    } else {
      // Reset position
      setState({
        offsetX: 0,
        opacity: 1,
        isDragging: false,
      });
    }
  }, [threshold, onDismiss]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
    
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX);
    };
    
    const handleMouseUp = () => {
      handleEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleStart, handleMove, handleEnd]);

  const style: React.CSSProperties = {
    transform: `translateX(${state.offsetX}px)`,
    opacity: state.opacity,
    transition: state.isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
    cursor: state.isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
  };

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
    },
    style,
    isDragging: state.isDragging,
  };
};
