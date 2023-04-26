const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  userMessage: ({ message }) => ipcRenderer.invoke("user-message", { message }),
  sendTerminalReady: () => ipcRenderer.send("terminal-ready"),
  sendTerminalKeystroke: ({ key }) =>
    ipcRenderer.send("terminal-keystroke", { key }),
  attachHandler: ({ channel, handler }) =>
    ipcRenderer.on(channel, (_, value) => {
      handler(value);
    }),
  // we can also expose variables, not just functions
});
