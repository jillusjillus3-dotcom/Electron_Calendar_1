const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    startDrag: (x, y) => {
        ipcRenderer.send("start-drag", { x, y });
    },

    drag: (x, y) => {
        ipcRenderer.send("drag", { x, y });
    },

    stopDrag: () => {
        ipcRenderer.send("stop-drag");
    }
});