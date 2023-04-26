// ./public/electron.js
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const isDev = require("electron-is-dev");
const pty = require("node-pty");
const os = require("os");
const shell = os.platform() === "win32" ? "powershell.exe" : "zsh";
const dotenv = require("dotenv");
dotenv.config();

const createWindow = () => {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  var ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 60,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env,
  });

  const { AI } = require("./ai.js");
  const ai = AI(process.env.OPENAI_API_KEY, ptyProcess, win.webContents);

  // and load the index.html of the app.
  // win.loadFile("index.html");
  win.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );
  // Open the DevTools.
  if (isDev) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  ipcMain.on("terminal-ready", (_) => {
    setTimeout(() => {
      ai.start();
    }, 1000);
  });

  ptyProcess.onData(function (data) {
    win.webContents.send("terminal-incomingData", data);
  });

  // handle is two way communication - expects an async return
  ipcMain.handle("user-message", async (_, { message }) => {
    const response = await ai.prompt(message);
    return response;
  });

  // on is one way communication - no return
  ipcMain.on("terminal-keystroke", (_, { key }) => {
    ptyProcess.write(key);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // set up listeners here
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bars to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
