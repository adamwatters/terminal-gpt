declare global {
  /**
   * We define all IPC APIs here to give devs auto-complete
   * use window.electron anywhere in app
   * Also note the capital "Window" here
   */
  interface Window {
    electronAPI: {
      userMessage: ({ message: string }) => {};
      sendTerminalKeystroke: ({ key: string }) => {};
      sendTerminalReady: () => {};
      attachHandler: ({ channel: string, handler: any }) => {};
    };
  }
}

export {};
