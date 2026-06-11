import { useEffect, useState } from "react";
import { IconDisc } from "@tabler/icons-react";
import styles from "./TrackArtwork.module.css";

interface TrackArtworkProps {
  artworkUrl?: string;
  className?: string;
  iconSize?: number;
  loading?: "eager" | "lazy";
}

export function TrackArtwork({
  artworkUrl,
  className,
  iconSize = 24,
  loading = "lazy",
}: TrackArtworkProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [artworkUrl]);

  return (
    <span className={`${styles.root} ${className ?? ""}`}>
      {!artworkUrl || failed ? (
        <IconDisc size={iconSize} aria-hidden="true" />
      ) : (
        <img
          src={artworkUrl}
          alt=""
          loading={loading}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
