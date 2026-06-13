import { useSyncExternalStore } from "react";
import { isLinux } from "../platform";

const STORAGE_KEY = "paper-pc-mode";
const CHANGE_EVENT = "paper-pc-mode-change";

function readPaperPcMode() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function applyPaperPcMode(enabled = readPaperPcMode()) {
  document.documentElement.toggleAttribute("data-paper-pc", enabled);
}

export function setPaperPcMode(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));

  if (isLinux) {
    window.location.reload();
    return;
  }

  applyPaperPcMode(enabled);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function usePaperPcMode() {
  return useSyncExternalStore(subscribe, readPaperPcMode, () => false);
}
