import { usePlayerState } from "../../../player/playerStore";
import { usePlayerUIState } from "../../stores/playerUIStore";
import { TrackArtwork } from "../TrackArtwork";
import { useTrackContextMenu } from "../TrackContextMenu";
import styles from "./TrackInfo.module.css";

export function TrackInfo() {
  const state = usePlayerState();
  const uiState = usePlayerUIState();
  const { openTrackMenu } = useTrackContextMenu();
  const currentTrack = state.currentTrack;

  if (!currentTrack) {
    return null;
  }

  return (
    <div
      className={styles.trackInfo}
      onContextMenu={(event) => openTrackMenu(event, currentTrack)}
    >
      {uiState.showAlbumArt && (
        <TrackArtwork
          className={styles.albumArt}
          artworkUrl={currentTrack.artworkUrl}
          iconSize={28}
        />
      )}
      <div className={styles.trackDetails}>
        <p className={styles.trackTitle}>{currentTrack.title}</p>
        <p className={styles.trackArtist}>{currentTrack.artist}</p>
      </div>
    </div>
  );
}
