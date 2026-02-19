# Build & Distribution

## Key Points

### Server binary must be outside asar

`bun build --compile` creates a standalone binary. It can't be spawned from inside an asar archive, so `asarUnpack: ['dist/server']` is required in forge config. The server manager uses `.replace('app.asar', 'app.asar.unpacked')` to resolve the correct path at runtime.

### Dynamic import trick for dev-only code

`bun build --compile` bundles dynamic imports even behind `if` checks. To prevent it from pulling in Vite (and its deps like `@babel/preset-typescript`, `lightningcss`), the import path in `server/core/index.ts` uses a variable:

```js
const devModule = "../dev/vite-dev";
const { setupVite } = await import(devModule);
```

A string literal `import("../dev/vite-dev")` would be statically resolved and bundled.

### Bundle size

- Electron binary (Chromium + Node.js)
- Compiled server (Bun runtime embedded)
- Everything else

Could reduce by ~50MB by running server on Electron's Node.js instead of compiled Bun. Only blocker: `server/core/database.ts` uses `bun:sqlite` — would need `better-sqlite3` (native module, requires `@electron/rebuild`).

### Code signing is disabled

No "Developer ID Application" certificate available. Users right-click → Open on first launch. The fuses `EnableEmbeddedAsarIntegrityValidation` and `OnlyLoadAppFromAsar` are set to `false` — they require proper signing to work.

### Production vs dev server

- **Dev**: `bun run server/index.ts` (source, with Vite HMR middleware)
- **Production**: spawns `dist/server` compiled binary (self-contained, no Bun needed on user machine)
