let electron = require("electron");
// electron/preload.ts
electron.contextBridge.exposeInMainWorld("mangaAPI", {
	getManga: () => electron.ipcRenderer.invoke("manga:get-all"),
	saveManga: (manga) => electron.ipcRenderer.invoke("manga:save", manga),
	deleteManga: (id) => electron.ipcRenderer.invoke("manga:delete", id),
	getTags: () => electron.ipcRenderer.invoke("tags:get-all"),
	saveTag: (name) => electron.ipcRenderer.invoke("tags:save", name),
	deleteTag: (name) => electron.ipcRenderer.invoke("tags:delete", name),
	renameTag: (oldName, newName) => electron.ipcRenderer.invoke("tags:rename", oldName, newName)
});
