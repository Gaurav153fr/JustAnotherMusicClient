import {
  createContext,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { IconBookmark, IconBookmarkOff, IconLoader2 } from "@tabler/icons-react";
import type { Album, Playlist } from "../../datasource/types";
import type { LibraryController } from "../../player/LibraryController";
import styles from "./PlaylistContextMenu.module.css";

interface PlaylistContextMenuValue {
  openPlaylistMenu: (event: ReactMouseEvent, playlist: Playlist) => void;
  openAlbumMenu: (event: ReactMouseEvent, album: Album) => void;
}

const PlaylistContext = createContext<PlaylistContextMenuValue | null>(null);

export function usePlaylistContextMenu(): PlaylistContextMenuValue {
  const value = useContext(PlaylistContext);
  if (!value) {
    throw new Error("usePlaylistContextMenu must be used within PlaylistContextMenuProvider.");
  }
  return value;
}

export function PlaylistContextMenuProvider({
  children,
  libraryController,
}: {
  children: ReactNode;
  libraryController: LibraryController;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    window.addEventListener("mousedown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("blur", close);
    };
  }, [position]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  const openPlaylistMenu = (event: ReactMouseEvent, selected: Playlist) => {
    event.preventDefault();
    event.stopPropagation();
    setPlaylist(selected);
    setAlbum(null);
    setPosition({ x: event.clientX, y: event.clientY });
  };

  const openAlbumMenu = (event: ReactMouseEvent, selected: Album) => {
    event.preventDefault();
    event.stopPropagation();
    setAlbum(selected);
    setPlaylist(null);
    setPosition({ x: event.clientX, y: event.clientY });
  };

  const toggleSaved = async () => {
    if (!playlist || isSaving) return;
    const saved = libraryController.isPlaylistSaved(playlist.id);
    setPosition(null);
    setIsSaving(true);
    setToast(saved ? "Removing playlist..." : "Saving playlist...");
    try {
      await libraryController.setPlaylistSaved(playlist, !saved);
      showToast(saved ? "Removed from library" : "Saved to library");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update this playlist.");
    } finally {
      setIsSaving(false);
    }
  };

  const isSaved = playlist
    ? libraryController.isPlaylistSaved(playlist.id)
    : album
      ? libraryController.isAlbumSaved(album.id)
      : false;

  const toggleAlbumSaved = async () => {
    if (!album || isSaving) return;
    const saved = libraryController.isAlbumSaved(album.id);
    setPosition(null);
    setIsSaving(true);
    setToast(saved ? "Removing album..." : "Saving album...");
    try {
      await libraryController.setAlbumSaved(album, !saved);
      showToast(saved ? "Removed from library" : "Saved to library");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to update this album.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PlaylistContext.Provider value={{ openPlaylistMenu, openAlbumMenu }}>
      {children}
      {position && (playlist || album) && (
        <div
          ref={menuRef}
          className={styles.menu}
          style={{ left: position.x, top: position.y }}
          role="menu"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void (playlist ? toggleSaved() : toggleAlbumSaved())}
          >
            {isSaved ? <IconBookmarkOff size={18} /> : <IconBookmark size={18} />}
            <span>{isSaved ? "Remove from library" : "Save to library"}</span>
          </button>
        </div>
      )}
      {toast && (
        <div className={styles.toast} role="status">
          {isSaving && <IconLoader2 className={styles.loading} size={18} />}
          <span>{toast}</span>
        </div>
      )}
    </PlaylistContext.Provider>
  );
}
