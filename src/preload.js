const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readStore: () => ipcRenderer.sendSync('read-store'),
  writeStore: (data) => ipcRenderer.send('write-store', data)
});
