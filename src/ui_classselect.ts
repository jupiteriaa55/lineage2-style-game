import { CLASSES, type ClassId, type ClassDef } from "./classes";

const STORAGE_KEY = "chronicle_elfs_class";

export function getSavedClass(): ClassId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (v === "knight" || v === "scout" || v === "sorcerer" ||
              v === "bishop" || v === "raider")) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveClass(id: ClassId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearSavedClass(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function showClassSelect(): Promise<ClassId> {
  return new Promise((resolve) => {
    const panel = document.getElementById("class-select")!;
    const grid = document.getElementById("cs-grid")!;
    const nameEl = document.getElementById("cs-name")!;
    const tagEl = document.getElementById("cs-tag")!;
    const descEl = document.getElementById("cs-desc")!;
    const confirm = document.getElementById("cs-confirm") as HTMLButtonElement;

    grid.innerHTML = "";
    let selected: ClassId | null = null;

    const cards: Record<ClassId, HTMLElement> = {} as Record<ClassId, HTMLElement>;
    (Object.values(CLASSES) as ClassDef[]).forEach((cls) => {
      const card = document.createElement("div");
      card.className = "cs-card";
      card.innerHTML = `
        <div class="cs-icon">${cls.icon}</div>
        <div class="cs-cname">${cls.name}</div>
        <div class="cs-ctag">${cls.tagline}</div>
      `;
      card.addEventListener("click", () => {
        selected = cls.id;
        Object.values(cards).forEach((c) => c.classList.remove("selected"));
        card.classList.add("selected");
        nameEl.textContent = cls.name;
        tagEl.textContent = cls.tagline;
        descEl.textContent = cls.description;
        confirm.disabled = false;
      });
      grid.appendChild(card);
      cards[cls.id] = card;
    });

    confirm.disabled = true;
    confirm.onclick = () => {
      if (!selected) return;
      saveClass(selected);
      panel.classList.add("hidden");
      resolve(selected);
    };

    panel.classList.remove("hidden");
  });
}
