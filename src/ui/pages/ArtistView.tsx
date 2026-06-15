import { useEffect, useMemo, useState } from "react";
import { IconArrowsShuffle, IconPlayerPlay, IconUser } from "@tabler/icons-react";
import type { Album, Artist, ArtistPage, Playlist, Track } from "../../datasource/types";
import type { LibraryController } from "../../player/LibraryController";
import type { PlayerControllerActions } from "../../player/playerStore";
import { shuffleTracks } from "../../player/shuffleTracks";
import { AlbumCard } from "../components/AlbumCard";
import { ArtistLinks } from "../components/ArtistLinks";
import { TrackArtwork } from "../components/TrackArtwork";
import { usePlaylistContextMenu } from "../components/PlaylistContextMenu";
import { useTrackContextMenu } from "../components/TrackContextMenu";
import styles from "./ArtistView.module.css";

type ReleaseFilter = "all" | "album" | "single" | "ep";

function compactViews(track: Track): string {
  if (track.viewCount) {
    return `${new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(track.viewCount)} views`;
  }
  return track.viewCountText
    ? track.viewCountText.replace(/\bplays?\b/i, "views")
    : "";
}

export function ArtistView({
  artist,
  playerController,
  libraryController,
  onOpenAlbum,
  onOpenPlaylist,
}: {
  artist?: Artist;
  playerController: PlayerControllerActions;
  libraryController: LibraryController;
  onOpenAlbum: (album: Album) => void;
  onOpenPlaylist: (playlist: Playlist) => void;
}) {
  const { openTrackMenu } = useTrackContextMenu();
  const { openPlaylistMenu, openAlbumMenu } = usePlaylistContextMenu();
  const [page, setPage] = useState<ArtistPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReleaseFilter>("all");

  useEffect(() => {
    if (!artist) return;
    let active = true;
    setPage(null);
    setIsLoading(true);
    setError(null);
    setFilter("all");
    void libraryController.getArtist(artist.id, (updated) => {
      if (active) setPage(updated);
    })
      .then((result) => {
        if (active) setPage(result);
      })
      .catch(() => {
        if (active) setError("Unable to load this artist.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [artist, libraryController]);

  const releaseTypes = useMemo(
    () => new Set(page?.releases.map((release) => release.releaseType) ?? []),
    [page?.releases],
  );
  const visibleReleases = page?.releases.filter(
    (release) => filter === "all" || release.releaseType === filter,
  ) ?? [];

  if (!artist) return null;
  const displayedArtist = page?.artist ?? artist;
  const popularSongs = page?.popularSongs.slice(0, 6) ?? [];

  const playShuffled = () => {
    const shuffled = shuffleTracks(page?.allSongs ?? []);
    if (shuffled[0]) {
      void playerController.playTrackById(shuffled[0].id, shuffled);
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.portrait}>
          {displayedArtist.artworkUrl ? (
            <img src={displayedArtist.artworkUrl} alt="" />
          ) : (
            <IconUser size={84} stroke={1.4} />
          )}
        </div>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>Artist</span>
          <h1>{displayedArtist.name}</h1>
          {displayedArtist.subscriberCount && (
            <p>{displayedArtist.subscriberCount}</p>
          )}
        </div>
        <button
          className={styles.shuffleButton}
          type="button"
          disabled={isLoading || Boolean(error) || !page?.allSongs.length}
          onClick={playShuffled}
        >
          <IconArrowsShuffle size={18} />
          <span>Shuffle</span>
        </button>
      </header>

      {isLoading && <p className={styles.message}>Loading artist...</p>}
      {error && <p className={styles.message}>{error}</p>}

      {!isLoading && !error && page && (
        <>
          {popularSongs.length > 0 && (
            <section className={styles.section}>
              <h2>Popular</h2>
              <div className={styles.trackList}>
                {popularSongs.map((track, index) => (
                  <button
                    key={track.id}
                    type="button"
                    className={styles.track}
                    onContextMenu={(event) => openTrackMenu(event, track)}
                    onClick={() => void playerController.playTrackById(
                      track.id,
                      page.allSongs,
                    )}
                  >
                    <span className={styles.index}>{index + 1}</span>
                    <TrackArtwork
                      className={styles.trackArtwork}
                      artworkUrl={track.artworkUrl}
                      iconSize={22}
                    />
                    <span className={styles.trackText}>
                      <strong>{track.title}</strong>
                      <ArtistLinks artists={track.artists} fallback={track.artist} />
                    </span>
                    <span className={styles.views}>{compactViews(track)}</span>
                    <IconPlayerPlay size={18} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {page.releases.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <h2>Releases</h2>
                <div className={styles.filters} role="group" aria-label="Release type">
                  {(["all", "album", "single", "ep"] as const)
                    .filter((type) => type === "all" || releaseTypes.has(type))
                    .map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={filter === type ? styles.activeFilter : ""}
                        aria-pressed={filter === type}
                        onClick={() => setFilter(type)}
                      >
                        {type === "all"
                          ? "All"
                          : type === "ep"
                            ? "EPs"
                            : `${type[0].toUpperCase()}${type.slice(1)}s`}
                      </button>
                    ))}
                </div>
              </div>
              <div className={styles.cardGrid}>
                {visibleReleases.map((release) => (
                  <AlbumCard
                    key={release.id}
                    artworkUrl={release.artworkUrl}
                    title={release.title}
                    subtitleContent={(
                      <ArtistLinks artists={release.artists} fallback={release.artist} />
                    )}
                    onClick={() => onOpenAlbum(release)}
                    onContextMenu={(event) => openAlbumMenu(event, release)}
                  />
                ))}
              </div>
            </section>
          )}

          {page.playlists.length > 0 && (
            <section className={styles.section}>
              <h2>Playlists</h2>
              <div className={styles.cardGrid}>
                {page.playlists.map((playlist) => (
                  <AlbumCard
                    key={playlist.id}
                    artworkUrl={playlist.artworkUrl}
                    title={playlist.title}
                    subtitle={playlist.owner}
                    onClick={() => onOpenPlaylist(playlist)}
                    onContextMenu={(event) => openPlaylistMenu(event, playlist)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
