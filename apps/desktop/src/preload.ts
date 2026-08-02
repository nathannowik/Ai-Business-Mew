import { contextBridge } from "electron";

/**
 * Minimal, safe bridge exposed to the dashboard. Kept intentionally small —
 * we only surface app metadata, never filesystem or shell access.
 */
contextBridge.exposeInMainWorld("mew", {
  platform: process.platform,
  isDesktop: true,
});
