import { ITEMS, type ItemDef } from "./items";

export interface InventoryEntry {
  id: string;
  amount: number;
}

const SLOTS = 30;

export class Inventory {
  /** ordered by first-add for stable display */
  entries: InventoryEntry[] = [];

  add(id: string, amount = 1): boolean {
    const def = ITEMS[id];
    if (!def) return false;
    let remaining = amount;
    // top up existing stacks
    for (const e of this.entries) {
      if (e.id !== id) continue;
      const room = def.stack - e.amount;
      if (room <= 0) continue;
      const take = Math.min(room, remaining);
      e.amount += take;
      remaining -= take;
      if (remaining <= 0) return true;
    }
    // create new stacks
    while (remaining > 0) {
      if (this.entries.length >= SLOTS) return false;
      const take = Math.min(def.stack, remaining);
      this.entries.push({ id, amount: take });
      remaining -= take;
    }
    return true;
  }

  has(id: string, amount = 1): boolean {
    let total = 0;
    for (const e of this.entries) {
      if (e.id === id) total += e.amount;
      if (total >= amount) return true;
    }
    return false;
  }

  count(id: string): number {
    let total = 0;
    for (const e of this.entries) if (e.id === id) total += e.amount;
    return total;
  }

  remove(id: string, amount = 1): boolean {
    if (!this.has(id, amount)) return false;
    let remaining = amount;
    for (const e of this.entries) {
      if (e.id !== id) continue;
      const take = Math.min(e.amount, remaining);
      e.amount -= take;
      remaining -= take;
      if (remaining <= 0) break;
    }
    this.entries = this.entries.filter((e) => e.amount > 0);
    return true;
  }

  capacity(): { used: number; total: number } {
    return { used: this.entries.length, total: SLOTS };
  }

  defOf(id: string): ItemDef | undefined {
    return ITEMS[id];
  }
}
