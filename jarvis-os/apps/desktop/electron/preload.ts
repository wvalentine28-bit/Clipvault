import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("jarvis", {
  // Store
  store: {
    get: (key: string) => ipcRenderer.invoke("store:get", key),
    set: (key: string, value: unknown) => ipcRenderer.invoke("store:set", key, value),
    delete: (key: string) => ipcRenderer.invoke("store:delete", key),
  },

  // App info
  app: {
    version: () => ipcRenderer.invoke("app:version"),
    platform: () => ipcRenderer.invoke("app:platform"),
  },

  // Notifications
  notify: (title: string, body: string) =>
    ipcRenderer.invoke("notification:show", { title, body }),

  // Window controls
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  },

  // Shell
  shell: {
    run: (command: string) => ipcRenderer.invoke("shell:run", command),
  },

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
});

declare global {
  interface Window {
    jarvis: {
      store: {
        get: (key: string) => Promise<unknown>;
        set: (key: string, value: unknown) => Promise<void>;
        delete: (key: string) => Promise<void>;
      };
      app: {
        version: () => Promise<string>;
        platform: () => Promise<string>;
      };
      notify: (title: string, body: string) => Promise<void>;
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
      };
      shell: {
        run: (command: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; error?: string }>;
      };
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}
