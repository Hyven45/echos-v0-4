import { useRef, useEffect, useState } from "react";
import { useSearch } from "../hooks/useSearch";
import type { SearchResult } from "../hooks/useSearch";

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchBar = ({ isOpen, onClose }: SearchBarProps) => {
  const { searchQuery, setSearchQuery, searchResults, clearSearch } = useSearch();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    }

    if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleResultClick(searchResults[selectedIndex]);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    
    if (result.type === "artist") {
        window.location.href = `/artist/${result.id}`;
    } else {
        window.location.href = `/artist/${result.artist}?album=${result.id}`;
    }
    
    clearSearch();
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[100] flex items-start justify-center pt-32"
      onClick={handleOverlayClick}
    >
      <div className="bg-black/80 rounded-md w-full max-w-3xl mx-5 shadow-3xl">
        <div className="p-6">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher un artiste ou un album..."
              className="w-full bg-black/80 text-white text-3xl px-5 py-6 rounded-xs border border-white/10 focus:border-white focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div 
              ref={resultsRef}
              className="mt-4 max-h-96 overflow-y-auto border border-white/10 rounded-xs"
            >
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  className={`p-4 cursor-pointer border-b border-gray-700 last:border-b-0 hover:bg-white/15 transition-colors ${
                    index === selectedIndex ? "bg-white/20" : "bg-white/10"
                  }`}
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{result.name}</div>
                      <div className="text-white/20 text-lg">
                        {result.type === "artist" ? (
                          <span>Artiste • {result.genre}</span>
                        ) : (
                          <span>Album • {result.artist}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-500 text-xs uppercase font-medium">
                      {result.type === "artist" ? "ARTISTE" : "ALBUM"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="mt-4 p-4 text-center text-white/40">
              Aucun résultat trouvé pour "{searchQuery}"
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-4 text-sm text-white/40">
          <div className="flex items-center justify-between">
            <span>Utilisez ↑↓ pour naviguer, ↵ pour sélectionner</span>
            <span>ESC pour fermer</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
