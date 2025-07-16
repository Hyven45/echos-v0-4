import { useState, useCallback } from "react";

interface UseAlbumSelectionProps {
  albumsLength: number;
}

interface UseAlbumSelectionReturn {
  selectedAlbum: number | null;
  selectionHistory: Set<number>;
  handleAlbumClick: (index: number, event: React.MouseEvent) => void;
  handleUnfocus: () => void;
  handleRandomSelection: () => void;
  getAlbumZIndex: (index: number) => number;
  isSelected: (index: number) => boolean;
  isDimmed: (index: number) => boolean;
}

export const useAlbumSelection = ({
  albumsLength,
}: UseAlbumSelectionProps): UseAlbumSelectionReturn => {
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [selectionHistory, setSelectionHistory] = useState<Set<number>>(new Set());

  const handleAlbumClick = useCallback((index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (selectedAlbum === index) {
      setSelectedAlbum(null);
    } else {
      setSelectedAlbum(index);
      setSelectionHistory(prev => new Set([...prev, index]));
    }
  }, [selectedAlbum]);

  const handleUnfocus = useCallback(() => {
    setSelectedAlbum(null);
  }, []);

  const handleRandomSelection = useCallback(() => {
    if (selectedAlbum === null) {
      const randomIndex = Math.floor(Math.random() * albumsLength);
      setSelectedAlbum(randomIndex);
      setSelectionHistory(prev => new Set([...prev, randomIndex]));
    } else {
      setSelectedAlbum(null);
    }
  }, [selectedAlbum, albumsLength]);

  const getAlbumZIndex = useCallback((index: number) => {
    const baseZIndex = albumsLength;
    
    if (selectedAlbum === index) {
      return baseZIndex + selectionHistory.size + 100;
    } else if (selectionHistory.has(index)) {
      const historyArray = Array.from(selectionHistory);
      const selectionOrder = historyArray.indexOf(index);
      return baseZIndex + selectionOrder + 50;
    } else {
      return index;
    }
  }, [selectedAlbum, selectionHistory, albumsLength]);

  const isSelected = useCallback((index: number) => {
    return selectedAlbum === index;
  }, [selectedAlbum]);

  const isDimmed = useCallback((index: number) => {
    return selectedAlbum !== null && selectedAlbum !== index;
  }, [selectedAlbum]);

  return {
    selectedAlbum,
    selectionHistory,
    handleAlbumClick,
    handleUnfocus,
    handleRandomSelection,
    getAlbumZIndex,
    isSelected,
    isDimmed,
  };
}; 