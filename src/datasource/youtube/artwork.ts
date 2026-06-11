interface ArtworkCandidate {
  url?: string;
  width?: number;
  height?: number;
}

function normalizeArtworkUrl(url: string): string {
  const trimmedUrl = url.trim();
  return trimmedUrl.startsWith("//") ? `https:${trimmedUrl}` : trimmedUrl;
}

export function selectArtworkUrl(
  ...candidateGroups: Array<readonly ArtworkCandidate[] | null | undefined>
): string | undefined {
  const candidates = candidateGroups
    .flatMap((group) => group ?? [])
    .filter((candidate): candidate is ArtworkCandidate & { url: string } => Boolean(candidate.url?.trim()));

  const bestCandidate = candidates.reduce<(ArtworkCandidate & { url: string }) | undefined>(
    (best, candidate) => {
      if (!best) return candidate;

      const bestArea = (best.width ?? 0) * (best.height ?? 0);
      const candidateArea = (candidate.width ?? 0) * (candidate.height ?? 0);
      return candidateArea > bestArea ? candidate : best;
    },
    undefined,
  );

  return bestCandidate ? normalizeArtworkUrl(bestCandidate.url) : undefined;
}

export function getVideoArtworkFallback(videoId: string): string | undefined {
  return /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : undefined;
}
