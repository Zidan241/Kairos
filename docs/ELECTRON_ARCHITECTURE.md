# Kairos Electron Architecture

## Architecture

```bash
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  WindowManager · ServerManager · DatabaseManager            │
│  MenuManager · SettingsManager                              │
└────────────────────────┬────────────────────────────────────┘
                         │ IPC (preload.js)
┌────────────────────────▼────────────────────────────────────┐
│              Renderer Process (React on Vite)               │
└─────────────────────────────────────────────────────────────┘
```

## Startup Flow

1. Initialize managers (Window, Database)
2. Start Bun server → health check → get port
3. Create window → load `dist/client/index.html` via `file://`
4. Check for updates (via GitHub API)
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
bun run make             # Package + create installer
bun run publish          # Build + publish to GitHub Releases
```

## Update Checking

Manual check via GitHub API (`/repos/Zidan241/Kairos/releases/latest`) on startup. Compares latest tag against `app.getVersion()`. Prompts user to download if a newer version is available.
