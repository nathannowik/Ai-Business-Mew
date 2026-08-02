import { app, BrowserWindow, shell } from "electron";
import * as path from "node:path";

/**
 * The desktop app is a thin, secure shell around the hosted web dashboard.
 * Clients download and install this; it opens their control panel and login.
 * All business logic and AI live in the cloud backend — the app never has
 * "control of the client's computer", only of their Mew dashboard.
 */

// Where the dashboard is served. Point this at your deployed web app in prod.
const APP_URL = process.env.MEW_APP_URL ?? "http://localhost:3000";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: "Mew AI",
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // Security hardening: no Node in the renderer, isolated context.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(APP_URL);

  // Open external links in the user's real browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
