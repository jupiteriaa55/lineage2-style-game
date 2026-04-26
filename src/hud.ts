import * as THREE from "three";
import type { Entity, FloatingTextRequest, Skill } from "./types";

export interface HUD {
  setPlayer(p: Entity): void;
  setTarget(t: Entity | null): void;
  log(text: string, kind?: "dmg" | "heal" | "xp" | "system"): void;
  spawnFloat(req: FloatingTextRequest, camera: THREE.Camera): void;
  updatePlayerStats(p: Entity, xp: number, xpToNext: number): void;
  updateTargetStats(t: Entity | null): void;
  updateSkills(skills: Skill[], playerMp: number): void;
  show(): void;
  hideLoading(): void;
  drawMinimap(player: Entity, enemies: Entity[]): void;
  onSkillClick(handler: (index: number) => void): void;
  onMenuAction(handler: (action: "resume" | "reset") => void): void;
}

export function createHUD(): HUD {
  const hudEl = document.getElementById("hud") as HTMLDivElement;
  const loadingEl = document.getElementById(
    "loading-screen",
  ) as HTMLDivElement;

  const playerNameEl = document.getElementById("player-name") as HTMLElement;
  const playerLevelEl = document.getElementById("player-level") as HTMLElement;
  const hpFill = document.getElementById("hp-fill") as HTMLElement;
  const hpText = document.getElementById("hp-text") as HTMLElement;
  const mpFill = document.getElementById("mp-fill") as HTMLElement;
  const mpText = document.getElementById("mp-text") as HTMLElement;
  const xpFill = document.getElementById("xp-fill") as HTMLElement;
  const xpText = document.getElementById("xp-text") as HTMLElement;

  const targetFrame = document.getElementById("target-frame") as HTMLElement;
  const targetName = document.getElementById("target-name") as HTMLElement;
  const targetLevel = document.getElementById("target-level") as HTMLElement;
  const targetHpFill = document.getElementById("target-hp-fill") as HTMLElement;
  const targetHpText = document.getElementById("target-hp-text") as HTMLElement;

  const combatLog = document.getElementById("combat-log") as HTMLElement;
  const hotbar = document.getElementById("hotbar") as HTMLElement;
  const minimap = document.getElementById("minimap") as HTMLCanvasElement;
  const minimapCtx = minimap.getContext("2d")!;

  const menuBtn = document.getElementById("menu-button") as HTMLButtonElement;
  const menuPanel = document.getElementById("menu-panel") as HTMLElement;

  let skillClickHandler: (index: number) => void = () => {};
  let menuActionHandler: (action: "resume" | "reset") => void = () => {};

  let skillSlots: HTMLElement[] = [];

  function buildSkillSlots(skills: Skill[]) {
    hotbar.innerHTML = "";
    skillSlots = skills.map((s, i) => {
      const slot = document.createElement("div");
      slot.className = "skill-slot";
      slot.innerHTML = `
        <div class="key">${s.hotkey}</div>
        <div class="icon">${s.icon}</div>
        <div class="label">${s.name.split(" ")[0]}</div>
        <div class="cooldown" style="display:none"></div>
      `;
      slot.title = `${s.name} - ${s.description}`;
      slot.addEventListener("click", () => skillClickHandler(i));
      slot.addEventListener("touchend", (e) => {
        e.preventDefault();
        skillClickHandler(i);
      });
      hotbar.appendChild(slot);
      return slot;
    });
  }

  menuBtn.addEventListener("click", () => {
    menuPanel.classList.toggle("hidden");
  });
  menuPanel.querySelectorAll<HTMLButtonElement>("button[data-action]").forEach(
    (btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action as "resume" | "reset";
        menuPanel.classList.add("hidden");
        menuActionHandler(action);
      });
    },
  );

  function setBar(fill: HTMLElement, text: HTMLElement, cur: number, max: number) {
    const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0;
    fill.style.transform = `scaleX(${pct})`;
    text.textContent = `${Math.round(cur)} / ${Math.round(max)}`;
  }

  let trackedPlayer: Entity | null = null;
  let trackedSkills: Skill[] | null = null;

  return {
    setPlayer(p) {
      trackedPlayer = p;
      playerNameEl.textContent = p.name;
      playerLevelEl.textContent = `Lv. ${p.level}`;
      setBar(hpFill, hpText, p.stats.hp, p.stats.hpMax);
      setBar(mpFill, mpText, p.stats.mp, p.stats.mpMax);
    },
    setTarget(t) {
      if (!t) {
        targetFrame.classList.add("hidden");
        return;
      }
      targetFrame.classList.remove("hidden");
      targetName.textContent = t.name;
      targetLevel.textContent = `Lv. ${t.level}`;
      setBar(targetHpFill, targetHpText, t.stats.hp, t.stats.hpMax);
    },
    log(text, kind = "system") {
      const line = document.createElement("div");
      line.className = `log-line ${kind}`;
      line.textContent = text;
      combatLog.prepend(line);
      while (combatLog.children.length > 12) {
        combatLog.removeChild(combatLog.lastChild!);
      }
    },
    spawnFloat(req, camera) {
      const v = req.worldPos.clone();
      v.y += 2.6;
      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      const el = document.createElement("div");
      el.className = `float-text ${req.type}`;
      el.textContent = req.text;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      document.body.appendChild(el);
      window.setTimeout(() => el.remove(), 1300);
    },
    updatePlayerStats(p, xp, xpToNext) {
      if (!trackedPlayer) trackedPlayer = p;
      playerLevelEl.textContent = `Lv. ${p.level}`;
      setBar(hpFill, hpText, p.stats.hp, p.stats.hpMax);
      setBar(mpFill, mpText, p.stats.mp, p.stats.mpMax);
      const pct = xpToNext > 0 ? xp / xpToNext : 0;
      xpFill.style.transform = `scaleX(${Math.max(0, Math.min(1, pct))})`;
      xpText.textContent = `${Math.round(pct * 100)}%`;
    },
    updateTargetStats(t) {
      if (!t || !t.alive) {
        targetFrame.classList.add("hidden");
        return;
      }
      targetFrame.classList.remove("hidden");
      targetName.textContent = t.name;
      targetLevel.textContent = `Lv. ${t.level}`;
      setBar(targetHpFill, targetHpText, t.stats.hp, t.stats.hpMax);
    },
    updateSkills(skills, playerMp) {
      if (!trackedSkills || trackedSkills.length !== skills.length) {
        trackedSkills = skills;
        buildSkillSlots(skills);
      }
      skills.forEach((s, i) => {
        const slot = skillSlots[i];
        if (!slot) return;
        const cd = slot.querySelector<HTMLElement>(".cooldown")!;
        const onCd = s.cooldownLeft > 0;
        const noMp = playerMp < s.manaCost;
        slot.classList.toggle("disabled", onCd || noMp);
        if (onCd) {
          cd.style.display = "flex";
          cd.textContent = s.cooldownLeft.toFixed(1);
        } else {
          cd.style.display = "none";
        }
      });
    },
    show() {
      hudEl.classList.remove("hidden");
    },
    hideLoading() {
      loadingEl.classList.add("fade-out");
      window.setTimeout(() => (loadingEl.style.display = "none"), 700);
    },
    drawMinimap(player, enemies) {
      const w = minimap.width;
      const h = minimap.height;
      if (minimap.clientWidth !== w || minimap.clientHeight !== h) {
        minimap.width = minimap.clientWidth;
        minimap.height = minimap.clientHeight;
      }
      const ww = minimap.width;
      const hh = minimap.height;
      minimapCtx.fillStyle = "#0a1404";
      minimapCtx.fillRect(0, 0, ww, hh);

      const range = 60;
      const px = player.position.x;
      const pz = player.position.z;
      const toMap = (x: number, z: number) => {
        const dx = x - px;
        const dz = z - pz;
        return [
          ww / 2 + (dx / range) * (ww / 2),
          hh / 2 + (dz / range) * (hh / 2),
        ];
      };

      minimapCtx.strokeStyle = "rgba(150,140,90,0.25)";
      minimapCtx.beginPath();
      minimapCtx.arc(ww / 2, hh / 2, ww / 2 - 2, 0, Math.PI * 2);
      minimapCtx.stroke();

      for (const e of enemies) {
        if (!e.alive) continue;
        const [mx, my] = toMap(e.position.x, e.position.z);
        if (mx < 0 || mx > ww || my < 0 || my > hh) continue;
        minimapCtx.fillStyle = "#e64a4a";
        minimapCtx.beginPath();
        minimapCtx.arc(mx, my, 2.5, 0, Math.PI * 2);
        minimapCtx.fill();
      }

      minimapCtx.fillStyle = "#ffe07a";
      minimapCtx.beginPath();
      minimapCtx.arc(ww / 2, hh / 2, 3.5, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = "#000";
      minimapCtx.lineWidth = 1;
      minimapCtx.stroke();
    },
    onSkillClick(handler) {
      skillClickHandler = handler;
    },
    onMenuAction(handler) {
      menuActionHandler = handler;
    },
  };
}
