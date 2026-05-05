/**
 * Boot-time loading screen progress controller.
 *
 * Drives the progress bar and phase label on the #loading-screen element.
 * Used during the initial app boot, before the HUD is constructed.
 */

export interface LoadingProgress {
  set(percent: number, phase?: string): Promise<void>;
  show(): void;
  hide(): Promise<void>;
}

export function createLoadingProgress(): LoadingProgress {
  const fill = document.getElementById("loading-bar-fill") as HTMLElement | null;
  const phaseEl = document.getElementById("loading-phase") as HTMLElement | null;
  const percentEl = document.getElementById(
    "loading-percent",
  ) as HTMLElement | null;
  const subtitleEl = document.getElementById(
    "loading-subtitle",
  ) as HTMLElement | null;
  const screen = document.getElementById("loading-screen") as HTMLElement | null;

  let last = 0;

  function nextFrame(): Promise<void> {
    return new Promise((r) => requestAnimationFrame(() => r()));
  }

  return {
    async set(percent: number, phase?: string) {
      const p = Math.max(0, Math.min(100, Math.round(percent)));
      // Don't go backwards visually.
      if (p < last) return;
      last = p;
      if (fill) fill.style.width = `${p}%`;
      if (percentEl) percentEl.textContent = `${p}%`;
      if (phase && phaseEl) phaseEl.textContent = phase;
      if (phase && subtitleEl) subtitleEl.textContent = phase;
      // Yield so the browser can paint the new bar width before the next
      // synchronous workload starts.
      await nextFrame();
    },
    show() {
      if (!screen) return;
      screen.style.display = "";
      screen.classList.remove("fade-out");
    },
    async hide() {
      if (!screen) return;
      screen.classList.add("fade-out");
      await new Promise((r) => setTimeout(r, 600));
      screen.style.display = "none";
    },
  };
}
