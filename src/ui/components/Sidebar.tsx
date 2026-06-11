import { useState, useRef, useEffect, useMemo } from "react";
import {
  IconDisc,
  IconPlaylist,
} from "@tabler/icons-react";
import type { Album, Playlist } from "../../datasource/types";
import { libraryController, useLibraryState } from "../../player/playerStore";
import {
  getRecentPlaylistTimestamp,
  subscribeToRecentPlaylists,
} from "../../player/recentPlaylists";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  width: number;
  onWidthChange: (width: number) => void;
  onNavigateAlbum: (album: Album) => void;
  onNavigatePlaylist: (playlist: Playlist) => void;
}

const MIN_WIDTH = 85;
const MAX_WIDTH = 300;
const COLLAPSED_WIDTH = 150;
const TEXT_HIDE_THRESHOLD = 120;

type LibraryView = "albums" | "playlists";

function SidebarAlbumArtwork({ album }: { album: Album }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [album.artworkUrl]);

  if (!album.artworkUrl || failed) {
    return (
      <div className={`${styles.albumPreview} ${styles.albumPreviewFallback}`}>
        <IconDisc size={24} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      className={styles.albumPreview}
      src={album.artworkUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function SidebarPlaylistArtwork({ playlist }: { playlist: Playlist }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [playlist.artworkUrl]);

  if (!playlist.artworkUrl || failed) {
    return (
      <div className={`${styles.albumPreview} ${styles.albumPreviewFallback}`}>
        <IconPlaylist size={24} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      className={styles.albumPreview}
      src={playlist.artworkUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function Sidebar({
  width,
  onWidthChange,
  onNavigateAlbum,
  onNavigatePlaylist,
}: SidebarProps) {
  const libraryState = useLibraryState();
  const [libraryView, setLibraryView] = useState<LibraryView>("playlists");
  const [recentPlaylistsRevision, setRecentPlaylistsRevision] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const dragStartX = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragStartX.current = e.clientX;
    setIsDragging(true);
  };

  const isCollapsed = width <= COLLAPSED_WIDTH;
  const shouldHideText = width <= TEXT_HIDE_THRESHOLD;
  const playlists = useMemo(() => {
    const libraryPlaylists = libraryState.library?.playlists ?? [];
    return libraryPlaylists
      .map((playlist, libraryIndex) => ({
        playlist,
        libraryIndex,
        playedAt: getRecentPlaylistTimestamp(playlist.id),
      }))
      .sort((left, right) =>
        right.playedAt - left.playedAt || left.libraryIndex - right.libraryIndex
      )
      .map(({ playlist }) => playlist);
  }, [libraryState.library?.playlists, recentPlaylistsRevision]);

  useEffect(
    () => subscribeToRecentPlaylists(
      () => setRecentPlaylistsRevision((revision) => revision + 1),
    ),
    [],
  );
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (dragStartX.current === null || !sidebarRef.current) return;

    const moved = Math.abs(e.clientX - dragStartX.current);

    if (moved < 4) return;

    const rect = sidebarRef.current.getBoundingClientRect();
    const newWidth = e.clientX - rect.left;

    onWidthChange(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth)));
  };

  const handleMouseUp = () => {
    dragStartX.current = null;
    setIsDragging(false);
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  return () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}, [onWidthChange]);
  return (
    <div 
      ref={sidebarRef}
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}
      style={{ width: `${width}px` }}
    >
      <div 
        className={`${styles.dragHandle} ${isDragging ? styles.dragHandleActive : ""}`}
        onMouseDown={handleMouseDown}
        title="Drag to resize sidebar"
      />

      <div className={styles.albumsSection}>
        <div className={`${styles.libraryToggle} ${shouldHideText ? styles.compactToggle : ""}`} role="group" aria-label="Library view">
          <button
            type="button"
            className={`${styles.toggleButton} ${libraryView === "playlists" ? styles.activeToggle : ""}`}
            aria-pressed={libraryView === "playlists"}
            title="User playlists"
            onClick={() => setLibraryView("playlists")}
          >
            <IconPlaylist size={17} aria-hidden="true" />
            {!shouldHideText && <span>Playlists</span>}
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${libraryView === "albums" ? styles.activeToggle : ""}`}
            aria-pressed={libraryView === "albums"}
            title="Albums"
            onClick={() => setLibraryView("albums")}
          >
            <IconDisc size={17} aria-hidden="true" />
            {!shouldHideText && <span>Albums</span>}
          </button>
        </div>
        <div className={styles.albumList}>
          {libraryView === "albums" ? (
            libraryState.library?.albums.map((album) => (
              <button
                type="button"
                key={album.id}
                className={`${styles.albumItem} ${shouldHideText ? styles.centered : ""}`}
                onClick={() => onNavigateAlbum(album)}
                title={shouldHideText ? `${album.title} by ${album.artist}` : undefined}
              >
                <SidebarAlbumArtwork album={album} />
                {!shouldHideText && (
                  <div className={styles.albumText}>
                    <span className={styles.albumTitle}>{album.title}</span>
                    <span className={styles.albumArtist}>{album.artist}</span>
                  </div>
                )}
              </button>
            ))
          ) : (
            playlists.length ? (
              playlists.map((playlist) => (
                <button
                  type="button"
                  key={playlist.id}
                  className={`${styles.albumItem} ${shouldHideText ? styles.centered : ""}`}
                  onClick={() => onNavigatePlaylist(playlist)}
                  title={shouldHideText ? `${playlist.title} by ${playlist.owner}` : undefined}
                >
                  <SidebarPlaylistArtwork playlist={playlist} />
                  {!shouldHideText && (
                    <div className={styles.albumText}>
                      <span className={styles.albumTitle}>{playlist.title}</span>
                      <span className={styles.albumArtist}>{playlist.owner}</span>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className={styles.emptyLibraryView}>
                <IconPlaylist size={28} aria-hidden="true" />
                {!shouldHideText && (
                  <span>
                    {libraryState.status === "signed-out"
                      ? "Sign in to see your playlists."
                      : "No user-created playlists were found."}
                  </span>
                )}
                {libraryState.status === "signed-out" && (
                  <button
                    type="button"
                    className={styles.librarySignInButton}
                    onClick={() => void libraryController.signIn()}
                    title="Sign in to YouTube Music"
                  >
                    Sign in
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
