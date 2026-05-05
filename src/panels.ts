import { ITEMS, getItem, rarityColor, getItemName, getItemDesc } from "./items";
import { t } from "./i18n";
import {
  addItem,
  countItem,
  equipFromBag,
  equipmentBonuses,
  removeItem,
  unequip,
} from "./inventory";
import { canCraft, performCraft, RECIPE_LIST } from "./crafting";
import { LOOTBOXES, openLootbox } from "./lootbox";
import { BUILDING_LIST, BUILDINGS, getBuildingName, getBuildingDesc } from "./buildings";
import { QUEST_LIST, getQuest, getQuestName, getQuestDesc } from "./quests";
import { getNPC, getNPCName } from "./npcs";
import { getCity, getCityName } from "./cities";
import { getMobName } from "./mobs";
import type {
  BuildingKind,
  EquipSlot,
  PlayerProfile,
  QuestState,
  RecipeDef,
  VillageState,
} from "./types";

interface PanelHooks {
  log(msg: string, kind?: "system" | "xp" | "heal" | "dmg"): void;
  refresh(): void;
}

export interface Panels {
  showInventory(): void;
  showCrafting(): void;
  showQuests(): void;
  showBuilding(): void;
  showShop(npcName: string, shop: { itemId: string; price: number }[]): void;
  closeAll(): void;
  refreshAll(): void;
}

