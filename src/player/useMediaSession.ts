import { useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { PlayerState } from "./PlayerController";
import type { PlayerControllerActions } from "./playerStore";
import { logInternalWarn } from "../internal/logging";

type WindowsMediaAction = "play" | "pause" | "next" | "previous";

const usesNativeWindowsMediaSession =
  isTauri() && navigator.userAgent.includes("Windows");

export function useMediaSession(
  state: PlayerState,
  controller: PlayerControllerActions,
): void {
  useEffect(() => {
    if (!usesNativeWindowsMediaSession) return;

    const unlistenPromise = listen<WindowsMediaAction>(
      "windows-media-control",
      ({ payload }) => {
        if (payload === "play") void controller.play();
        if (payload === "pause") void controller.pause();
        if (payload === "next") void controller.skipToNext();
        if (payload === "previous") void controller.skipToPrevious();
      },
    );

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [controller]);

  useEffect(() => {
    if (!usesNativeWindowsMediaSession) return;

    const track = state.currentTrack;
    void invoke("update_windows_media_session", {
      update: {
        title: track?.title ?? null,
        artist: track?.artist ?? null,
        artworkUrl: track?.artworkUrl ?? null,
        status: state.status,
      },
    }).catch((error) => {
      logInternalWarn("useMediaSession native update failed", {
        error: String(error),
      });
    });
  }, [state.currentTrack, state.status]);

  useEffect(() => {
    if (usesNativeWindowsMediaSession || !("mediaSession" in navigator)) return;

    const handlers: Partial<Record<MediaSessionAction, MediaSessionActionHandler>> = {
      play: () => void controller.play(),
      pause: () => void controller.pause(),
      nexttrack: () => void controller.skipToNext(),
      previoustrack: () => void controller.skipToPrevious(),
      seekto: (details) => {
        if (details.seekTime !== undefined) void controller.seekTo(details.seekTime);
      },
      seekbackward: (details) => {
        const offset = details.seekOffset ?? 10;
        void controller.seekTo(Math.max(0, controller.getCurrentTime() - offset));
      },
      seekforward: (details) => {
        const duration = controller.getDuration();
        const offset = details.seekOffset ?? 10;
        void controller.seekTo(Math.min(duration, controller.getCurrentTime() + offset));
      },
    };

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(
          action as MediaSessionAction,
          handler as MediaSessionActionHandler,
        );
      } catch {
        // WebView media-session support varies by installed runtime version.
      }
    }

    return () => {
      for (const action of Object.keys(handlers) as MediaSessionAction[]) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore actions unsupported by the current WebView runtime.
        }
      }
    };
  }, [controller]);

  useEffect(() => {
    if (usesNativeWindowsMediaSession || !("mediaSession" in navigator)) return;

    const track = state.currentTrack;
    navigator.mediaSession.metadata = track
      ? new MediaMetadata({
          title: track.title,
          artist: track.artist,
          artwork: track.artworkUrl ? [{ src: track.artworkUrl }] : [],
        })
      : null;
    navigator.mediaSession.playbackState = state.status === "playing"
      ? "playing"
      : state.status === "paused"
        ? "paused"
        : "none";
  }, [state.currentTrack, state.status]);

  useEffect(() => {
    if (
      usesNativeWindowsMediaSession
      || !("mediaSession" in navigator)
      || !state.currentTrack
    ) return;

    const updatePosition = () => {
      const duration = controller.getDuration() || state.currentTrack?.durationSec || 0;
      const position = controller.getCurrentTime();
      if (duration > 0 && position >= 0 && position <= duration) {
        try {
          navigator.mediaSession.setPositionState({
            duration,
            playbackRate: 1,
            position,
          });
        } catch {
          // WebView media-session support varies by installed runtime version.
        }
      }
    };

    updatePosition();
    const intervalId = window.setInterval(updatePosition, 1000);
    return () => window.clearInterval(intervalId);
  }, [controller, state.currentTrack]);
}
