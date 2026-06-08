import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  shell,
  Notification,
} from "electron";
import path from "path";
import Store from "electron-store";

const store = new Store();

const WEB_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "http://localhost:3000";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#07090f",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
    },
    show: false,
    icon: path.join(__dirname, "../assets/icon.png"),
  });

  mainWindow.loadURL(WEB_URL);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "../assets/tray-icon.png");
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open JARVIS",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: "separator" },
    {
      label: "Voice Mode",
      click: () => {
        mainWindow?.webContents.send("jarvis:voice-activate");
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setToolTip("JARVIS OS");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function registerShortcuts() {
  // Global wake shortcut: Ctrl+Shift+J
  globalShortcut.register("CommandOrControl+Shift+J", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
      mainWindow.webContents.send("jarvis:voice-activate");
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// ─── IPC HANDLERS ────────────────────────────────────────────

ipcMain.handle("store:get", (_, key: string) => store.get(key));
ipcMain.handle("store:set", (_, key: string, value: unknown) => store.set(key, value));
ipcMain.handle("store:delete", (_, key: string) => store.delete(key));

ipcMain.handle("app:version", () => app.getVersion());
ipcMain.handle("app:platform", () => process.platform);

ipcMain.handle("notification:show", (_, { title, body }: { title: string; body: string }) => {
  new Notification({ title, body }).show();
});

ipcMain.on("window:minimize", () => mainWindow?.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow?.close());

// Shell commands (sandboxed)
ipcMain.handle("shell:run", async (_, command: string) => {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  const ALLOWED_COMMANDS = ["ls", "pwd", "echo", "date", "whoami"];
  const cmdName = command.trim().split(" ")[0];

  if (!ALLOWED_COMMANDS.includes(cmdName)) {
    return { success: false, error: "Command not allowed in desktop mode" };
  }

  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
    return { success: true, stdout, stderr };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
