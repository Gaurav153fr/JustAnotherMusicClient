import type { Album, Artist, Playlist, SearchResults, Track } from "../../datasource/types";

export interface Tab {
  id: string;
  title?: string;
  view: "home" | "album" | "artist" | "playlist" | "search" | "settings";
  album?: Album;
  artist?: Artist;
  playlist?: Playlist;
  searchQuery?: string;
  searchResults?: Track[];
  mixedSearchResults?: SearchResults;
  searchLoading?: boolean;
  isQueueOpen?: boolean;
}
