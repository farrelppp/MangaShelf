
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('mangaAPI', {
  getManga: () => ipcRenderer.invoke('manga:get-all'),
  saveManga: (manga: {
    id?: number
    title: string
    url: string
    cover: string
    tags: string[]
    status: string
  }) => ipcRenderer.invoke('manga:save', manga),
  deleteManga: (id: number) =>
    ipcRenderer.invoke('manga:delete', id),

  getTags: () => ipcRenderer.invoke('tags:get-all'),
  saveTag: (name: string) =>
    ipcRenderer.invoke('tags:save', name),
  deleteTag: (name: string) =>
    ipcRenderer.invoke('tags:delete', name),
  renameTag: (oldName: string, newName: string) =>
    ipcRenderer.invoke('tags:rename', oldName, newName),

})
