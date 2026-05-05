import type { PlayerProfile } from "./types";

const KEY = "cdg.profile.v1";

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn("Failed to save profile", err);
  }
}

export function loadProfile(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlayerProfile;
  } catch (err) {
    console.warn("Failed to load profile", err);
    return null;
  }
}

export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn("Failed to clear profile", err);
  }
}
