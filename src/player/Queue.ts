import type { Track } from "../datasource/types";

export class Queue {
  private items: Track[] = [];
  private index = -1;
  private manualQueueLength = 0;

  get current(): Track | null {
    return this.index >= 0 && this.index < this.items.length
      ? this.items[this.index]
      : null;
  }

  get all(): readonly Track[] {
    return this.items;
  }

  get currentIndex(): number {
    return this.index;
  }

  get queuedManually(): number {
    return this.manualQueueLength;
  }

  set(tracks: Track[], startIndex = 0, manualQueueLength = 0) {
    this.items = tracks;
    this.index = tracks.length === 0
      ? -1
      : Math.min(Math.max(startIndex, 0), tracks.length - 1);
    this.manualQueueLength = Math.min(
      Math.max(manualQueueLength, 0),
      Math.max(0, tracks.length - this.index - 1),
    );
  }

  add(track: Track): void {
    if (this.index < 0) {
      this.items = [track];
      this.index = 0;
      return;
    }

    this.items.splice(this.index + 1 + this.manualQueueLength, 0, track);
    this.manualQueueLength += 1;
  }

  playNext(track: Track): void {
    if (this.index < 0) {
      this.items = [track];
      this.index = 0;
      return;
    }

    this.items.splice(this.index + 1, 0, track);
    this.manualQueueLength += 1;
  }

  replaceAutomaticUpcoming(tracks: Track[]): void {
    if (this.index < 0) {
      this.set(tracks);
      return;
    }

    const manualQueueEnd = this.index + 1 + this.manualQueueLength;
    this.items = [...this.items.slice(0, manualQueueEnd), ...tracks];
  }

  next(wrap = true): Track | null {
    if (this.items.length === 0) return null;
    if (this.index + 1 >= this.items.length) {
      if (!wrap) return null;
      this.index = 0;
      return this.current;
    }
    this.index += 1;
    if (this.manualQueueLength > 0) this.manualQueueLength -= 1;
    return this.current;
  }

  prev(wrap = true): Track | null {
    if (this.items.length === 0) return null;
    if (this.index - 1 < 0) {
      if (!wrap) return null;
      this.index = this.items.length - 1;
      return this.current;
    }
    this.index -= 1;
    this.manualQueueLength = 0;
    return this.current;
  }
}
