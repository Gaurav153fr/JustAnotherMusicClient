import { IconSearch, IconSettings } from "@tabler/icons-react";
import { primaryModifierLabel } from "../platform";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  onOpen: () => void;
  onOpenSettings: () => void;
}

export function SearchBar({ onOpen, onOpenSettings }: SearchBarProps) {
  return (
    <div className={styles.row}>
      <button className={styles.bar} type="button" onClick={onOpen} data-onboarding="search">
        <IconSearch size={17} />
        <span>Search artists, songs, playlists, and albums</span>
        <kbd>{primaryModifierLabel} Space</kbd>
      </button>
      <button
        className={styles.settingsButton}
        type="button"
        onClick={onOpenSettings}
        aria-label="Open settings"
        title="Settings"
      >
        <IconSettings size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
