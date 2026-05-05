import {
  QUALITY_PRESETS,
  saveSettings,
  type QualityPreset,
  type Settings,
} from "./settings";

export interface SettingsPanelHooks {
  onApply(next: Settings, requiresReload: boolean): void;
  log(msg: string, kind?: "system" | "xp" | "heal" | "dmg"): void;
}

export interface SettingsPanel {
  toggle(): void;
  show(): void;
  hide(): void;
  isOpen(): boolean;
}

const PRESET_DESCRIPTIONS: Record<QualityPreset, string> = {
  low: "Smooth on weak phones. No shadows, low draw distance, fewer mobs.",
  medium: "Balanced. Soft shadows, medium fog, full feature set.",
  high: "Sharp pixel ratio, full shadows, dense world. Default for laptops.",
  ultra: "Maximum density and shadow quality. Desktops with discrete GPU.",
};

export function createSettingsPanel(
  initial: Settings,
  hooks: SettingsPanelHooks,
): SettingsPanel {
  let current: Settings = { ...initial };
  let pending: Settings = { ...initial };

  // Build the panel DOM lazily on first show.
  let root: HTMLDivElement | null = null;
  let presetRows: HTMLDivElement | null = null;
  let autoCheckbox: HTMLInputElement | null = null;
  let applyBtn: HTMLButtonElement | null = null;
  let warnEl: HTMLDivElement | null = null;

  function build() {
    root = document.createElement("div");
    root.className = "game-panel settings-panel hidden";
    root.id = "settings-panel";

    root.innerHTML = `
      <div class="panel-head">
        <h2>Settings</h2>
        <button class="panel-close" id="settings-close">×</button>
      </div>
      <div class="panel-body settings-body">
        <div class="settings-section">
          <h3>Graphics quality</h3>
          <p class="settings-hint">
            Higher = prettier, lower = smoother. Some changes (mob/world density)
            require a quick reload.
          </p>
          <div class="preset-rows" id="preset-rows"></div>
        </div>
        <div class="settings-section settings-row">
          <label class="settings-toggle">
            <input type="checkbox" id="settings-auto" />
            Auto-pick on next launch (based on this device)
          </label>
        </div>
        <div class="settings-warn" id="settings-warn"></div>
        <div class="settings-actions">
          <button class="settings-apply" id="settings-apply">Apply</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    presetRows = root.querySelector<HTMLDivElement>("#preset-rows");
    autoCheckbox = root.querySelector<HTMLInputElement>("#settings-auto");
    applyBtn = root.querySelector<HTMLButtonElement>("#settings-apply");
    warnEl = root.querySelector<HTMLDivElement>("#settings-warn");

    root.querySelector<HTMLButtonElement>("#settings-close")?.addEventListener(
      "click",
      () => hide(),
    );
    autoCheckbox!.addEventListener("change", () => {
      pending.auto = autoCheckbox!.checked;
      refreshDirty();
    });
    applyBtn!.addEventListener("click", () => apply());

    refreshPresets();
    refreshDirty();
  }

  function refreshPresets() {
    if (!presetRows) return;
    presetRows.innerHTML = "";
    (Object.keys(QUALITY_PRESETS) as QualityPreset[]).forEach((id) => {
      const q = QUALITY_PRESETS[id];
      const row = document.createElement("button");
      row.className = "preset-row";
      if (id === pending.preset) row.classList.add("active");
      row.dataset.preset = id;
      row.innerHTML = `
        <div class="preset-row-head">
          <span class="preset-name">${id.toUpperCase()}</span>
          <span class="preset-meta">PR ${q.pixelRatio.toFixed(2)} · ${
            q.shadows ? "shadows" : "no shadows"
          } · ${q.mobsPerBiome}/biome · ${q.botCount} bots</span>
        </div>
        <div class="preset-desc">${PRESET_DESCRIPTIONS[id]}</div>
      `;
      row.addEventListener("click", () => {
        pending.preset = id;
        refreshPresets();
        refreshDirty();
      });
      presetRows!.appendChild(row);
    });
  }

  function refreshDirty() {
    if (!autoCheckbox) return;
    autoCheckbox.checked = pending.auto;
    const dirty = pending.preset !== current.preset || pending.auto !== current.auto;
    if (applyBtn) {
      applyBtn.disabled = !dirty;
      applyBtn.textContent = dirty ? "Apply" : "Up to date";
    }
    if (warnEl) {
      const requiresReload = pending.preset !== current.preset;
      warnEl.textContent = requiresReload
        ? "Switching presets reloads the world for new density/shadows."
        : "";
    }
  }

  function apply() {
    const wasDifferentPreset = pending.preset !== current.preset;
    current = { ...pending };
    saveSettings(current);
    hooks.onApply(current, wasDifferentPreset);
    if (wasDifferentPreset) {
      hooks.log(
        `Graphics: ${current.preset.toUpperCase()} (reloading world…)`,
        "system",
      );
    } else {
      hooks.log(`Settings saved.`, "system");
    }
    refreshDirty();
  }

  function show() {
    if (!root) build();
    pending = { ...current };
    refreshPresets();
    refreshDirty();
    root!.classList.remove("hidden");
  }

  function hide() {
    root?.classList.add("hidden");
  }

  function toggle() {
    if (!root || root.classList.contains("hidden")) show();
    else hide();
  }

  function isOpen(): boolean {
    return !!root && !root.classList.contains("hidden");
  }

  return { toggle, show, hide, isOpen };
}
