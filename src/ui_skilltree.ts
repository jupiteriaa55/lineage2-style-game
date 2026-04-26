import { CLASSES, type ClassId } from "./classes";
import {
  SKILL_NODES,
  canLearn,
  getNodesForClass,
  type SkillNode,
} from "./skilltree";
import type { Entity } from "./types";

export interface SkillTreeUI {
  open(): void;
  close(): void;
  toggle(): void;
  refresh(): void;
}

export function createSkillTreeUI(
  player: Entity,
  onLearned: (node: SkillNode) => void,
): SkillTreeUI {
  const panel = document.getElementById("skilltree-panel")!;
  const grid = document.getElementById("st-grid")!;
  const info = document.getElementById("st-info")!;
  const pointsEl = document.getElementById("st-points")!;
  const closeBtn = document.getElementById("st-close")!;
  const skillsBtn = document.getElementById("skills-button")!;

  closeBtn.addEventListener("click", () => panel.classList.add("hidden"));
  panel.addEventListener("click", (e) => {
    if (e.target === panel) panel.classList.add("hidden");
  });

  function render() {
    if (!player.progress) return;
    const cls = CLASSES[player.progress.classId as ClassId];
    if (!cls) return;
    pointsEl.textContent = String(player.progress.skillPoints);
    if (player.progress.skillPoints > 0) {
      skillsBtn.classList.add("has-points");
    } else {
      skillsBtn.classList.remove("has-points");
    }

    grid.innerHTML = "";
    const nodes = getNodesForClass(cls.id);
    const byTier: Record<number, SkillNode[]> = { 1: [], 2: [], 3: [] };
    for (const n of nodes) byTier[n.tier].push(n);

    const tierTitles: Record<number, string> = {
      1: "Tier I — Basic",
      2: "Tier II — Adept",
      3: "Tier III — Master",
    };

    for (const tier of [1, 2, 3]) {
      const label = document.createElement("div");
      label.className = "st-tier-label";
      label.textContent = tierTitles[tier];
      grid.appendChild(label);

      for (const node of byTier[tier]) {
        const learned = player.progress.learned.has(node.skill.id);
        const check = canLearn(
          node,
          player.progress.learned,
          player.level,
          player.progress.skillPoints,
        );
        const div = document.createElement("div");
        div.className = "st-node";
        if (learned) div.classList.add("learned");
        else if (check.ok) div.classList.add("available");
        else div.classList.add("locked");
        div.innerHTML = `
          <div class="st-icon">${node.skill.icon}</div>
          <div class="st-meta">
            <div class="st-name">${node.skill.name}</div>
            <div class="st-sub">${learned ? "Learned" : check.ok ? "Click to learn" : check.reason || "Locked"}</div>
          </div>
        `;

        div.addEventListener("click", () => {
          showInfo(node, learned);
          if (!learned && canLearn(
            node,
            player.progress!.learned,
            player.level,
            player.progress!.skillPoints,
          ).ok) {
            player.progress!.learned.add(node.skill.id);
            player.progress!.skillPoints -= 1;
            onLearned(node);
            render();
          }
        });
        grid.appendChild(div);
      }
    }
  }

  function showInfo(node: SkillNode, learned: boolean) {
    const k = node.skill;
    const reqLines = node.parents.length
      ? `Requires: ${node.parents.map((p) => SKILL_NODES[p]?.skill.name ?? p).join(", ")}<br>`
      : "";
    info.innerHTML = `
      <div style="color:var(--gold-bright);font-weight:bold">${k.icon} ${k.name}</div>
      <div style="margin-top:4px">${k.description}</div>
      <div style="margin-top:6px;color:#948568;font-size:11px">
        ${reqLines}Min level: ${node.minLevel} · Cooldown: ${k.cooldown}s · MP: ${k.manaCost}
        ${learned ? '<br><span style="color:#9be05a">Already learned</span>' : ""}
      </div>
    `;
  }

  return {
    open() {
      render();
      panel.classList.remove("hidden");
    },
    close() {
      panel.classList.add("hidden");
    },
    toggle() {
      if (panel.classList.contains("hidden")) {
        render();
        panel.classList.remove("hidden");
      } else {
        panel.classList.add("hidden");
      }
    },
    refresh() {
      if (!panel.classList.contains("hidden")) render();
      pointsEl.textContent = String(player.progress?.skillPoints ?? 0);
      if ((player.progress?.skillPoints ?? 0) > 0) {
        skillsBtn.classList.add("has-points");
      } else {
        skillsBtn.classList.remove("has-points");
      }
    },
  };
}
