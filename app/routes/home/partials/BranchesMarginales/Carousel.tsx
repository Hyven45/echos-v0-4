import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Album as AlbumObject } from '~/contexts/GroupContext';
import AlbumCard from './AlbumCard';

type Album = AlbumObject & { 
  zindex: number;
}

interface CarouselProps {
  albums: Album[];
  itemsPerView?: number;
  autoScrollInterval?: number;
}

const Carousel: React.FC<CarouselProps> = ({ 
  albums, 
  itemsPerView = 3, 
  autoScrollInterval = 4000 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxIndex = Math.max(0, albums.length - itemsPerView);

  const updateCarousel = useCallback((index: number) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setCurrentIndex(index);
    
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  }, [isTransitioning]);

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
    updateCarousel(nextIndex);
  }, [currentIndex, maxIndex, updateCarousel]);

  const handlePrev = useCallback(() => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
    updateCarousel(prevIndex);
  }, [currentIndex, maxIndex, updateCarousel]);

  const handleIndicatorClick = useCallback((index: number) => {
    updateCarousel(index);
  }, [updateCarousel]);

  // Auto-scroll functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTransitioning) {
        handleNext();
      }
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [handleNext, isTransitioning, autoScrollInterval]);

  // Animation variants
  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3 }
    },
    hover: { 
      scale: 1.1,
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.95 }
  };

  const indicatorVariants = {
    inactive: { 
      scale: 1,
      opacity: 0.6,
      backgroundColor: "#9CA3AF"
    },
    active: { 
      scale: 1.2,
      opacity: 1,
      backgroundColor: "#FFFFFF"
    }
  };

  return (
    <div className="relative max-w-6xl mx-auto">
      {/* Carousel Container */}
      <div 
        className="carousel-container relative overflow-x-hidden"
        role="region" 
        aria-label="Carrousel d'albums"
        aria-live="polite"
      >
        <motion.div 
          ref={containerRef}
          className="flex py-16"
          animate={{ 
            x: `-${currentIndex * (100 / albums.length)}%`
          }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 30
          }}
          style={{ 
            width: `${(albums.length / itemsPerView) * 100}%`
          }}
        >
          {albums.map((album, index) => (
            <AlbumCard
              key={album.id}
              album={album}
              index={index}
              totalAlbums={albums.length}
            />
          ))}
        </motion.div>
      </div>

      {/* Navigation Arrows */}
      <motion.button 
        className="absolute cursor-pointer left-[-10rem] top-1/2 transform -translate-y-1/2 font-hitmepunk text-[10rem] text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed z-10"
        type="button"
        onClick={handlePrev}
        disabled={isTransitioning}
        aria-label="Album précédent"
        variants={buttonVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
      >
        {"<"}
      </motion.button>

      <motion.button 
        className="absolute cursor-pointer right-[-10rem] top-1/2 transform -translate-y-1/2 font-hitmepunk text-[10rem] text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed z-10"
        type="button"
        onClick={handleNext}
        disabled={isTransitioning}
        aria-label="Album suivant"
        variants={buttonVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
      >
        {">"}
      </motion.button>

      {/* Carousel Indicators */}
      <motion.div 
        className="flex justify-center mt-8 space-x-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {Array.from({ length: maxIndex + 1 }).map((_, index) => (
          <motion.button
            key={index}
            className="w-3 h-3 rounded-full focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            onClick={() => handleIndicatorClick(index)}
            aria-label={`Aller à la diapositive ${index + 1}`}
            disabled={isTransitioning}
            variants={indicatorVariants}
            initial="inactive"
            animate={index === currentIndex ? "active" : "inactive"}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default Carousel; 