import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGroups } from '~/contexts/GroupContext';
import Carousel from './Carousel';

const BranchesMarginales = () => {
  const { albums } = useGroups();

  const filteredAlbums = useMemo(() => 
    albums.filter((album) => Math.random() > 0.5).map((album) => ({
      ...album,
      zindex: Math.random()
    })), 
    [albums]
  );

  return (
    <section 
      id="branches-marginales" 
      className="branches-marginales min-h-[100vh] py-16 mask-[url('/assets/images/poke_1.png')] mask-contain bg-contain bg-[#B5252A] text-white overflow-hidden" 
      aria-labelledby="branches-title"
    >
      <div className="container mx-auto px-4">
        <motion.h1
          id="branches-title"
          className="text-center text-[130px] font-bold title-stroke font-stretch-extra-condensed mb-8 mt-32 black"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          BRANCHES<br />MARGINALES
        </motion.h1>

        <Carousel 
          albums={filteredAlbums}
          itemsPerView={3}
          autoScrollInterval={4000}
              />
      </div>
    </section>
  );
};

export default BranchesMarginales; 