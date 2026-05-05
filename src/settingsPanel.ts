import {
  QUALITY_PRESETS,
  saveSettings,
  type QualityPreset,
  type Settings,
} from "./settings";
import { getLocale, setLocale, t, type Locale } from "./i18n";

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

export function createSettingsPanel(
  initial: Settings,
  hooks: SettingsPanelHooks,
): SettingsPanel {
  let current: Settings = { ...initial };
  let pending: Settings = { ...initial };
  let pendingLang: Locale = getLocale();

  let root: HTMLDivElement | null = null;
  let presetRows: HTMLDivElement | null = null;
  let autoCheckbox: HTMLInputElement | null = null;
  let applyBtn: HTMLButtonElement | null = null;
  let warnEl: HTMLDivElement | null = null;
  let langRu: HTMLButtonElement | null = null;
  let langEn: HTMLButtonElement | null = null;

  function build() {
    root = document.createElement("div");
    root.className = "game-panel settings-panel hidden";
    root.id = "settings-panel";

    root.innerHTML = `
      <div class="panel-head">
        <h2>${t("panel.settings")}</h2>
        <button class="panel-close" id="settings-close">×</button>
      </div>
      <div class="panel-body settings-body">
        <div class="settings-section">
          <h3>${t("set.language")}</h3>
          <div class="lang-row">
            <button class="lang-btn" data-lang="ru" id="lang-ru">${t("set.langRu")}</button>
            <button class="lang-btn" data-lang="en" id="lang-en">${t("set.langEn")}</button>
          </div>
        </div>
        <div class="settings-section">
          <h3>${t("set.graphics")}</h3>
          <p class="settings-hint">${t("set.graphicsHint")}</p>
          <div class="preset-rows" id="preset-rows"></div>
        </div>
        <div class="settings-section settings-row">
          <label class="settings-toggle">
            <input type="checkbox" id="settings-auto" />
            ${t("set.auto")}
          </label>
        </div>
        <div class="settings-warn" id="settings-warn"></div>
        <div class="settings-actions">
          <button class="settings-apply" id="settings-apply">${t("set.apply")}</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    presetRows = root.querySelector<HTMLDivElement>("#preset-rows");
    autoCheckbox = root.querySelector<HTMLInputElement>("#settings-auto");
    applyBtn = root.querySelector<HTMLButtonElement>("#settings-apply");
    warnEl = root.querySelector<HTMLDivElement>("#settings-warn");
    langRu = root.querySelector<HTMLButtonElement>("#lang-ru");
    langEn = root.querySelector<HTMLButtonElement>("#lang-en");

    root.querySelector<HTMLButtonElement>("#settings-close")?.addEventListener(
      "click",
      () => hide(),
    );
    autoCheckbox!.addEventListener("change", () => {
      pending.auto = autoCheckbox!.checked;
      refreshDirty();
    });
    applyBtn!.addEventListener("click", () => apply());
    langRu!.addEventListener("click", () => {
      pendingLang = "ru";
      refreshLang();
      refreshDirty();
    });
    langEn!.addEventListener("click", () => {
      pendingLang = "en";
      refreshLang();
      refreshDirty();
    });

    refreshPresets();
    refreshLang();
    refreshDirty();
  }

  function refreshLang() {
    if (!langRu || !langEn) return;
    langRu.classList.toggle("active", pendingLang === "ru");
    langEn.classList.toggle("active", pendingLang === "en");
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
            q.shadows ? "тени" : "без теней"
          } · ${q.mobsPerBiome}/${getLocale() === "ru" ? "биом" : "biome"} · ${q.botCount} ${getLocale() === "ru" ? "ботов" : "bots"}</span>
        </div>
        <div class="preset-desc">${t(`preset.${id}.desc`)}</div>
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
    const langDirty = pendingLang !== getLocale();
    const dirty =
      pending.preset !== current.preset ||
      pending.auto !== current.auto ||
      langDirty;
    if (applyBtn) {
      applyBtn.disabled = !dirty;
      applyBtn.textContent = dirty ? t("set.apply") : t("set.upToDate");
    }
    if (warnEl) {
      const requiresReload = pending.preset !== current.preset || langDirty;
      warnEl.textContent = requiresReload ? t("set.warnReload") : "";
    }
  }

  function apply() {
    const langDirty = pendingLang !== getLocale();
    const wasDifferentPreset = pending.preset !== current.preset;
    current = { ...pending };
    saveSettings(current);
    if (langDirty) {
      setLocale(pendingLang);
      hooks.log(t("set.langChanged"), "system");
      setTimeout(() => window.location.reload(), 600);
      return;
    }
    hooks.onApply(current, wasDifferentPreset);
    if (wasDifferentPreset) {
      hooks.log(`Graphics: ${current.preset.toUpperCase()}`, "system");
    } else {
      hooks.log(t("log.saved"), "system");
    }
    refreshDirty();
  }

  function show() {
    if (!root) build();
    pending = { ...current };
    pendingLang = getLocale();
    refreshPresets();
    refreshLang();
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
