import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
import type { Album as AlbumObject } from '~/contexts/GroupContext';

type Album = AlbumObject & { 
  zindex: number;
}

interface AlbumCardProps {
  album: Album;
  index: number;
  totalAlbums: number;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, index, totalAlbums }) => {
  const [isHovered, setIsHovered] = useState(false);

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 50,
      scale: 0.8 
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    hover: {
      scale: 1.05,
      y: -10
    }
  };

  const overlayVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
    }
  };

  const textVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
    }
  };

  return (
    <motion.article 
      className="carousel-card flex-shrink-0 px-4"
      style={{ width: `${100 / totalAlbums}%` }}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      transition={{
        delay: 0,
        duration: 0.6,
        ease: "easeOut"
      }}
    >
      <div 
        className="relative group cursor-pointer overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {album.groupId ? (
          <Link to={`/artist/${album.groupId}?album=${album.id}`}>
            <motion.img 
              src={album.src}
              alt={album.alt}
              className="w-full h-80 object-cover rounded-lg shadow-2xl transition-transform duration-300 hover:scale-105"
              loading="lazy"
              layoutId={`album-${album.id}`}
            />
          </Link>
        ) : (
          <motion.img 
            src={album.src}
            alt={album.alt}
            className="w-full h-80 object-cover rounded-lg shadow-2xl"
            loading="lazy"
            layoutId={`album-${album.id}`}
          />
        )}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 flex flex-col items-start bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pb-4 rounded-b-lg text-white pointer-events-none z-[2]"
          variants={overlayVariants}
          initial="hidden"
          animate={isHovered ? "visible" : "hidden"}
          transition={{ 
            duration: 0.4, 
            ease: "easeOut",
            delay: 0.1
          }}
        >
          <motion.h3 
            className="font-tungsten text-xl font-bold mb-2 uppercase tracking-wider"
            variants={textVariants}
            initial="hidden"
            animate={isHovered ? "visible" : "hidden"}
            transition={{ 
              duration: 0.3, 
              ease: "easeOut",
              delay: 0.2
            }}
          >
            {album.title}
          </motion.h3>
          {album.groupName && (
            <motion.p 
              className="text-xs text-gray-300 mb-1 opacity-80"
              variants={textVariants}
              initial="hidden"
              animate={isHovered ? "visible" : "hidden"}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut",
                delay: 0.25
              }}
            >
              par {album.groupName}
            </motion.p>
          )}
          <motion.p 
            className="text-sm leading-relaxed m-0 opacity-90"
            variants={textVariants}
            initial="hidden"
            animate={isHovered ? "visible" : "hidden"}
            transition={{ 
              duration: 0.3, 
              ease: "easeOut",
              delay: 0.3
            }}
          >
            {album.short_description}
          </motion.p>
        </motion.div>
      </div>
    </motion.article>
  );
};

export default AlbumCard; 