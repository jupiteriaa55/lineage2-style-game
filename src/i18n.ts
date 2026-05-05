/**
 * Lightweight in-app localization. Strings are keyed by short ids; the
 * active locale is read from the `cdg.lang` localStorage key (default:
 * "ru"). Use `t(key, params?)` to resolve a string. Use `setLocale()` to
 * switch at runtime.
 */

export type Locale = "ru" | "en";

const KEY = "cdg.lang";

let locale: Locale = readLocale();

function readLocale(): Locale {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "ru" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return "ru";
}

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  locale = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
}

const STRINGS: Record<string, { ru: string; en: string }> = {
  // ---- Loading ----
  "load.settings": { ru: "Загрузка настроек", en: "Loading settings" },
  "load.hardware": { ru: "Определяем устройство", en: "Detecting hardware" },
  "load.profile": { ru: "Загрузка героя", en: "Loading hero profile" },
  "load.world": { ru: "Творим мир", en: "Forging the realm" },
  "load.cities": { ru: "Строим города и замок", en: "Carving cities and castle" },
  "load.mobs": { ru: "Призываем чудовищ", en: "Summoning monsters" },
  "load.bots": { ru: "Запускаем игроков", en: "Bringing players online" },
  "load.hero": { ru: "Готовим героя", en: "Preparing your hero" },
  "load.ready": { ru: "Готово", en: "Ready" },
  "load.title": { ru: "ХРОНИКИ ДЬЯВОЛЬСКИХ БОГОВ", en: "CHRONICLES OF DEVIL GODS" },
  "load.subtitle": { ru: "Загрузка мира…", en: "Forging the realm…" },

  // ---- Character creation ----
  "cc.title": { ru: "Создай героя", en: "Forge Your Hero" },
  "cc.subtitle": { ru: "Хроники дьявольских богов", en: "Chronicles of Devil Gods" },
  "cc.name": { ru: "Имя", en: "Name" },
  "cc.namePlaceholder": { ru: "Введите имя", en: "Enter your name" },
  "cc.chooseRace": { ru: "Выбери расу", en: "Choose Race" },
  "cc.chooseClass": { ru: "Выбери класс", en: "Choose Class" },
  "cc.advancedAt20": { ru: "Подкласс на Lv. 20:", en: "Advanced (Lv. 20):" },
  "cc.begin": { ru: "Начать приключение", en: "Begin Adventure" },
  "cc.advTitle": { ru: "Выбор подкласса", en: "Choose Advanced Class" },
  "cc.advBody": {
    ru: "Ты достиг 20 уровня. Выбери путь развития.",
    en: "You reached level 20. Choose your specialization.",
  },
  "cc.confirm": { ru: "Подтвердить", en: "Confirm" },

  // ---- Welcome / log ----
  "welcome.line1": {
    ru: "Добро пожаловать, {name} — {race} {cls}.",
    en: "Welcome, {name} the {race} {cls}.",
  },
  "welcome.controls": {
    ru: "Клик — двигаться. По NPC: золотой = торговец, синий = квест, оранжевый = тренер.",
    en: "Click to move. Click an NPC (gold = merchant, blue = quest, orange = trainer).",
  },
  "welcome.hotkeys": {
    ru: "Горячие клавиши: I сумка · C крафт · Q квесты · B стройка · 1-5 скиллы · S настройки.",
    en: "Hotkeys: I bag · C craft · Q quests · B build · 1-5 skills · S settings.",
  },
  "welcome.graphics": {
    ru: "Графика: {preset} (авто). Нажми S чтобы изменить.",
    en: "Graphics: {preset} (auto). Press S to change.",
  },
  "log.youDamage": { ru: "Получено {n} урона", en: "You take {n} damage" },
  "log.youHeal": { ru: "Восстановлено {n} HP", en: "You are healed for {n}" },
  "log.defeat": { ru: "Сражён {name} (+{xp} XP)", en: "Defeated {name} (+{xp} XP)" },
  "log.levelUp": { ru: "Уровень! Теперь Lv. {lvl}", en: "Level up! You are now Lv. {lvl}" },
  "log.died": { ru: "Тебя сразил {name}", en: "You were defeated by {name}" },
  "log.gold": { ru: "+{n} золота", en: "+{n} gold" },
  "log.questReady": { ru: "Квест готов: {name}", en: "Quest ready: {name}" },
  "log.itemPickup": { ru: "+{count} {item}", en: "+{count} {item}" },
  "log.villageUnlocked": {
    ru: "Стройка деревни открыта. Нажми B чтобы начать.",
    en: "Village Builder unlocked. Press B to start your village.",
  },
  "log.villageLocked": {
    ru: "Стройка деревни откроется на Lv.{lvl}",
    en: "Village builder unlocks at Lv.{lvl}",
  },
  "log.mastered": { ru: "Освоен подкласс {name}!", en: "Mastered {name}!" },
  "log.spiritCharge": { ru: "Дух заряжен на {sec}с", en: "Spirit charge for {sec}s" },
  "log.manaCharge": { ru: "Мана заряжена на {sec}с", en: "Mana charge for {sec}s" },
  "log.saved": { ru: "Игра сохранена.", en: "Game saved." },
  "log.bought": { ru: "Куплено: {item} за {gold} золота", en: "Bought {item} for {gold} gold" },
  "log.sold": { ru: "Продано: {item} за {gold} золота", en: "Sold {item} for {gold} gold" },
  "log.notEnoughGold": { ru: "Недостаточно золота", en: "Not enough gold" },
  "log.crafted": { ru: "Создано: {item}", en: "Crafted: {item}" },
  "log.craftFail": { ru: "Не хватает материалов", en: "Insufficient materials" },
  "log.lootboxOpened": {
    ru: "Лутбокс открыт: {item} ({rarity})",
    en: "Lootbox opened: {item} ({rarity})",
  },
  "log.questAccepted": { ru: "Квест принят: {name}", en: "Quest accepted: {name}" },
  "log.questCompleted": { ru: "Квест завершён: {name}", en: "Quest completed: {name}" },
  "log.siegeWave": {
    ru: "Волна осады появилась у Кроны Пятерых!",
    en: "A siege wave has spawned at the Crown of the Five!",
  },
  "log.castleCaptured": {
    ru: "Замок захвачен! Ежедневный налог: {gold} золота.",
    en: "Castle captured! Daily tax: {gold} gold.",
  },

  // ---- HUD ----
  "hud.gold": { ru: "Золото", en: "Gold" },
  "hud.spiritCharge": { ru: "Дух", en: "Spirit" },
  "hud.manaCharge": { ru: "Мана", en: "Mana" },
  "hud.castleTitle": { ru: "Корона Пятерых", en: "Crown of the Five" },
  "hud.castleGarrison": { ru: "Гарнизон Кроны", en: "Garrison of the Crown" },
  "hud.castleNextSiege": { ru: "Осада через: {time}", en: "Next siege: {time}" },

  // ---- Menu ----
  "menu.title": { ru: "Меню", en: "Menu" },
  "menu.resume": { ru: "Продолжить", en: "Resume" },
  "menu.save": { ru: "Сохранить", en: "Save Game" },
  "menu.reset": { ru: "Сбросить героя", en: "Reset Character" },
  "menu.hint": {
    ru: "Клик чтобы двигаться/атаковать. ПКМ — снять цель.",
    en: "Click to move/attack. Right click to deselect.",
  },

  // ---- Panels ----
  "panel.inventory": { ru: "Сумка", en: "Inventory" },
  "panel.crafting": { ru: "Крафт", en: "Crafting" },
  "panel.quests": { ru: "Квесты", en: "Quests" },
  "panel.build": { ru: "Стройка", en: "Build Village" },
  "panel.settings": { ru: "Настройки", en: "Settings" },
  "panel.shop": { ru: "Магазин", en: "Shop" },

  "inv.equipped": { ru: "Экипировка", en: "Equipped" },
  "inv.bag": { ru: "Предметы", en: "Bag" },
  "inv.stats": { ru: "Характеристики", en: "Stats" },
  "inv.equip": { ru: "Надеть", en: "Equip" },
  "inv.unequip": { ru: "Снять", en: "Unequip" },
  "inv.use": { ru: "Использовать", en: "Use" },
  "inv.empty": { ru: "пусто", en: "empty" },

  "shop.buy": { ru: "Купить", en: "Buy" },
  "shop.sell": { ru: "Продать", en: "Sell" },
  "shop.noStock": { ru: "Сейчас торговец ничего не предлагает.", en: "No items for sale right now." },

  "craft.recipes": { ru: "Рецепты", en: "Recipes" },
  "craft.materials": { ru: "Материалы", en: "Materials" },
  "craft.craft": { ru: "Создать", en: "Craft" },
  "craft.locked": { ru: "Требуется уровень {lvl}", en: "Requires Lv. {lvl}" },
  "craft.classLock": { ru: "Только для класса {cls}", en: "Class-locked: {cls}" },
  "craft.haveMats": { ru: "Материалы есть", en: "Materials ready" },
  "craft.needMats": { ru: "Не хватает материалов", en: "Missing materials" },

  "quest.available": { ru: "Доступные", en: "Available" },
  "quest.active": { ru: "Активные", en: "Active" },
  "quest.completed": { ru: "Завершено", en: "Completed" },
  "quest.accept": { ru: "Принять", en: "Accept" },
  "quest.turnIn": { ru: "Сдать", en: "Turn in" },
  "quest.talkTo": {
    ru: "Lv.{lvl} · Поговори с {npc} в {city}",
    en: "Lv.{lvl} · Talk to {npc} in {city}",
  },
  "quest.kill": { ru: "Убить {name}: {cur}/{tot}", en: "Kill {name}: {cur}/{tot}" },
  "quest.collect": {
    ru: "Собрать {name}: {cur}/{tot}",
    en: "Collect {name}: {cur}/{tot}",
  },
  "quest.reward": { ru: "Награда", en: "Reward" },

  "build.lockedHint": {
    ru: "Стройка деревни откроется на Lv.{lvl}.",
    en: "Village builder unlocks at Lv.{lvl}.",
  },
  "build.cost": { ru: "Стоимость", en: "Cost" },
  "build.placed": { ru: "Здание построено", en: "Building placed" },
  "build.cancel": { ru: "Отмена", en: "Cancel" },

  // ---- Settings panel ----
  "set.graphics": { ru: "Графика", en: "Graphics quality" },
  "set.graphicsHint": {
    ru: "Выше — красивее, ниже — быстрее. Смена плотности мира перезагружает сцену.",
    en: "Higher = prettier, lower = smoother. World density changes prompt a reload.",
  },
  "set.auto": {
    ru: "Авто-подбор при следующем запуске (по этому устройству)",
    en: "Auto-pick on next launch (based on this device)",
  },
  "set.warnReload": {
    ru: "Смена пресета перезагрузит мир для новой плотности и теней.",
    en: "Switching presets reloads the world for new density/shadows.",
  },
  "set.apply": { ru: "Применить", en: "Apply" },
  "set.upToDate": { ru: "Актуально", en: "Up to date" },
  "set.language": { ru: "Язык / Language", en: "Language / Язык" },
  "set.langRu": { ru: "Русский", en: "Russian" },
  "set.langEn": { ru: "Английский", en: "English" },
  "set.langChanged": { ru: "Язык изменён. Перезагрузка…", en: "Language changed. Reloading…" },

  "preset.low.desc": {
    ru: "Плавно на слабых телефонах. Без теней, ближний туман, меньше мобов.",
    en: "Smooth on weak phones. No shadows, low draw distance, fewer mobs.",
  },
  "preset.medium.desc": {
    ru: "Сбалансированно. Мягкие тени, средний туман, полный набор фич.",
    en: "Balanced. Soft shadows, medium fog, full feature set.",
  },
  "preset.high.desc": {
    ru: "Резкая картинка, полные тени, плотный мир. Для ноутбуков.",
    en: "Sharp pixel ratio, full shadows, dense world. Default for laptops.",
  },
  "preset.ultra.desc": {
    ru: "Максимум плотности и теней. Для ПК с дискретной видеокартой.",
    en: "Maximum density and shadow quality. Desktops with discrete GPU.",
  },

  // ---- Races ----
  "race.human": { ru: "Человек", en: "Human" },
  "race.elf": { ru: "Эльф", en: "High Elf" },
  "race.darkelf": { ru: "Тёмный эльф", en: "Shade Elf" },
  "race.dwarf": { ru: "Гном", en: "Dwarf" },
  "race.orc": { ru: "Орк", en: "Orc" },

  "race.human.desc": {
    ru: "Универсалы. Подойдут для любого пути воина или мага.",
    en: "Versatile and well-balanced. Adaptable to any path of combat or magic.",
  },
  "race.elf.desc": {
    ru: "Грация и связь с маной. Сильны в магии и стрельбе.",
    en: "Graceful, swift, attuned to mana. Strong in magic and ranged combat.",
  },
  "race.darkelf.desc": {
    ru: "Эльфы подземелий. Холодная точность и хладнокровие.",
    en: "Reclusive elves of the underdeeps. Deadly precision, cold resolve.",
  },
  "race.dwarf.desc": {
    ru: "Горный народ. Мастера-кузнецы и стойкие защитники.",
    en: "Hardy mountain folk. Master smiths, stout fighters, stalwart defenders.",
  },
  "race.orc.desc": {
    ru: "Дикие воины степей. В ближнем бою им нет равных.",
    en: "Savage and powerful warriors of the steppes. Few rivals at melee.",
  },

  // ---- Classes ----
  "class.warrior": { ru: "Воин", en: "Warrior" },
  "class.mage": { ru: "Маг", en: "Mage" },
  "class.rogue": { ru: "Разбойник", en: "Rogue" },
  "class.knight": { ru: "Рыцарь", en: "Knight" },
  "class.berserker": { ru: "Берсерк", en: "Berserker" },
  "class.archmage": { ru: "Архимаг", en: "Archmage" },
  "class.warlock": { ru: "Чернокнижник", en: "Warlock" },
  "class.shadowblade": { ru: "Клинок Теней", en: "Shadowblade" },
  "class.ranger": { ru: "Следопыт", en: "Ranger" },

  "class.warrior.desc": {
    ru: "Передовой боец. Высокий HP, защита, тяжёлые удары.",
    en: "Front-line melee combatant. High HP, strong defense, hits hard.",
  },
  "class.mage.desc": {
    ru: "Чародей с разрушительной магией. Хрупкий, но мощный.",
    en: "Caster of devastating spells. Fragile but powerful.",
  },
  "class.rogue.desc": {
    ru: "Скрытность и точность. Быстрые атаки, высокий критический урон.",
    en: "Stealth and precision. Fast strikes, high critical damage.",
  },
  "class.knight.desc": { ru: "Защитный воин. Больше брони и HP.", en: "Defensive warrior. Higher armor and HP." },
  "class.berserker.desc": { ru: "Агрессивный урон. Выше атака и скорость.", en: "Aggressive damage-dealer. Higher attack and speed." },
  "class.archmage.desc": { ru: "Мастер стихий. Мощные AoE-заклинания.", en: "Master of elements. Powerful AoE spells." },
  "class.warlock.desc": { ru: "Тёмная магия. Проклятия и порча.", en: "Dark magic. Curses and decay." },
  "class.shadowblade.desc": { ru: "Убийца с фланга. Огромный крит.", en: "Flanking assassin. Massive crits." },
  "class.ranger.desc": { ru: "Стрелок и следопыт. Контроль на дистанции.", en: "Marksman and tracker. Ranged control." },

  // ---- Skills ----
  "skill.power": { ru: "Удар силы", en: "Power Strike" },
  "skill.iron": { ru: "Воля железа", en: "Iron Will" },
  "skill.wind": { ru: "Шаг ветра", en: "Wind Step" },
  "skill.fireball": { ru: "Огненный шар", en: "Fireball" },
  "skill.battle": { ru: "Боевая ярость", en: "Battle Fury" },

  // ---- Common ----
  "common.cancel": { ru: "Отмена", en: "Cancel" },
  "common.close": { ru: "Закрыть", en: "Close" },
  "common.ok": { ru: "OK", en: "OK" },
  "common.lvl": { ru: "Ур.", en: "Lv." },

  // ---- Static UI ----
  "ui.adventurer": { ru: "Искатель", en: "Adventurer" },
  "ui.boot": { ru: "Загрузка", en: "Booting" },
  "ui.garrison": { ru: "Гарнизон", en: "Garrison" },
  "ui.btnInventory": { ru: "Сумка (I)", en: "Inventory (I)" },
  "ui.btnCrafting": { ru: "Крафт (C)", en: "Crafting (C)" },
  "ui.btnQuests": { ru: "Квесты (Q)", en: "Quests (Q)" },
  "ui.btnBuild": { ru: "Стройка (B)", en: "Build Village (B)" },
  "ui.btnSettings": { ru: "Настройки (S)", en: "Settings (S)" },
  "ui.menuButton": { ru: "Меню", en: "Menu" },
  "ui.hintLong": {
    ru: "Клик — двигаться/атаковать. ПКМ — снять цель.<br />1-5: скиллы · I: сумка · C: крафт · Q: квесты · B: стройка.",
    en: "Click to move/attack. Right click to deselect.<br />Hotkeys 1-5: skills · I: bag · C: craft · Q: quests · B: build.",
  },
};

export function t(key: string, params?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  let s = entry ? entry[locale] : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
