const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  userMessage: ({ message }) => ipcRenderer.invoke("user-message", { message }),
  sendTerminalReady: () => ipcRenderer.send("terminal-ready"),
  sendTerminalKeystroke: ({ key }) =>
    ipcRenderer.send("terminal-keystroke", { key }),
  handleAIResponse: ({ handler }) =>
    ipcRenderer.on("ai-response", (_, value) => {
      handler(value);
    }),
  handleTerminalData: ({ handler }) =>
    ipcRenderer.on("terminal-incomingData", (_, value) => {
      handler(value);
    }),
  // we can also expose variables, not just functions
});
