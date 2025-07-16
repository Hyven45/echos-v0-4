import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import carouselItems from '../../../data/carousel-items.json';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';

interface CarouselItem {
  id: number;
  title: string;
  description: string;
  image: string;
  link: string;
  buttonText: string;
}

export default function FullScreenCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  const items: CarouselItem[] = carouselItems;

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

  const changeSlide = useCallback((newIndex: number) => {
    if (newIndex !== currentSlide) {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentSlide(newIndex);
        setIsVisible(true);
      }, 300);
    }
  }, [currentSlide]);

  const goToNext = useCallback(() => {
    changeSlide((currentSlide + 1) % items.length);
  }, [currentSlide, items.length, changeSlide]);

  const goToPrevious = useCallback(() => {
    changeSlide((currentSlide - 1 + items.length) % items.length);
  }, [currentSlide, items.length, changeSlide]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Keyboard navigation
  useKeyboardNavigation({
    onNext: goToNext,
    onPrevious: goToPrevious,
    onTogglePause: togglePause
  });

  // Auto-play
  useEffect(() => {
    if (isPaused) return;

    // const interval = setInterval(() => {
    //   goToNext();
    // }, 5000);

    // return () => clearInterval(interval);
  }, [goToNext, isPaused]);

  const currentItem = items[currentSlide];

  const handleSlideClick = useCallback(() => {
    navigate(currentItem.link, { replace: true });
  }, [navigate, currentItem.link]);

  return (
    <section className="relative h-[80vh] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={currentItem.image}
          alt={currentItem.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center">
        <div 
          className={`flex flex-col justify-end px-4 max-w-6xl transition-all duration-300 cursor-pointer ${
            isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'
          }`}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onClick={handleSlideClick}
        >
          <h1 className='font-bold text-[10rem] text-white p-0 m-0 leading-10'>
            {currentItem.title}
          </h1>
          <p className="font-medium text-8xl text-white leading-relaxed max-w-4xl ml-auto p-0 mb-12">
            {currentItem.description}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSlideClick();
            }}
            className={`button-white self-center inline-block transform hover:scale-105 transition-all duration-300 ease-out`}
          >
            {currentItem.buttonText}
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          goToPrevious();
        }}
        className="absolute cursor-pointer left-4 md:left-8 top-1/2 transform -translate-y-1/2 font-hitmepunk text-6xl md:text-8xl text-white disabled:opacity-50 disabled:cursor-not-allowed z-20 transition-all"
        aria-label="Précédent"
        variants={buttonVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
      >
        {"<"}
      </motion.button>

      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          goToNext();
        }}
        className="absolute cursor-pointer right-4 md:right-8 top-1/2 transform -translate-y-1/2 font-hitmepunk text-6xl md:text-8xl text-white disabled:opacity-50 disabled:cursor-not-allowed z-20 transition-all"
        aria-label="Suivant"
        variants={buttonVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        whileTap="tap"
      >
        {">"}
      </motion.button>

      {/* Dots Navigation */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {items.map((_, index) => (
          <motion.button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              changeSlide(index);
            }}
            className="w-3 h-3 rounded-full focus:outline-none focus:ring-2 focus:ring-white cursor-pointer"
            aria-label={`Aller au slide ${index + 1}`}
            variants={indicatorVariants}
            initial="inactive"
            animate={index === currentSlide ? "active" : "inactive"}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          />
        ))}
      </motion.div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-white bg-opacity-20 z-20">
        <div 
          className="h-full bg-[#B5252A] transition-all duration-300 ease-linear"
          style={{ 
            width: `${((currentSlide + 1) / items.length) * 100}%` 
          }}
        />
      </div>

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute top-4 right-4 z-20 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm font-sourcesans3">
          Pause
        </div>
      )}
    </section>
  );
}
