import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";

const RELEASE_TAG_PREFIX = "v";
const RELEASES_URL =
  "https://github.com/2latemc/JustAnotherMusicClient/releases/tag";
const SNOOZE_PREFIX = "just-another-music-client:update-snooze:";
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000;

export interface UpdateInfo {
  installedVersion: string;
  version: string;
  releaseUrl: string;
  update: Update;
}

export interface UpdateInstallProgress {
  downloadedBytes: number;
  totalBytes?: number;
  percent?: number;
}

export async function getInstalledVersion(): Promise<string> {
  return getVersion();
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  const update = await check();
  if (!update) return null;

  return {
    installedVersion: update.currentVersion,
    version: update.version,
    releaseUrl: `${RELEASES_URL}/${RELEASE_TAG_PREFIX}${encodeURIComponent(update.version)}`,
    update,
  };
}

export async function installUpdate(
  info: UpdateInfo,
  onProgress?: (progress: UpdateInstallProgress) => void,
): Promise<void> {
  let downloadedBytes = 0;
  let totalBytes: number | undefined;

  const reportProgress = (event: DownloadEvent) => {
    if (event.event === "Started") {
      downloadedBytes = 0;
      totalBytes = event.data.contentLength;
    } else if (event.event === "Progress") {
      downloadedBytes += event.data.chunkLength;
    } else if (event.event === "Finished" && totalBytes !== undefined) {
      downloadedBytes = totalBytes;
    }

    onProgress?.({
      downloadedBytes,
      totalBytes,
      percent: totalBytes && totalBytes > 0
        ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
        : undefined,
    });
  };

  await info.update.downloadAndInstall(reportProgress);
  await relaunch();
}

export function isUpdateSnoozed(version: string): boolean {
  const snoozedUntil = Number(localStorage.getItem(`${SNOOZE_PREFIX}${version}`));
  return Number.isFinite(snoozedUntil) && snoozedUntil > Date.now();
}

export function snoozeUpdate(version: string): void {
  localStorage.setItem(
    `${SNOOZE_PREFIX}${version}`,
    String(Date.now() + SNOOZE_DURATION_MS),
  );
}
