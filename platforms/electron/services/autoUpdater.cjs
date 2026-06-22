/* eslint-disable @typescript-eslint/no-require-imports */
'use strict';

/**
 * AutoUpdaterService — thin, defensive wrapper around electron-updater.
 *
 * Design goals:
 *  - No-op in development / when unpackaged (electron-updater only works on
 *    a built, installed app).
 *  - Lazy-require electron-updater so the app still boots if the dependency
 *    is not installed yet (it ships as an optionalDependency).
 *  - Differential downloads come for free from electron-updater when the
 *    `publish` provider is configured in package.json (GitHub Releases by
 *    default). A 700 MB app then updates by pulling only changed blocks.
 *  - Surface progress to the renderer over IPC ('updater:status'); fall back
 *    to a native dialog so updates work even with no UI listener.
 */
class AutoUpdaterService {
  /**
   * @param {object} opts
   * @param {() => (Electron.BrowserWindow|null)} opts.getWindow  Returns the
   *        current main window (may be null if none is open yet).
   * @param {boolean} [opts.isPackaged]  Override packaged detection (tests).
   * @param {number}  [opts.checkIntervalMs]  Periodic re-check cadence.
   */
  constructor({ getWindow, isPackaged, checkIntervalMs } = {}) {
    this.getWindow = typeof getWindow === 'function' ? getWindow : () => null;
    this.checkIntervalMs = checkIntervalMs || 1000 * 60 * 60 * 4; // every 4h
    this.autoUpdater = null;
    this.timer = null;

    const { app } = require('electron');
    this._packaged =
      typeof isPackaged === 'boolean' ? isPackaged : Boolean(app && app.isPackaged);
  }

  /** Begin update checks. Safe to call unconditionally — no-ops in dev. */
  start() {
    if (!this._packaged) {
      console.log('[UPDATER] Skipped: app is not packaged (dev mode).');
      return;
    }

    try {
      // Lazy require — keeps boot resilient if the dep isn't present.
      ({ autoUpdater: this.autoUpdater } = require('electron-updater'));
    } catch (err) {
      console.warn(
        '[UPDATER] electron-updater not installed; auto-update disabled.',
        err && err.message
      );
      return;
    }

    const au = this.autoUpdater;
    // We control when to download/install so the user is never surprised.
    au.autoDownload = true;
    au.autoInstallOnAppQuit = true;
    au.logger = console;

    au.on('checking-for-update', () => this._emit('checking'));
    au.on('update-available', (info) =>
      this._emit('available', { version: info && info.version })
    );
    au.on('update-not-available', () => this._emit('up-to-date'));
    au.on('download-progress', (p) =>
      this._emit('downloading', { percent: p && Math.round(p.percent) })
    );
    au.on('error', (err) =>
      this._emit('error', { message: err == null ? 'unknown' : String(err.message || err) })
    );
    au.on('update-downloaded', (info) => this._onDownloaded(info));

    this._check();
    this.timer = setInterval(() => this._check(), this.checkIntervalMs);
    if (this.timer.unref) this.timer.unref();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Manually trigger a check (e.g. from a "Check for updates" menu item). */
  checkNow() {
    if (this.autoUpdater) this._check();
  }

  _check() {
    try {
      this.autoUpdater.checkForUpdates();
    } catch (err) {
      console.warn('[UPDATER] checkForUpdates failed:', err && err.message);
    }
  }

  async _onDownloaded(info) {
    this._emit('ready', { version: info && info.version });

    const { dialog } = require('electron');
    const win = this.getWindow();
    const opts = {
      type: 'info',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `Luca OS ${info && info.version ? info.version + ' ' : ''}is ready to install.`,
      detail: 'Restart to apply the update. It will also install automatically next time you quit.',
    };

    const { response } = win
      ? await dialog.showMessageBox(win, opts)
      : await dialog.showMessageBox(opts);

    if (response === 0) {
      try {
        this.autoUpdater.quitAndInstall();
      } catch (err) {
        console.warn('[UPDATER] quitAndInstall failed:', err && err.message);
      }
    }
  }

  _emit(status, payload = {}) {
    console.log(`[UPDATER] ${status}`, payload);
    const win = this.getWindow();
    if (win && win.webContents && !win.webContents.isDestroyed()) {
      win.webContents.send('updater:status', { status, ...payload });
    }
  }
}

module.exports = AutoUpdaterService;
