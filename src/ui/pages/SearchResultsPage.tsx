import { useEffect, useRef, useState } from "react";
import { IconPlayerPlay } from "@tabler/icons-react";
import type { Track } from "../../datasource/types";
import type { PlayerControllerActions } from "../../player/playerStore";
import { TrackArtwork } from "../components/TrackArtwork";
import { useTrackContextMenu } from "../components/TrackContextMenu";
import styles from "./SearchResultsPage.module.css";

interface SearchResultsPageProps {
  query: string;
  tracks: Track[];
  isLoading: boolean;
  playerController: PlayerControllerActions;
  onPlayTrack?: (track: Track) => Promise<void> | void;
}

export function SearchResultsPage({
  query,
  tracks,
  isLoading,
  playerController,
  onPlayTrack,
}: SearchResultsPageProps) {
  const { openTrackMenu } = useTrackContextMenu();
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isKeyboardSelection, setIsKeyboardSelection] = useState(false);
  const trackRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setSelectedIndex(-1);
    setIsKeyboardSelection(false);
  }, [query, tracks]);

  useEffect(() => {
    if (!isKeyboardSelection || selectedIndex < 0) return;
    trackRefs.current[selectedIndex]?.scrollIntoView({
      block: "nearest",
      behavior: "auto",
    });
  }, [isKeyboardSelection, selectedIndex]);

  useEffect(() => {
    if (isLoading || tracks.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTextEntry = target instanceof Element
        && target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        ) !== null;
      if (
        isTextEntry
        || event.ctrlKey
        || event.altKey
        || event.metaKey
        || event.shiftKey
      ) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setIsKeyboardSelection(true);
        setSelectedIndex((current) => {
          if (current === -1) return direction === 1 ? 0 : tracks.length - 1;
          return Math.max(0, Math.min(tracks.length - 1, current + direction));
        });
        return;
      }

      if (event.key === "Enter" && isKeyboardSelection && selectedIndex >= 0) {
        event.preventDefault();
        const track = tracks[selectedIndex];
        if (track) {
          if (onPlayTrack) void onPlayTrack(track);
          else void playerController.playTrackById(track.id, [track], true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isKeyboardSelection, isLoading, onPlayTrack, playerController, selectedIndex, tracks]);

  return (
    <div className={styles.root}>
      <header>
        <p className={styles.label}>Search results</p>
        <h1>{query}</h1>
      </header>

      {isLoading ? (
        <p className={styles.empty}>Searching...</p>
      ) : tracks.length === 0 ? (
        <p className={styles.empty}>No songs found.</p>
      ) : (
        <div className={styles.list}>
          <div className={styles.onboardingResults} data-onboarding="search-results">
          {tracks.slice(0, 4).map((track, index) => (
            <button
              key={track.id}
              ref={(element) => {
                trackRefs.current[index] = element;
              }}
              type="button"
              className={`${styles.track} ${
                isKeyboardSelection && selectedIndex === index ? styles.selected : ""
              }`}
              aria-current={
                isKeyboardSelection && selectedIndex === index ? "true" : undefined
              }
              onContextMenu={(event) => openTrackMenu(event, track)}
              onPointerMove={() => setIsKeyboardSelection(false)}
              onClick={() => {
                setIsKeyboardSelection(false);
                if (onPlayTrack) void onPlayTrack(track);
                else void playerController.playTrackById(track.id, [track], true);
              }}
            >
              <span className={styles.index}>{index + 1}</span>
              <TrackArtwork
                className={styles.artwork}
                artworkUrl={track.artworkUrl}
                iconSize={24}
              />
              <span className={styles.text}>
                <strong>{track.title}</strong>
                <span>{track.artist}</span>
              </span>
              <IconPlayerPlay size={18} />
            </button>
          ))}
          </div>
          {tracks.slice(4).map((track, offset) => {
            const index = offset + 4;
            return (
              <button
                key={track.id}
                ref={(element) => {
                  trackRefs.current[index] = element;
                }}
                type="button"
                className={`${styles.track} ${
                  isKeyboardSelection && selectedIndex === index ? styles.selected : ""
                }`}
                aria-current={
                  isKeyboardSelection && selectedIndex === index ? "true" : undefined
                }
                onContextMenu={(event) => openTrackMenu(event, track)}
                onPointerMove={() => setIsKeyboardSelection(false)}
                onClick={() => {
                  setIsKeyboardSelection(false);
                  if (onPlayTrack) void onPlayTrack(track);
                  else void playerController.playTrackById(track.id, [track], true);
                }}
              >
                <span className={styles.index}>{index + 1}</span>
                <TrackArtwork
                  className={styles.artwork}
                  artworkUrl={track.artworkUrl}
                  iconSize={24}
                />
                <span className={styles.text}>
                  <strong>{track.title}</strong>
                  <span>{track.artist}</span>
                </span>
                <IconPlayerPlay size={18} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
