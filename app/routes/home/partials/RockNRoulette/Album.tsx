import { motion } from "framer-motion";
import { Link } from "react-router";

interface AlbumProps {
  src: string;
  alt: string;
  name: string;
  short_description: string;
  groupId?: string;
  groupName?: string;
  albumId?: number;
  position: {
    top: number;
    left: number;
    rotate: number;
  };
  zindex: number;
  isSelected: boolean;
  isDimmed: boolean;
  onClick: (event: React.MouseEvent) => void;
}

const Album = ({
  src,
  alt,
  name,
  short_description,
  groupId,
  groupName,
  albumId,
  position,
  zindex,
  isSelected,
  isDimmed,
  onClick,
}: AlbumProps) => {
  const getAnimationProps = () => {
    if (isSelected) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) rotate(0deg) scale(1.5)",
        filter: "blur(0px) brightness(1.1) saturate(1)",
        boxShadow: "0 2rem 4rem -1rem rgb(0 0 0 / 0.5)",
        zIndex: zindex,
      };
    } else if (isDimmed) {
      return {
        top: `${position.top}%`,
        left: `${position.left}%`,
        transform: `translate(-50%, -50%) rotate(${position.rotate}deg) scale(1)`,
        filter: "blur(2px) brightness(0.7) saturate(0.4)",
        zIndex: zindex,
      };
    } else {
      return {
        top: `${position.top}%`,
        left: `${position.left}%`,
        transform: `translate(-50%, -50%) rotate(${position.rotate}deg) scale(1)`,
        filter: "blur(0px) brightness(1) saturate(1)",
        zIndex: zindex,
      };
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

  const titleVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
    }
  };

  const descriptionVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 0.9,
      y: 0,
    }
  };

  const buttonVariants = {
    hidden: {
      opacity: 0,
      y: 10,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
    }
  };

  return (
    <>
      <motion.div
        className="absolute w-[20rem] h-[20rem] overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300"
        animate={getAnimationProps()}
        transition={{ duration: 0.3, ease: "easeOut" }}
        onClick={onClick}
      >
        <motion.img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-lg shadow-md z-[1]"
        />
        <motion.div 
          className="absolute bottom-0 left-0 right-0 flex flex-col items-start bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pb-4 rounded-b-lg text-white pointer-events-none z-[2]"
          variants={overlayVariants}
          initial="hidden"
          animate={isSelected ? "visible" : "hidden"}
          transition={{ 
            duration: 0.4, 
            ease: "easeOut",
            delay: 0.3
          }}
        >
          <motion.h3 
            className="font-tungsten text-xl font-bold mb-2 uppercase tracking-wider pointer-events-none"
            variants={titleVariants}
            initial="hidden"
            animate={isSelected ? "visible" : "hidden"}
            transition={{ 
              duration: 0.3, 
              ease: "easeOut",
              delay: 0.4
            }}
          >
            {name}
          </motion.h3>
          <motion.p 
            className="text-sm leading-relaxed m-0 pointer-events-none"
            variants={descriptionVariants}
            initial="hidden"
            animate={isSelected ? "visible" : "hidden"}
            transition={{ 
              duration: 0.3, 
              ease: "easeOut",
              delay: 0.5
            }}
          >
            {short_description}
          </motion.p>
          {groupName && (
            <motion.p 
              className="text-xs text-gray-300 mt-1 pointer-events-none"
              variants={descriptionVariants}
              initial="hidden"
              animate={isSelected ? "visible" : "hidden"}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut",
                delay: 0.55
              }}
            >
              par {groupName}
            </motion.p>
          )}
          {groupId && albumId ? (
            <Link
              to={`/artist/${groupId}?album=${albumId}`}
              className="font-tungsten text-base font-bold uppercase tracking-wider bg-white/90 text-black self-end border-none rounded px-6 py-2 mt-4 cursor-pointer transition-colors duration-200 z-[3] hover:bg-red-700 hover:text-white pointer-events-auto no-underline"
            >
              <motion.span
                variants={buttonVariants}
                initial="hidden"
                animate={isSelected ? "visible" : "hidden"}
                transition={{ 
                  duration: 0.3, 
                  ease: "easeOut",
                  delay: 0.6
                }}
              >
                Découvrir
              </motion.span>
            </Link>
          ) : groupId ? (
            <Link
              to={`/artist/${groupId}`}
              className="font-tungsten text-base font-bold uppercase tracking-wider bg-white/90 text-black self-end border-none rounded px-6 py-2 mt-4 cursor-pointer transition-colors duration-200 z-[3] hover:bg-red-700 hover:text-white pointer-events-auto no-underline"
            >
              <motion.span
                variants={buttonVariants}
                initial="hidden"
                animate={isSelected ? "visible" : "hidden"}
                transition={{ 
                  duration: 0.3, 
                  ease: "easeOut",
                  delay: 0.6
                }}
              >
                Découvrir
              </motion.span>
            </Link>
          ) : (
            <motion.button
              className="font-tungsten text-base font-bold uppercase tracking-wider bg-white/90 text-black self-end border-none rounded px-6 py-2 mt-4 cursor-pointer transition-colors duration-200 z-[3] hover:bg-red-700 hover:text-white pointer-events-auto"
              variants={buttonVariants}
              initial="hidden"
              animate={isSelected ? "visible" : "hidden"}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut",
                delay: 0.6
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(event) => {
                event.stopPropagation();
                onClick(event);
              }}
            >
              Découvrir
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </>
  );
};

export default Album;
