import { contextBridge, ipcRenderer } from 'electron';

const electronApi = {
  getAppPath: (pathType: string) => ipcRenderer.invoke('get-app-path', pathType),
  ensureDataDirs: () => ipcRenderer.invoke('ensure-data-dirs'),
  saveCharacter: (data: any) => ipcRenderer.invoke('save-character', data),
  loadCharacters: () => ipcRenderer.invoke('load-characters'),
  deleteCharacter: (id: string) => ipcRenderer.invoke('delete-character', id),
  saveAiRace: (data: any) => ipcRenderer.invoke('save-ai-race', data),
  loadAiRaces: () => ipcRenderer.invoke('load-ai-races'),
  deleteAiRace: (name: string) => ipcRenderer.invoke('delete-ai-race', name),
  saveAiClass: (data: any) => ipcRenderer.invoke('save-ai-class', data),
  loadAiClasses: () => ipcRenderer.invoke('load-ai-classes'),
  deleteAiClass: (name: string) => ipcRenderer.invoke('delete-ai-class', name),
  saveAiBackground: (data: any) => ipcRenderer.invoke('save-ai-background', data),
  loadAiBackgrounds: () => ipcRenderer.invoke('load-ai-backgrounds'),
  deleteAiBackground: (name: string) => ipcRenderer.invoke('delete-ai-background', name),
  saveAiBestiaryEntry: (data: any) => ipcRenderer.invoke('save-ai-bestiary-entry', data),
  loadAiBestiaryEntries: () => ipcRenderer.invoke('load-ai-bestiary-entries'),
  deleteAiBestiaryEntry: (id: string) => ipcRenderer.invoke('delete-ai-bestiary-entry', id),
};

contextBridge.exposeInMainWorld('electronApi', electronApi);
