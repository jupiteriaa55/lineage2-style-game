import type { Inventory } from "./inventory";
import { ITEMS, type ItemDef } from "./items";

export interface InventoryUI {
  toggle(): void;
  open(): void;
  close(): void;
  refresh(): void;
  isOpen(): boolean;
}

export interface InventoryUIOptions {
  inv: Inventory;
  onUse(def: ItemDef): boolean;
  log(msg: string): void;
}

export function createInventoryUI(opts: InventoryUIOptions): InventoryUI {
  const panel = document.getElementById("inventory-panel")!;
  const grid = document.getElementById("iv-grid")!;
  const info = document.getElementById("iv-info")!;
  const capText = document.getElementById("iv-cap-text")!;
  const closeBtn = document.getElementById("iv-close")!;
  let selectedId: string | null = null;

  function render(): void {
    grid.innerHTML = "";
    const cap = opts.inv.capacity();
    capText.textContent = `${cap.used} / ${cap.total}`;
    const slots = 30;
    for (let i = 0; i < slots; i++) {
      const cell = document.createElement("div");
      cell.className = "iv-cell";
      const entry = opts.inv.entries[i];
      if (!entry) {
        cell.classList.add("empty");
        grid.appendChild(cell);
        continue;
      }
      const def = ITEMS[entry.id];
      if (!def) continue;
      cell.title = def.name;
      const icon = document.createElement("div");
      icon.className = "iv-icon";
      icon.textContent = def.icon;
      cell.appendChild(icon);
      if (entry.amount > 1) {
        const amt = document.createElement("div");
        amt.className = "iv-amt";
        amt.textContent = String(entry.amount);
        cell.appendChild(amt);
      }
      if (selectedId === entry.id) cell.classList.add("selected");
      cell.addEventListener("click", () => {
        selectedId = entry.id;
        showInfo(def, entry.amount);
        render();
      });
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (def.kind === "consumable" || def.kind === "equipment") {
          if (opts.onUse(def)) {
            opts.inv.remove(def.id, 1);
            render();
            showInfo(def, opts.inv.count(def.id));
          }
        }
      });
      grid.appendChild(cell);
    }
    if (!selectedId) info.innerHTML =
      "Click an item to view details. Right-click to use a potion or amulet.";
  }

  function showInfo(def: ItemDef, count: number): void {
    const action = def.kind === "consumable"
      ? "<em>Right-click to drink.</em>"
      : def.kind === "equipment"
        ? "<em>Right-click to consume — permanent boost.</em>"
        : "<em>Crafting material.</em>";
    info.innerHTML = `<strong>${def.icon} ${def.name}</strong> ×${count}<br/>${def.description}<br/>${action}`;
  }

  function open(): void { panel.classList.remove("hidden"); render(); }
  function close(): void { panel.classList.add("hidden"); }
  function toggle(): void { panel.classList.contains("hidden") ? open() : close(); }
  function isOpen(): boolean { return !panel.classList.contains("hidden"); }

  closeBtn.addEventListener("click", close);
  panel.addEventListener("click", (e) => {
    if (e.target === panel) close();
  });

  return { toggle, open, close, refresh: render, isOpen };
}
