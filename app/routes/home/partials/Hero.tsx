import { motion, scale } from "framer-motion";

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 50, transition: { duration: 0.5 } },
  };

  return (
    <header className="h-screen relative">
      <div className="w-full h-full mask-no-repeat mask-bottom mask-cover mask-[url(/assets/images/poke_1.png)]">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover fixed"
          aria-hidden="true"
        >
          <source src="/assets/medias/wallofdeath.mp4" type="video/mp4" />
          <p>Votre navigateur ne supporte pas la lecture de vidéos.</p>
        </video>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-[95%] -translate-y-1/2 text-white text-left text-[12.5rem]">
          <motion.h1
            className="font-tungsten font-bold leading-none"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {"PAS DE REGLES, JUSTE DU ROCK.".split("").map((char, index) => (
              <motion.span
                key={index}
                variants={letterVariants}
                className={(char === "," || char === "." ? "text-[#B5252A]" : "")}
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>
        </div>
      </div>
    </header>
  );
}

// Add the variants for the container and letters
