import { useEffect } from 'react';

interface UseKeyboardNavigationProps {
  onNext: () => void;
  onPrevious: () => void;
  onTogglePause: () => void;
}

export const useKeyboardNavigation = ({ 
  onNext, 
  onPrevious, 
  onTogglePause 
}: UseKeyboardNavigationProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNext();
          break;
        case ' ':
          event.preventDefault();
          onTogglePause();
          break;
        case 'Escape':
          // Could be used to exit fullscreen or stop autoplay permanently
          event.preventDefault();
          onTogglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onTogglePause]);
};
