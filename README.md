# Chronicle Elfs

A 3D top-down MMORPG-style browser game inspired by **Lineage 2**, built with [Three.js](https://threejs.org/) + [Vite](https://vitejs.dev/) + TypeScript.

It runs in any modern browser, installs as a **PWA** on iOS / Android / desktop, and ships an **Android APK** via [Capacitor](https://capacitorjs.com/) (built automatically by GitHub Actions on every push to `main`).

## Features

- Isometric / over-the-shoulder camera that follows your character.
- Click-to-move and click-to-attack controls (mouse and touch).
- Procedural terrain with trees, rocks and ruined pillars.
- L2-style HUD: HP / MP / XP bars, level, target frame, combat log, skill hotbar, minimap.
- 5 skills (Power Strike, Iron Will, Wind Slash, Fireball, Battle Roar) with cooldowns and mana cost.
- Three enemy types (Goblin Scout, Dire Wolf, Orc Warrior) with simple aggro / leash / patrol AI and respawn.
- XP and leveling with stat growth on level-up.
- Floating combat text, hit effects, projectiles for ranged skills.
- Day-time lighting with shadows.
- PWA: installable, offline-capable (service worker pre-caches the build).
- Android APK built from the same web codebase via Capacitor.

## Controls

| Action | Mouse / keyboard | Touch |
| --- | --- | --- |
| Move | Left-click on ground | Tap on ground |
| Target / attack | Left-click on enemy | Tap on enemy |
| Deselect target | Right-click / `Esc` | Open menu → Resume |
| Use skill 1–5 | `1`–`5` | Tap hotbar slot |
| Open menu | Click `≡` | Tap `≡` |

## Run locally

```bash
npm install
npm run dev   # http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

## PWA install

After building / deploying, open the site in:

- **iOS Safari**: Share → *Add to Home Screen*. The app launches in standalone mode (the only way to package a web app for iOS without an Apple developer account; full IPA builds require macOS + Xcode).
- **Android Chrome / desktop Chrome / Edge**: address-bar install icon, or browser menu → *Install app*.

The service worker pre-caches the bundle so the game keeps working offline after the first load.

## Android APK

A debug APK is built **automatically** by GitHub Actions on every push and is published as a workflow artifact:

1. Open the **Actions** tab on GitHub → pick the latest *Build* workflow run → download the **`chronicle-elfs-debug-apk`** artifact.
2. Transfer the `.apk` to your Android device and install it (you may need to allow *Install unknown apps* for your file manager / browser).

### Build the APK locally

Requires JDK 21 and the Android SDK (`ANDROID_HOME` / `ANDROID_SDK_ROOT` set, with platform `android-34` and build-tools installed).

```bash
npm install
npm run android:apk
# APK is at android/app/build/outputs/apk/debug/app-debug.apk
```

To open the project in Android Studio instead:

```bash
npm run android:open
```

### iOS

iOS builds (IPA) are not produced by CI because they require macOS + Xcode. Use the PWA install path on iOS, or run `npx cap add ios && npx cap open ios` on a Mac to open the project in Xcode.

## Project structure

```
src/
  main.ts        # Entry point, render loop, input
  world.ts       # Scene, terrain, props, lighting
  entities.ts    # Player and enemy meshes, stats, HP bars
  skills.ts      # Skill book and cooldown ticking
  combat.ts      # Damage / heal / projectile / effect handling
  ai.ts          # Enemy aggro / leash / patrol
  movement.ts    # Click-to-move with simple obstacle avoidance
  hud.ts         # DOM HUD: bars, log, minimap, hotbar, menu
  types.ts       # Shared TypeScript types
  style.css      # HUD styling
public/
  favicon.svg
  icons/         # PWA icons (192, 512)
android/         # Capacitor Android project (auto-generated)
.github/workflows/build.yml  # CI: web build, Android APK, GitHub Pages
```

## Disclaimer

This is an original fan-style prototype inspired by the look-and-feel of Lineage 2. It contains **no Lineage 2 assets, models, textures, names, or code**. All art is procedurally generated from primitives and gradient canvas textures.
