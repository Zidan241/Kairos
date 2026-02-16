/**
 * Simple JSON settings store persisted to userData/settings.json.
 * No dependencies — uses the same pattern as window-state.json.
 */
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from './logger.js';

import { DEFAULT_ACTIVITY_WATCH_URL } from '../shared/constants.js';

const SETTINGS_FILE = 'settings.json';

/** Default values for all app settings */
const DEFAULTS = {
  /** Start/stop ActivityWatch together with Kairos */
  manageActivityWatch: false,
  /** Custom path to the ActivityWatch executable (empty = auto-detect) */
  activityWatchPath: '',
  /** ActivityWatch server URL */
  activityWatchUrl: DEFAULT_ACTIVITY_WATCH_URL,
};

/** @typedef {typeof DEFAULTS} AppSettings */

class SettingsManager {
  constructor() {
    this.filePath = path.join(app.getPath('userData'), SETTINGS_FILE);
    this.settings = this.load();
  }

  /** Load settings from disk, filling in defaults for missing keys. */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const saved = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        return { ...DEFAULTS, ...saved };
      }
    } catch (error) {
      logger.error('Failed to load settings:', error);
    }
    return { ...DEFAULTS };
  }

  /** Persist current settings to disk. */
  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (error) {
      logger.error('Failed to save settings:', error);
    }
  }

  /** Get all settings. */
  getAll() {
    return { ...this.settings };
  }

  /** Get a single setting. */
  get(key) {
    return this.settings[key] ?? DEFAULTS[key];
  }

  /** Update one or more settings and persist. */
  set(partial) {
    this.settings = { ...this.settings, ...partial };
    this.save();
    return this.settings;
  }
}

const settingsManager = new SettingsManager();

export { settingsManager };
