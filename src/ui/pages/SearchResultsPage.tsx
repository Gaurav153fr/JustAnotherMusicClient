import { IconPlayerPlay, IconUser } from "@tabler/icons-react";
import type {
  Album,
  Artist,
  Playlist,
  SearchResults,
  Track,
} from "../../datasource/types";
import type { PlayerControllerActions } from "../../player/playerStore";
import { AlbumCard } from "../components/AlbumCard";
import { ArtistLinks } from "../components/ArtistLinks";
import { TrackArtwork } from "../components/TrackArtwork";
import { usePlaylistContextMenu } from "../components/PlaylistContextMenu";
import { useTrackContextMenu } from "../components/TrackContextMenu";
import styles from "./SearchResultsPage.module.css";

export function SearchResultsPage({
  query,
  results,
  isLoading,
  playerController,
  onPlayTrack,
  onOpenArtist,
  onOpenAlbum,
  onOpenPlaylist,
}: {
  query: string;
  results: SearchResults;
  isLoading: boolean;
  playerController: PlayerControllerActions;
  onPlayTrack?: (track: Track) => Promise<void> | void;
  onOpenArtist: (artist: Artist) => void;
  onOpenAlbum: (album: Album) => void;
  onOpenPlaylist: (playlist: Playlist) => void;
}) {
  const { openTrackMenu } = useTrackContextMenu();
  const { openPlaylistMenu } = usePlaylistContextMenu();
  const hasResults = results.artists.length
    + results.tracks.length
    + results.albums.length
    + results.playlists.length > 0;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const hasExactArtist = results.artists.some(
    (artist) => artist.name.toLocaleLowerCase() === normalizedQuery,
  );
  const hasExactTrack = results.tracks.some(
    (track) => track.title.toLocaleLowerCase() === normalizedQuery,
  );
  const songsFirst = hasExactTrack && !hasExactArtist;

  const playTrack = (track: Track) => {
    if (onPlayTrack) void onPlayTrack(track);
    else void playerController.playTrackById(track.id, results.tracks, true);
  };

  return (
    <div className={styles.root}>
      <header>
        <p className={styles.label}>Search results</p>
        <h1>{query}</h1>
      </header>

      {isLoading ? (
        <p className={styles.empty}>Searching...</p>
      ) : !hasResults ? (
        <p className={styles.empty}>No results found.</p>
      ) : (
        <div className={styles.sections}>
          {results.artists.length > 0 && (
            <section className={styles.section} style={{ order: songsFirst ? 1 : 0 }}>
              <h2>Artists</h2>
              <div className={styles.cardGrid}>
                {results.artists.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    className={styles.artistCard}
                    onClick={() => onOpenArtist(artist)}
                  >
                    <span className={styles.artistArtwork}>
                      {artist.artworkUrl
                        ? <img src={artist.artworkUrl} alt="" />
                        : <IconUser size={42} />}
                    </span>
                    <strong>{artist.name}</strong>
                    <span>{artist.subscriberCount || "Artist"}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.tracks.length > 0 && (
            <section className={styles.section} style={{ order: songsFirst ? 0 : 1 }}>
              <h2>Songs</h2>
              <div className={styles.list} data-onboarding="search-results">
                {results.tracks.map((track, index) => (
                  <button
                    key={track.id}
                    type="button"
                    className={styles.track}
                    onContextMenu={(event) => openTrackMenu(event, track)}
                    onClick={() => playTrack(track)}
                  >
                    <span className={styles.index}>{index + 1}</span>
                    <TrackArtwork
                      className={styles.artwork}
                      artworkUrl={track.artworkUrl}
                      iconSize={24}
                    />
                    <span className={styles.text}>
                      <strong>{track.title}</strong>
                      <ArtistLinks artists={track.artists} fallback={track.artist} />
                    </span>
                    <IconPlayerPlay size={18} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.albums.length > 0 && (
            <section className={styles.section} style={{ order: 2 }}>
              <h2>Albums</h2>
              <div className={styles.cardGrid}>
                {results.albums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    artworkUrl={album.artworkUrl}
                    title={album.title}
                    subtitleContent={(
                      <ArtistLinks artists={album.artists} fallback={album.artist} />
                    )}
                    onClick={() => onOpenAlbum(album)}
                  />
                ))}
              </div>
            </section>
          )}

          {results.playlists.length > 0 && (
            <section className={styles.section} style={{ order: 3 }}>
              <h2>Playlists</h2>
              <div className={styles.cardGrid}>
                {results.playlists.map((playlist) => (
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
        </div>
      )}
    </div>
  );
}
