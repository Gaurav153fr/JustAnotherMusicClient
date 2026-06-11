import {
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { usePlayerState } from "../../../player/playerStore";
import { playerController } from "../../../player/playerStore";
import styles from "./PlaybackControls.module.css";

export function PlaybackControls() {
  const state = usePlayerState();
  const isBusy = state.status === "loading";
  const isPlaying = state.status === "playing";

  const handlePlayPause = () => {
    void playerController.togglePlayPause();
  };

  const handleSkipNext = () => {
    void playerController.skipToNext();
  };

  const handleSkipPrevious = () => {
    void playerController.skipToPrevious();
  };

  return (
    <div className={styles.playbackControls}>
      <button
        type="button"
        className={`${styles.controlButton} ${styles.skipButton}`}
        onClick={handleSkipPrevious}
        disabled={isBusy || !state.currentTrack}
        aria-label="Previous track"
      >
        <IconPlayerSkipBack size={20} />
      </button>

      <button
        type="button"
        className={`${styles.controlButton} ${styles.playPauseButton}`}
        onClick={handlePlayPause}
        disabled={isBusy || !state.currentTrack}
        aria-label={isBusy ? "Loading song" : isPlaying ? "Pause" : "Play"}
      >
        <span className={styles.iconStage} aria-hidden="true">
          <span className={`${styles.playbackIcon} ${!isBusy && !isPlaying ? styles.activeIcon : ""}`}>
            <IconPlayerPlay size={20} />
          </span>
          <span className={`${styles.playbackIcon} ${!isBusy && isPlaying ? styles.activeIcon : ""}`}>
            <IconPlayerPause size={20} />
          </span>
          <span
            className={`${styles.playbackIcon} ${styles.loadingIcon} ${isBusy ? styles.activeIcon : ""}`}
          >
            <IconLoader2 size={20} />
          </span>
        </span>
      </button>

      <button
        type="button"
        className={`${styles.controlButton} ${styles.skipButton}`}
        onClick={handleSkipNext}
        disabled={isBusy || !state.currentTrack}
        aria-label="Next track"
      >
        <IconPlayerSkipForward size={20} />
      </button>
    </div>
  );
}
