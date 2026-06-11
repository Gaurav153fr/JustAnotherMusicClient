import { type MouseEvent, useEffect, useState } from "react";
import { IconMusic, IconPlayerPlay } from "@tabler/icons-react";
import styles from "./AlbumCard.module.css";

interface AlbumCardProps {
  color?: string;
  artworkUrl?: string;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void;
}

export function AlbumCard({
  color = "#333333",
  artworkUrl,
  title,
  subtitle,
  onClick,
  onContextMenu,
}: AlbumCardProps) {
  const [artworkFailed, setArtworkFailed] = useState(false);

  useEffect(() => {
    setArtworkFailed(false);
  }, [artworkUrl]);

  return (
    <div
      className={styles.card}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick?.();
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.cover} style={{ backgroundColor: color }}>
        {artworkUrl && !artworkFailed ? (
          <img
            className={styles.artwork}
            src={artworkUrl}
            alt=""
            loading="lazy"
            onError={() => setArtworkFailed(true)}
          />
        ) : (
          <IconMusic className={styles.artworkFallback} size={48} aria-hidden="true" />
        )}
        <div className={styles.playOverlay}>
          <IconPlayerPlay size={32} className={styles.playIcon} />
        </div>
      </div>
      {title && <span className={styles.title}>{title}</span>}
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
    </div>
  );
}
