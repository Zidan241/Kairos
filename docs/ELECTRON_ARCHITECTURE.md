# Kairos Electron Architecture

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  WindowManager · ServerManager · DatabaseManager            │
│  MenuManager · SettingsManager · ActivityWatchManager        │
└────────────────────────┬────────────────────────────────────┘
                         │ IPC (preload.js)
┌────────────────────────▼────────────────────────────────────┐
│              Renderer Process (React on Vite)               │
└─────────────────────────────────────────────────────────────┘
```

## Startup Flow

1. Initialize managers (Window, Database, ActivityWatch)
2. Start Bun server → health check → get port
3. Create window → load `localhost:PORT` (prod) or Vite dev server (dev)
4. Enable auto-updater (`updateElectronApp()`, production only)
5. Build native menu

## Settings

Stored as JSON in `app.getPath('userData')/settings.json`. All keys are automatically exposed via `settings-get`/`settings-set` IPC — no per-key wiring needed.

### Adding a New Setting

1. **Default** — add to `DEFAULTS` in `electron/settingsManager.js`
2. **Type** — add to `AppSettings` in `client/src/hooks/useElectron.ts`
3. **UI** — add control in `client/src/pages/Settings.tsx` that calls `electron.setSettings()`
4. **Use** — read via `settingsManager.get('key')` anywhere in main process

## Build & Distribution

Uses Electron Forge with Squirrel.Windows. Output in `out/`.

```bash
bun run dev:electron     # Dev: Vite + Electron
bun run make             # Package + create installer
bun run publish:electron # Build + publish to GitHub Releases
```

## Auto-Updates

One-liner `updateElectronApp()` in `main.js` — checks GitHub Releases via `update.electronjs.org`. Automatic, no UI needed.
