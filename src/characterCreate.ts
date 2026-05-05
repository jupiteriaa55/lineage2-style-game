import { RACES } from "./races";
import { CLASSES } from "./classes";
import type { ClassId, RaceId } from "./types";

interface Selection {
  name: string;
  race: RaceId;
  cls: ClassId;
}

export function showCharacterCreate(
  initial?: Partial<Selection>,
): Promise<Selection> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "create-overlay";

    const races = Object.values(RACES);
    const classes = Object.values(CLASSES);

    let race: RaceId = (initial?.race as RaceId) ?? races[0].id;
    let cls: ClassId = (initial?.cls as ClassId) ?? classes[0].id;
    let name = initial?.name ?? "";

    overlay.innerHTML = `
      <div class="create-panel">
        <h1>Forge Your Hero</h1>
        <p class="create-subtitle">Chronicles of Devil Gods</p>

        <div class="create-row create-row--name">
          <label for="cc-name">Name</label>
          <input id="cc-name" type="text" maxlength="20" value="${name}" placeholder="Enter your name" />
        </div>

        <div class="create-row">
          <h2>Choose Race</h2>
          <div id="cc-races" class="cc-grid"></div>
          <div id="cc-race-info" class="cc-info"></div>
        </div>

        <div class="create-row">
          <h2>Choose Class</h2>
          <div id="cc-classes" class="cc-grid"></div>
          <div id="cc-class-info" class="cc-info"></div>
        </div>

        <button id="cc-start" class="cc-start-btn">Begin Adventure</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const racesEl = overlay.querySelector("#cc-races") as HTMLElement;
    const raceInfo = overlay.querySelector("#cc-race-info") as HTMLElement;
    const classesEl = overlay.querySelector("#cc-classes") as HTMLElement;
    const classInfo = overlay.querySelector("#cc-class-info") as HTMLElement;
    const nameInput = overlay.querySelector("#cc-name") as HTMLInputElement;
    const startBtn = overlay.querySelector("#cc-start") as HTMLButtonElement;

    function paintRaces() {
      racesEl.innerHTML = "";
      for (const r of races) {
        const card = document.createElement("button");
        card.className = "cc-card";
        if (r.id === race) card.classList.add("selected");
        card.innerHTML = `
          <div class="cc-card-icon" style="background:#${r.palette.skin
            .toString(16)
            .padStart(6, "0")}">
            <span style="color:#${r.palette.hair.toString(16).padStart(6, "0")}">${r.name[0]}</span>
          </div>
          <div class="cc-card-name">${r.name}</div>
        `;
        card.addEventListener("click", () => {
          race = r.id;
          paintRaces();
          paintRaceInfo();
        });
        racesEl.appendChild(card);
      }
    }

    function paintRaceInfo() {
      const r = RACES[race];
      const bonusEntries = Object.entries(r.statBonus)
        .map(([k, v]) => `${k} ${v! >= 0 ? "+" : ""}${v}`)
        .join(", ");
      raceInfo.innerHTML = `
        <div class="cc-name">${r.name}</div>
        <div class="cc-desc">${r.description}</div>
        <div class="cc-bonus">${bonusEntries || "No bonuses"}</div>
      `;
    }

    function paintClasses() {
      classesEl.innerHTML = "";
      for (const c of classes) {
        const card = document.createElement("button");
        card.className = "cc-card";
        if (c.id === cls) card.classList.add("selected");
        card.innerHTML = `
          <div class="cc-card-icon cc-class-${c.id}">
            <span>${c.id === "warrior" ? "⚔" : c.id === "mage" ? "✦" : "🗡"}</span>
          </div>
          <div class="cc-card-name">${c.name}</div>
        `;
        card.addEventListener("click", () => {
          cls = c.id;
          paintClasses();
          paintClassInfo();
        });
        classesEl.appendChild(card);
      }
    }

    function paintClassInfo() {
      const c = CLASSES[cls];
      const advanced = c.advanced
        .map((a) => `<li><b>${a.name}</b> &mdash; ${a.description}</li>`)
        .join("");
      classInfo.innerHTML = `
        <div class="cc-name">${c.name}</div>
        <div class="cc-desc">${c.description}</div>
        <div class="cc-bonus">Advanced (Lv. 20):</div>
        <ul class="cc-advanced">${advanced}</ul>
      `;
    }

    nameInput.addEventListener("input", () => {
      name = nameInput.value.trim();
    });

    startBtn.addEventListener("click", () => {
      const finalName = name || RACES[race].name + " Hero";
      overlay.classList.add("fade-out");
      window.setTimeout(() => overlay.remove(), 400);
      resolve({ name: finalName, race, cls });
    });

    paintRaces();
    paintRaceInfo();
    paintClasses();
    paintClassInfo();
    nameInput.focus();
  });
}

export function showAdvancedClassChoice(
  classId: ClassId,
): Promise<string> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "create-overlay";
    const cls = CLASSES[classId];

    const cards = cls.advanced
      .map(
        (a) => `
        <button class="cc-card cc-advanced-card" data-id="${a.id}">
          <div class="cc-card-name">${a.name}</div>
          <div class="cc-desc">${a.description}</div>
        </button>`,
      )
      .join("");

    overlay.innerHTML = `
      <div class="create-panel cc-advanced-panel">
        <h1>You Have Reached Mastery</h1>
        <p class="create-subtitle">Choose your advanced path</p>
        <div class="cc-grid cc-grid--two">${cards}</div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelectorAll<HTMLButtonElement>(".cc-advanced-card").forEach(
      (btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id || "";
          overlay.classList.add("fade-out");
          window.setTimeout(() => overlay.remove(), 400);
          resolve(id);
        });
      },
    );
  });
}
