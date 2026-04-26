import type { Inventory } from "./inventory";
import { RECIPES, type Recipe } from "./recipes";
import { ITEMS } from "./items";

export interface CraftingUI {
  toggle(): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  refresh(): void;
}

export interface CraftingUIOptions {
  inv: Inventory;
  log(msg: string): void;
  onCrafted(): void;
}

export function createCraftingUI(opts: CraftingUIOptions): CraftingUI {
  const panel = document.getElementById("craft-panel")!;
  const list = document.getElementById("craft-list")!;
  const info = document.getElementById("craft-info")!;
  const closeBtn = document.getElementById("craft-close")!;

  function canCraft(r: Recipe): boolean {
    return r.inputs.every((i) => opts.inv.has(i.id, i.amount));
  }

  function attempt(r: Recipe): void {
    if (!canCraft(r)) {
      opts.log(`Not enough materials for ${r.name}.`);
      return;
    }
    for (const i of r.inputs) opts.inv.remove(i.id, i.amount);
    if (!opts.inv.add(r.output.id, r.output.amount)) {
      opts.log("Inventory full!");
      // refund
      for (const i of r.inputs) opts.inv.add(i.id, i.amount);
      return;
    }
    const def = ITEMS[r.output.id];
    opts.log(`Crafted ${def?.name ?? r.output.id} ×${r.output.amount}.`);
    opts.onCrafted();
    render();
  }

  function render(): void {
    list.innerHTML = "";
    for (const r of RECIPES) {
      const ready = canCraft(r);
      const row = document.createElement("div");
      row.className = "craft-row" + (ready ? " ready" : "");
      const def = ITEMS[r.output.id];
      const icon = document.createElement("div");
      icon.className = "craft-icon";
      icon.textContent = def?.icon ?? "?";
      row.appendChild(icon);
      const meta = document.createElement("div");
      meta.className = "craft-meta";
      meta.innerHTML =
        `<div class="craft-name">${r.name}</div>` +
        `<div class="craft-cost">${r.inputs
          .map((i) => {
            const d = ITEMS[i.id];
            const have = opts.inv.count(i.id);
            const ok = have >= i.amount;
            return `<span style="color:${ok ? "#9adba0" : "#d99090"}">${d?.icon ?? "?"} ${d?.name ?? i.id}: ${have}/${i.amount}</span>`;
          })
          .join(" · ")}</div>`;
      row.appendChild(meta);
      const btn = document.createElement("button");
      btn.className = "craft-btn";
      btn.textContent = "Craft";
      btn.disabled = !ready;
      btn.addEventListener("click", () => attempt(r));
      row.appendChild(btn);
      list.appendChild(row);
    }
    info.innerHTML =
      "Hunt monsters to gather materials. Visit the anvil in <strong>Eldoria</strong> to craft.";
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