export function createPanels(
  profile: PlayerProfile,
  hooks: PanelHooks,
): Panels {
  const state = {
    inventoryOpen: false,
    craftingOpen: false,
    questsOpen: false,
    buildingOpen: false,
    shopOpen: false,
    selectedBuilding: null as BuildingKind | null,
  };

  const inv = profile.inventory;

  /* ---------------- Inventory ---------------- */
  const invPanel = document.getElementById("inventory-panel") as HTMLElement;
  const invBag = document.getElementById("inventory-bag") as HTMLElement;
  const invEquip = document.getElementById("inventory-equip") as HTMLElement;
  const invStats = document.getElementById("inventory-stats") as HTMLElement;
  const invClose = document.getElementById("inventory-close") as HTMLElement;
  invClose?.addEventListener("click", () => closeInventory());

  function paintInventory() {
    if (!invPanel) return;
    invBag.innerHTML = "";
    for (let i = 0; i < inv.bag.length; i++) {
      const slot = inv.bag[i];
      const cell = document.createElement("div");
      cell.className = "inv-slot";
      if (slot) {
        const def = getItem(slot.itemId);
        if (def) {
          cell.innerHTML = `
            <div class="inv-icon" style="color:${rarityColor(def.rarity)}">${def.icon}</div>
            ${slot.count > 1 ? `<div class="inv-count">${slot.count}</div>` : ""}
          `;
          cell.title = `${getItemName(def)}\n${getItemDesc(def)}`;
          cell.addEventListener("click", () => onSlotClick(i));
        }
      }
      invBag.appendChild(cell);
    }

    invEquip.innerHTML = "";
    const slots: EquipSlot[] = [
      "weapon",
      "armor",
      "helmet",
      "gloves",
      "boots",
      "ring",
      "amulet",
    ];
    for (const slot of slots) {
      const id = inv.equipment[slot];
      const cell = document.createElement("div");
      cell.className = "inv-equip-slot";
      cell.dataset.slot = slot;
      const label = `<div class="inv-equip-label">${slot}</div>`;
      if (id) {
        const def = getItem(id);
        if (def) {
          cell.innerHTML = `${label}<div class="inv-icon" style="color:${rarityColor(def.rarity)}">${def.icon}</div>`;
          cell.title = `${getItemName(def)}\n${getItemDesc(def)}`;
          cell.addEventListener("click", () => {
            unequip(inv, slot);
            paintInventory();
          });
        }
      } else {
        cell.innerHTML = label;
      }
      invEquip.appendChild(cell);
    }

    const bonus = equipmentBonuses(inv);
    invStats.innerHTML = `
      <div><b>${t("hud.gold")}:</b> ${profile.gold}</div>
      <div><b>${t("common.lvl")}</b> ${profile.level}</div>
      <div><b>+Atk:</b> +${bonus.attack ?? 0}</div>
      <div><b>+Def:</b> +${bonus.defense ?? 0}</div>
      <div><b>+HP:</b> +${bonus.hpMax ?? 0}</div>
      <div><b>+MP:</b> +${bonus.mpMax ?? 0}</div>
    `;
  }

  function onSlotClick(i: number) {
    const stack = inv.bag[i];
    if (!stack) return;
    const def = getItem(stack.itemId);
    if (!def) return;
    if (def.equip) {
      equipFromBag(inv, i);
      paintInventory();
      hooks.refresh();
    } else if (def.kind === "lootbox" && def.lootboxId) {
      const result = openLootbox(inv, def.lootboxId);
      removeItem(inv, def.id, 1);
      for (const r of result.rewards) {
        hooks.log(
          t("log.lootboxOpened", { item: getItemName(r.def), rarity: r.def.rarity }),
          "xp",
        );
      }
      paintInventory();
    } else if (def.kind === "consumable") {
      if (def.id === "charge_spirit") {
        profile.spiritChargeLeft = 30;
        removeItem(inv, def.id, 1);
        hooks.log(t("log.spiritCharge", { sec: 30 }), "xp");
      } else if (def.id === "charge_mana") {
        profile.manaChargeLeft = 30;
        removeItem(inv, def.id, 1);
        hooks.log(t("log.manaCharge", { sec: 30 }), "xp");
      } else if (def.consume) {
        if (def.consume.healHp) hooks.log(`+${def.consume.healHp} HP`, "heal");
        if (def.consume.healMp) hooks.log(`+${def.consume.healMp} MP`, "heal");
        removeItem(inv, def.id, 1);
        hooks.refresh();
      }
      paintInventory();
    }
  }

  function showInventory() {
    if (!invPanel) return;
    state.inventoryOpen = true;
    invPanel.classList.remove("hidden");
    paintInventory();
  }

  function closeInventory() {
    state.inventoryOpen = false;
    invPanel?.classList.add("hidden");
  }

  /* ---------------- Crafting ---------------- */
  const craftPanel = document.getElementById("crafting-panel") as HTMLElement;
  const craftList = document.getElementById("crafting-list") as HTMLElement;
  const craftClose = document.getElementById("crafting-close") as HTMLElement;
  craftClose?.addEventListener("click", () => closeCrafting());

  function paintCrafting() {
    if (!craftPanel) return;
    craftList.innerHTML = "";
    const sorted = RECIPE_LIST.slice().sort(
      (a, b) => a.levelReq - b.levelReq || a.name.localeCompare(b.name),
    );
    for (const r of sorted) {
      const row = renderRecipe(r);
      if (row) craftList.appendChild(row);
    }
  }

  function renderRecipe(r: RecipeDef): HTMLElement {
    const row = document.createElement("div");
    row.className = "craft-row";
    const def = getItem(r.result.itemId);
    const can = canCraft(inv, r, profile.level, profile.class);
    const inputs = r.inputs
      .map((inp) => {
        const idef = getItem(inp.itemId);
        const have = countItem(inv, inp.itemId);
        const ok = have >= inp.count;
        return `<span class="craft-input ${ok ? "ok" : "nope"}">${idef?.icon ?? "?"} ${idef ? getItemName(idef) : inp.itemId} ${have}/${inp.count}</span>`;
      })
      .join("");
    row.innerHTML = `
      <div class="craft-result" style="color:${def ? rarityColor(def.rarity) : "#fff"}">
        ${def?.icon ?? "?"} <b>${def ? getItemName(def) : r.name}</b>
        <span class="craft-lvreq">${t("common.lvl")}${r.levelReq}</span>
      </div>
      <div class="craft-inputs">${inputs}</div>
      <button class="craft-btn" ${can.ok ? "" : "disabled"}>${can.ok ? t("craft.craft") : can.reason ?? "—"}</button>
    `;
    const btn = row.querySelector(".craft-btn") as HTMLButtonElement;
    btn.addEventListener("click", () => {
      const result = performCraft(inv, r, profile.level, profile.class);
      if (result.ok && def) {
        hooks.log(t("log.crafted", { item: getItemName(def) }), "xp");
      } else if (result.reason) {
        hooks.log(t("log.craftFail"), "system");
      }
      paintCrafting();
    });
    return row;
  }

  function showCrafting() {
    if (!craftPanel) return;
    state.craftingOpen = true;
    craftPanel.classList.remove("hidden");
    paintCrafting();
  }
  function closeCrafting() {
    state.craftingOpen = false;
    craftPanel?.classList.add("hidden");
  }

  /* ---------------- Quests ---------------- */
  const questsPanel = document.getElementById("quests-panel") as HTMLElement;
  const questsList = document.getElementById("quests-list") as HTMLElement;
  const questsClose = document.getElementById("quests-close") as HTMLElement;
  questsClose?.addEventListener("click", () => closeQuests());

  function paintQuests() {
    if (!questsPanel) return;
    questsList.innerHTML = "";
    const sortKey = (s: QuestState) =>
      s.status === "active" ? 0 : s.status === "complete" ? 1 : 2;
    const states = profile.quests.slice().sort((a, b) => sortKey(a) - sortKey(b));
    for (const s of states) {
      const def = getQuest(s.questId);
      if (!def) continue;
      const row = document.createElement("div");
      row.className = `quest-row quest-${s.status}`;
      const objItemDef = def.objective.kind === "collect" ? getItem(def.objective.itemId) : null;
      const objText =
        def.objective.kind === "kill"
          ? t("quest.kill", {
              name: getMobName(def.objective.mobId),
              cur: s.progress,
              tot: def.objective.count,
            })
          : t("quest.collect", {
              name: objItemDef ? getItemName(objItemDef) : def.objective.itemId,
              cur: s.progress,
              tot: def.objective.count,
            });
      const statusLbl =
        s.status === "active"
          ? t("quest.active")
          : s.status === "complete"
            ? t("quest.completed")
            : t("quest.completed");
      row.innerHTML = `
        <div class="quest-name">${getQuestName(def)}</div>
        <div class="quest-desc">${getQuestDesc(def)}</div>
        <div class="quest-obj">${objText}</div>
        <div class="quest-status">${statusLbl}</div>
      `;
      questsList.appendChild(row);
    }
    // Section: available quests in the world.
    const avail = document.createElement("div");
    avail.className = "quest-available-block";
    avail.innerHTML = `<h3>${t("quest.available")}</h3>`;
    for (const def of QUEST_LIST) {
      const known = profile.quests.some((q) => q.questId === def.id);
      if (known) continue;
      if (profile.level < def.levelReq) continue;
      const row = document.createElement("div");
      row.className = "quest-row quest-available";
      row.innerHTML = `
        <div class="quest-name">${getQuestName(def)}</div>
        <div class="quest-desc">${getQuestDesc(def)}</div>
        <div class="quest-obj">${t("quest.talkTo", { lvl: def.levelReq, npc: getNPC(def.giver) ? getNPCName(def.giver) : def.giver, city: getCity(def.city) ? getCityName(def.city) : def.city })}</div>
        <button class="quest-accept">${t("quest.accept")}</button>
      `;
      const btn = row.querySelector(".quest-accept") as HTMLButtonElement;
      btn.addEventListener("click", () => {
        profile.quests.push({ questId: def.id, status: "active", progress: 0 });
        hooks.log(t("log.questAccepted", { name: getQuestName(def) }), "system");
        paintQuests();
      });
      avail.appendChild(row);
    }
    questsList.appendChild(avail);
  }

  function showQuests() {
    if (!questsPanel) return;
    state.questsOpen = true;
    questsPanel.classList.remove("hidden");
    paintQuests();
  }
  function closeQuests() {
    state.questsOpen = false;
    questsPanel?.classList.add("hidden");
  }

  /* ---------------- Building ---------------- */
  const buildPanel = document.getElementById("build-panel") as HTMLElement;
  const buildList = document.getElementById("build-list") as HTMLElement;
  const buildClose = document.getElementById("build-close") as HTMLElement;
  buildClose?.addEventListener("click", () => closeBuilding());

  function paintBuilding() {
    if (!buildPanel) return;
    if (!profile.village) {
      profile.village = blankVillage(profile.pos);
    }
    buildList.innerHTML = "";
    for (const b of BUILDING_LIST) {
      const cost = b.cost
        .map((c) => {
          const def = getItem(c.itemId);
          const have = countItem(inv, c.itemId);
          const ok = have >= c.count;
          return `<span class="craft-input ${ok ? "ok" : "nope"}">${def?.icon ?? "?"} ${have}/${c.count}</span>`;
        })
        .join("");
      const row = document.createElement("button");
      row.className = "build-row";
      if (state.selectedBuilding === b.id) row.classList.add("selected");
      row.innerHTML = `
        <div class="build-icon">${b.icon}</div>
        <div class="build-name">${getBuildingName(b)}</div>
        <div class="build-desc">${getBuildingDesc(b)}</div>
        <div class="build-cost">${t("build.cost")}: ${cost}</div>
      `;
      row.addEventListener("click", () => {
        state.selectedBuilding = b.id;
        paintBuilding();
      });
      buildList.appendChild(row);
    }
    const placed = profile.village!.buildings.length;
    const note = document.createElement("div");
    note.className = "build-note";
    note.textContent = `${t("build.placed")}: ${placed}. → ${state.selectedBuilding ?? "—"}`;
    buildList.appendChild(note);
  }

  function showBuilding() {
    if (!buildPanel) return;
    state.buildingOpen = true;
    buildPanel.classList.remove("hidden");
    paintBuilding();
  }
  function closeBuilding() {
    state.buildingOpen = false;
    buildPanel?.classList.add("hidden");
    state.selectedBuilding = null;
  }

  /* ---------------- Shop ---------------- */
  const shopPanel = document.getElementById("shop-panel") as HTMLElement;
  const shopTitle = document.getElementById("shop-title") as HTMLElement;
  const shopList = document.getElementById("shop-list") as HTMLElement;
  const shopClose = document.getElementById("shop-close") as HTMLElement;
  shopClose?.addEventListener("click", () => closeShop());

  function showShop(
    npcName: string,
    shop: { itemId: string; price: number }[],
  ) {
    if (!shopPanel) return;
    state.shopOpen = true;
    shopPanel.classList.remove("hidden");
    shopTitle.textContent = npcName;
    shopList.innerHTML = "";
    for (const entry of shop) {
      const def = getItem(entry.itemId);
      if (!def) continue;
      const row = document.createElement("div");
      row.className = "shop-row";
      row.innerHTML = `
        <div class="shop-icon" style="color:${rarityColor(def.rarity)}">${def.icon}</div>
        <div class="shop-name">${getItemName(def)}</div>
        <div class="shop-desc">${getItemDesc(def)}</div>
        <div class="shop-price">${entry.price} ⛀</div>
        <button class="shop-buy">${t("shop.buy")}</button>
      `;
      const btn = row.querySelector(".shop-buy") as HTMLButtonElement;
      btn.addEventListener("click", () => {
        if (profile.gold < entry.price) {
          hooks.log(t("log.notEnoughGold"), "system");
          return;
        }
        const leftover = addItem(inv, entry.itemId, 1);
        if (leftover > 0) {
          hooks.log("Inventory full", "system");
          return;
        }
        profile.gold -= entry.price;
        hooks.log(t("log.bought", { item: getItemName(def), gold: entry.price }), "xp");
      });
      shopList.appendChild(row);
    }
  }

  function closeShop() {
    state.shopOpen = false;
    shopPanel?.classList.add("hidden");
  }

  /* ---------------- Public API ---------------- */
  function closeAll() {
    closeInventory();
    closeCrafting();
    closeQuests();
    closeBuilding();
    closeShop();
  }

  function refreshAll() {
    if (state.inventoryOpen) paintInventory();
    if (state.craftingOpen) paintCrafting();
    if (state.questsOpen) paintQuests();
    if (state.buildingOpen) paintBuilding();
  }

  return {
    showInventory,
    showCrafting,
    showQuests,
    showBuilding,
    showShop,
    closeAll,
    refreshAll,
  };
}

function blankVillage(pos: [number, number]): VillageState {
  return { origin: [pos[0] - 24, pos[1] - 24], buildings: [] };
}

/* Re-export getters for outside use. */
export { ITEMS, BUILDINGS, LOOTBOXES };
