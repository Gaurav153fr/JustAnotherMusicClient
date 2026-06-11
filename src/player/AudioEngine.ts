import { logInternalError, logInternalInfo } from "../internal/logging";

type YouTubePlayerEvent = {
  data: number;
};

type YouTubePlayer = {
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getVideoData(): { video_id?: string };
  destroy(): void;
};

type YouTubePlayerConstructor = new (
  element: HTMLElement,
  options: {
    width: number;
    height: number;
    videoId?: string;
    playerVars: Record<string, number | string>;
    events: {
      onReady: () => void;
      onStateChange: (event: YouTubePlayerEvent) => void;
      onError: (event: YouTubePlayerEvent) => void;
    };
  },
) => YouTubePlayer;

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerConstructor;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let iframeApiPromise: Promise<void> | null = null;
const audioEngines = new Set<AudioEngine>();
let playbackClaimId = 0;
let playbackOwner: AudioEngine | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (iframeApiPromise) return iframeApiPromise;

  iframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Unable to load the YouTube player API."));
    document.head.appendChild(script);
  });

  return iframeApiPromise;
}

export class AudioEngine {
  private player: YouTubePlayer | null = null;
  private playerPromise: Promise<YouTubePlayer> | null = null;
  private currentVideoId: string | null = null;
  private volume = 1;
  private muted = false;
  private onEnded: (() => void) | null = null;
  private loadRequestId = 0;
  private stateWaiters = new Set<{
    states: Set<number>;
    videoId: string | null;
    resolve: () => void;
    reject: (error: Error) => void;
    timeoutId: number;
  }>();

  constructor() {
    audioEngines.add(this);
  }

  async loadTrack(videoId: string): Promise<void> {
    const requestId = ++this.loadRequestId;
    const player = await this.ensurePlayer();
    if (requestId !== this.loadRequestId) return;
    if (this.currentVideoId === videoId) return;

    this.currentVideoId = videoId;
    // A previous track may already have left the player in CUED. Wait for the
    // state event from this cue request instead of accepting that stale state.
    const cued = this.waitForPlayerState(
      [window.YT!.PlayerState.CUED],
      15_000,
      false,
      videoId,
    );
    player.cueVideoById(videoId);
    await cued;
    if (requestId !== this.loadRequestId || this.currentVideoId !== videoId) return;
    logInternalInfo("AudioEngine.loadTrack cued", { videoId });
  }

  setOnEnded(listener: (() => void) | null): void {
    this.onEnded = listener;
  }

