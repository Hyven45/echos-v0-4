import { useState } from "react";
import Album from "./Album";
import { useGroups } from "../../../../contexts/GroupContext";
import { useAlbumSelection } from "../../../../hooks/useAlbumSelection";

interface AlbumPosition {
  top: number;
  left: number;
  rotate: number;
  zindex: number;
}

const RocknRoulette = () => {
  const { albums } = useGroups();

  const {
    selectedAlbum,
    handleAlbumClick,
    handleUnfocus,
    handleRandomSelection,
    getAlbumZIndex,
    isSelected,
    isDimmed,
  } = useAlbumSelection({ albumsLength: albums.length });

  // Generate random positions for each album (memoized to keep positions stable)
  const albumPositions = useState<AlbumPosition[]>(() => {
    return albums.map((album, index) => {
      const maxDeviationX = 20;
      const maxDeviationY = 20;
      const maxRotation = 40;
      const xDeviation = (Math.random() - 0.5) * 2 * maxDeviationX;
      const yDeviation = (Math.random() - 0.5) * 2 * maxDeviationY;
      const randomRotation = Math.random() * maxRotation - maxRotation / 2;

      return {
        top: Math.floor(Math.max(10, Math.min(90, 50 + yDeviation))),
        left: Math.floor(Math.max(10, Math.min(90, 50 + xDeviation))),
        rotate: Math.floor(randomRotation),
        zindex: index,
      };
    });
  });

  return (
    <section
      id="rocknroulette"
      className="rocknroulette min-h-screen py-16 flex flex-col items-center justify-center"
      aria-labelledby="rocknroulette-title"
      onClick={selectedAlbum !== null ? handleUnfocus : undefined}
    >
      <h1
        id="rocknroulette-title"
        className="text-center text-[180px] font-bold title-stroke font-stretch-extra-condensed mb-16 red"
      >
        ROCK'N'ROULETTE
      </h1>

      <div
        className="albums-pile relative h-[60vh] w-full"
        role="region"
        aria-label="Collection d'albums"
      >
        {albums.map((album, index) => {
          const position = albumPositions[0][index];
          const zindex = getAlbumZIndex(index);
          
          return (
            <Album
              key={index}
              src={album.src}
              alt={album.alt}
              name={album.title}
              short_description={album.short_description}
              groupId={album.groupId}
              groupName={album.groupName}
              albumId={album.id}
              position={position}
              zindex={zindex}
              isSelected={isSelected(index)}
              isDimmed={isDimmed(index)}
              onClick={(event) => handleAlbumClick(index, event)}
            />
          );
        })}
      </div>

      <div className="flex justify-center my-16">
        <button
          className="button-red"
          aria-label="Cliquer sur un album pour le voir"
          onClick={handleRandomSelection}
        >
          {selectedAlbum === null ? "Cliquez sur un album" : "Cliquez pour fermer"}
        </button>
      </div>
    </section>
  );
};

export default RocknRoulette; 