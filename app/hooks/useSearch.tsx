import { useState, useMemo, useCallback } from "react";
import { useGroups } from "../contexts/GroupContext";
import type { Group, Album } from "../contexts/GroupContext";

export interface SearchResult {
  type: "artist" | "album";
  id: number | string;
  name: string;
  artist?: string; // For albums, the artist name
  genre?: string; // For artists
  data: Group | Album;
}

interface UseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  clearSearch: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const [searchQuery, setSearchQuery] = useState("");
  const { groups, albums } = useGroups();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search in artists (groups)
    groups.forEach((group) => {
      if (group.name.toLowerCase().includes(query)) {
        results.push({
          type: "artist",
          id: group.id,
          name: group.name,
          genre: group.genre,
          data: group,
        });
      }
    });

    // Search in albums
    groups.forEach((group) => {
      group.albums.forEach((album) => {
        if (album.title.toLowerCase().includes(query)) {
          results.push({
            type: "album",
            id: album.id,
            name: album.title,
            artist: group.id,
            data: album,
          });
        }
      });
    });

    // Sort results: exact matches first, then partial matches
    return results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === query;
      const bExact = b.name.toLowerCase() === query;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Sort by type (artists first, then albums)
      if (a.type !== b.type) {
        return a.type === "artist" ? -1 : 1;
      }
      
      return a.name.localeCompare(b.name);
    });
  }, [searchQuery, groups]);

  const isSearching = searchQuery.trim().length > 0;

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    clearSearch,
  };
};