  async play(): Promise<boolean> {
    const claimId = this.claimPlayback();
    const player = await this.ensurePlayer();
    if (claimId !== playbackClaimId || playbackOwner !== this) {
      player.pauseVideo();
      return false;
    }
    if (!this.currentVideoId) {
      throw new Error("No YouTube track is loaded.");
    }

    if (this.muted) {
      player.mute();
    } else {
      player.unMute();
    }
    player.setVolume(Math.round(this.volume * 100));
    const playing = this.waitForPlayerState(
      [window.YT!.PlayerState.PLAYING],
      15_000,
      true,
      this.currentVideoId,
    );
    player.playVideo();
    await playing;
    if (claimId !== playbackClaimId || playbackOwner !== this) {
      player.pauseVideo();
      return false;
    }
    logInternalInfo("AudioEngine.play requested", {
      videoId: this.currentVideoId,
      muted: this.muted,
      volume: this.volume,
    });
    return true;
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  suspend(): void {
    this.pause();
  }

  async resume(): Promise<boolean> {
    if (this.currentVideoId) {
      return this.play();
    }
    return false;
  }

  stop(): void {
    this.loadRequestId += 1;
    if (playbackOwner === this) {
      playbackOwner = null;
      playbackClaimId += 1;
    }
    this.player?.stopVideo();
    this.currentVideoId = null;
    this.rejectStateWaiters(new Error("Playback was stopped."));
  }

  silenceCompetingPlayback(): void {
    this.claimPlayback();
  }

  dispose(): void {
    this.stop();
    this.player?.destroy();
    this.player = null;
    audioEngines.delete(this);
  }

  seekTo(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    this.player?.seekTo(Math.max(0, seconds), true);
  }

  setVolume(level: number): void {
    this.volume = Math.min(1, Math.max(0, level));
    this.player?.setVolume(Math.round(this.volume * 100));
  }

  getVolume(): number {
    return this.player ? this.player.getVolume() / 100 : this.volume;
  }

  setMuted(isMuted: boolean): void {
    this.muted = isMuted;
    if (isMuted) {
      this.player?.mute();
    } else {
      this.player?.unMute();
    }
  }

  isMuted(): boolean {
    return this.player?.isMuted() ?? this.muted;
  }

  getCurrentTime(): number {
    return this.player?.getCurrentTime() ?? 0;
  }

  getDuration(): number {
    return this.player?.getDuration() ?? 0;
  }

  private async ensurePlayer(): Promise<YouTubePlayer> {
    if (this.player) return this.player;
    if (this.playerPromise) return this.playerPromise;

    this.playerPromise = this.createPlayer();
    try {
      this.player = await this.playerPromise;
      return this.player;
    } finally {
      this.playerPromise = null;
    }
  }

  private claimPlayback(): number {
    const claimId = ++playbackClaimId;
    playbackOwner = this;

    for (const engine of audioEngines) {
      if (engine !== this) engine.pauseForPlaybackClaim();
    }
    for (const media of document.querySelectorAll<HTMLMediaElement>("audio, video")) {
      media.pause();
    }

    return claimId;
  }

  private pauseForPlaybackClaim(): void {
    this.player?.pauseVideo();
  }

  private async createPlayer(): Promise<YouTubePlayer> {
    await loadYouTubeIframeApi();
    if (!window.YT?.Player) {
      throw new Error("YouTube player API loaded without a Player constructor.");
    }

    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.width = "200px";
    host.style.height = "200px";
    host.style.pointerEvents = "none";
    document.body.appendChild(host);

    return new Promise((resolve, reject) => {
      let player: YouTubePlayer;
      const timeoutId = window.setTimeout(() => {
        player?.destroy();
        host.remove();
        reject(new Error("Timed out while creating the YouTube player."));
      }, 15_000);

      player = new window.YT!.Player(host, {
        width: 200,
        height: 200,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            window.clearTimeout(timeoutId);
            player.setVolume(Math.round(this.volume * 100));
            player.unMute();
            logInternalInfo("AudioEngine YouTube player ready");
            resolve(player);
          },
          onStateChange: (event) => {
            logInternalInfo("AudioEngine YouTube player state", {
              state: event.data,
              videoId: this.currentVideoId,
              playerVideoId: player.getVideoData().video_id ?? null,
            });
            this.resolveStateWaiters(event.data, player.getVideoData().video_id ?? null);
            if (event.data === window.YT!.PlayerState.ENDED) {
              this.onEnded?.();
            }
          },
          onError: (event) => {
            const error = new Error(`YouTube player error ${event.data}`);
            this.rejectStateWaiters(error);
            logInternalError("AudioEngine YouTube player error", error, {
              videoId: this.currentVideoId,
            });
          },
        },
      });
    });
  }

  private waitForPlayerState(
    states: number[],
    timeoutMs: number,
    acceptCurrentState = true,
    videoId: string | null = null,
  ): Promise<void> {
    if (acceptCurrentState) {
      const currentState = this.player?.getPlayerState();
      const currentVideoId = this.player?.getVideoData().video_id ?? null;
      if (
        currentState !== undefined
        && states.includes(currentState)
        && (!videoId || currentVideoId === videoId)
      ) {
        return Promise.resolve();
      }
    }

    return new Promise((resolve, reject) => {
      const waiter = {
        states: new Set(states),
        videoId,
        resolve,
        reject,
        timeoutId: 0,
      };

      waiter.timeoutId = window.setTimeout(() => {
        this.stateWaiters.delete(waiter);
        reject(new Error(`Timed out waiting for YouTube player state: ${states.join(", ")}.`));
      }, timeoutMs);

      this.stateWaiters.add(waiter);
    });
  }

  private resolveStateWaiters(state: number, videoId: string | null): void {
    for (const waiter of this.stateWaiters) {
      if (
        !waiter.states.has(state)
        || (waiter.videoId !== null && waiter.videoId !== videoId)
      ) {
        continue;
      }
      window.clearTimeout(waiter.timeoutId);
      this.stateWaiters.delete(waiter);
      waiter.resolve();
    }
  }

  private rejectStateWaiters(error: Error): void {
    for (const waiter of this.stateWaiters) {
      window.clearTimeout(waiter.timeoutId);
      waiter.reject(error);
    }
    this.stateWaiters.clear();
  }
}
