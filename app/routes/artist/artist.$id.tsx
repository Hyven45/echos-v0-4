import { useParams, Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import type * as Route from "../+types/artist.$id";
import Navigation from "~/components/Navigation";
import { GroupProvider } from "~/contexts/GroupContext";
import groupsData from "~/data/groups.json";

interface Group {
  id: string;
  name: string;
  genre: string;
  origin: string;
  description: string;
  short_description: string;
  albums: Album[];
}

interface Album {
  id: number;
  title: string;
  src: string;
  alt: string;
  description: string;
  short_description: string;
}

export function meta({ params }: Route.MetaArgs) {
  const group = groupsData.find((g) => g.id === params.id);

  return [
    { title: group ? `${group.name} - ECHOS` : "Artiste - ECHOS" },
    {
      name: "description",
      content: group ? group.short_description : "Page artiste sur ECHOS",
    },
  ];
}

export default function Artist() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const albumId = searchParams.get("album");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const group = groupsData.find((g) => g.id === id) as Group | undefined;
  const selectedAlbum = albumId
    ? group?.albums.find((album) => album.id.toString() === albumId)
    : group?.albums[0];
  const otherAlbums = group?.albums.filter((album) =>
    albumId ? album.id.toString() !== albumId : album.id !== group.albums[0]?.id
  );

  if (!group) {
    return (
      <>
        <Navigation isScrolled={isScrolled} />
        <div className="min-h-screen text-white flex items-center justify-center mt-32">
          <div className="text-center">
            <h1 className="text-8xl font-bold mb-8">Artiste non trouvé</h1>
            <p className="text-gray-400 mb-12 text-2xl">
              L'artiste que vous recherchez n'existe pas.
            </p>
            <Link
              to="/"
              className="bg-white text-black text-2xl px-6 py-3 rounded-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation isScrolled={isScrolled} />
      <div className="min-h-screen container flex flex-col gap-16 m-auto text-white mt-32 py-16">
        {/* Hero Section */}
        <div className="relative flex items-center justify-start">
          <div className="text-left">
            <h1 className="text-9xl font-bold mb-4 title-stroke red">
              {group.name}
            </h1>
            <p className="text-white/70 text-3xl mb-4">
              Genre: {group.genre} | Origine: {group.origin}
            </p>
            <p className="text-4xl">{group.description}</p>
          </div>
        </div>
        {selectedAlbum && (
          <div>
            <h2 className="text-6xl font-bold mb-4 title-stroke red">Album</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <img
                src={selectedAlbum.src}
                alt={selectedAlbum.alt}
                className="size-[35rem] rounded-xs object-cover"
              />
              <div>
                <h2 className="text-8xl font-bold mb-4">
                  {selectedAlbum.title}
                </h2>
                <p className="text-4xl mb-6">{selectedAlbum.description}</p>
                <p className="text-white/70 text-3xl">
                  Genre: {group.genre} | Origine: {group.origin}
                </p>
              </div>
            </div>
          </div>
        )}

        {otherAlbums && otherAlbums.length > 0 && (
          <div>
            <h2 className="text-6xl font-bold mb-8 title-stroke red">
              {albumId ? "Autres albums" : "Autres albums"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {otherAlbums.map((album) => (
                <Link
                  key={album.id}
                  to={`/artist/${group.id}?album=${album.id}`}
                  className="bg-white/10 rounded-xs overflow-hidden hover:transform hover:scale-105 transition-all duration-300 no-underline"
                >
                  <img
                    src={album.src}
                    alt={album.alt}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-4xl font-bold mb-3 text-white">
                      {album.title}
                    </h3>
                    <p className="text-white/80 text-xl mb-4">
                      {album.short_description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <Link to="/" className="button-red inline-flex items-center gap-2">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </>
  );
}
