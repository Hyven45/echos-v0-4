import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import groupsData from "../data/groups.json";

export interface Album {
  id: number; 
  title: string;
  src: string;
  alt: string;
  description: string;
  short_description: string;
  groupId?: string;
  groupName?: string;
}

export interface Group {
  id: string;
  name: string;
  genre: string;
  origin: string;
  albums: Album[];
  description: string;
  short_description: string;
}

interface GroupContextValue {
  groups: Group[];
  albums: Album[];
}

const GroupContext = createContext<GroupContextValue | undefined>(undefined);

interface GroupProviderProps {
  children: ReactNode;
}

export const GroupProvider = ({ children }: GroupProviderProps) => {
  const groups = useMemo(() => 
    groupsData.map((group) => ({ 
      ...group, 
    })), 
    []
  );

  const albums = useMemo(() => 
    groups.flatMap((group) => 
      group.albums.map(album => ({
        ...album,
        groupId: group.id,
        groupName: group.name
      }))
    ),
    [groups]
  );

  const value = useMemo(() => ({
    groups,
    albums,
  }), [groups, albums]);

  return (
    <GroupContext.Provider value={value}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroups = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useAlbums must be used within an AlbumProvider');
  }
  return context;
}; 