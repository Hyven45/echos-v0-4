import { useState, useEffect } from 'react';

/**
 * Custom hook for handling scroll effects
 * @param {number} threshold - Scroll threshold in pixels
 * @returns {boolean} - Whether the scroll threshold has been reached
 */
export const useScrollEffect = (threshold = 50) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isScrolled;
}; 