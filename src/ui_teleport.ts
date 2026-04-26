import type { Settlement } from "./settlements";

export interface TeleportUI {
  open(currentId: string): void;
  close(): void;
  isOpen(): boolean;
}

export interface TeleportUIOptions {
  settlements: Settlement[];
  onTeleport(target: Settlement): void;
}

export function createTeleportUI(opts: TeleportUIOptions): TeleportUI {
  const panel = document.getElementById("teleport-panel")!;
  const list = document.getElementById("tp-list")!;
  const closeBtn = document.getElementById("tp-close")!;

  function render(currentId: string): void {
    list.innerHTML = "";
    for (const s of opts.settlements) {
      const row = document.createElement("div");
      row.className = "tp-row" + (s.id === currentId ? " current" : "");
      row.innerHTML = `
        <div class="tp-icon">${s.starter ? "🏰" : "🏘"}</div>
        <div class="tp-meta">
          <div class="tp-name">${s.name}${s.id === currentId ? " (here)" : ""}</div>
          <div class="tp-desc">${s.description}</div>
        </div>
      `;
      if (s.id !== currentId) {
        row.addEventListener("click", () => {
          close();
          opts.onTeleport(s);
        });
      }
      list.appendChild(row);
    }
  }

  function open(currentId: string): void {
    panel.classList.remove("hidden");
    render(currentId);
  }
  function close(): void { panel.classList.add("hidden"); }
  function isOpen(): boolean { return !panel.classList.contains("hidden"); }

  closeBtn.addEventListener("click", close);
  panel.addEventListener("click", (e) => { if (e.target === panel) close(); });

  return { open, close, isOpen };
}

export function fadeTeleport(onMidpoint: () => void): void {
  const fade = document.getElementById("teleport-fade")!;
  fade.classList.add("visible");
  setTimeout(() => {
    onMidpoint();
    setTimeout(() => fade.classList.remove("visible"), 60);
  }, 420);
}
