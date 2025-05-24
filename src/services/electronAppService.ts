import { CharacterData, Race, CharClass, Background, BestiaryEntry } from '../types'; // Adjust path as needed

interface ElectronApi {
  getAppPath: (pathType: string) => Promise<string>;
  ensureDataDirs: () => Promise<void>;
  saveCharacter: (data: CharacterData) => Promise<void>;
  loadCharacters: () => Promise<CharacterData[]>;
  deleteCharacter: (id: string) => Promise<void>;
  saveAiRace: (data: Race) => Promise<void>;
  loadAiRaces: () => Promise<Race[]>;
  deleteAiRace: (name: string) => Promise<void>;
  saveAiClass: (data: CharClass) => Promise<void>;
  loadAiClasses: () => Promise<CharClass[]>;
  deleteAiClass: (name: string) => Promise<void>;
  saveAiBackground: (data: Background) => Promise<void>;
  loadAiBackgrounds: () => Promise<Background[]>;
  deleteAiBackground: (name: string) => Promise<void>;
  saveAiBestiaryEntry: (data: BestiaryEntry) => Promise<void>;
  loadAiBestiaryEntries: () => Promise<BestiaryEntry[]>;
  deleteAiBestiaryEntry: (id: string) => Promise<void>;
}

// Type assertion for window.electronApi
const api = (window as any).electronApi as ElectronApi;

export const electronAppService = {
  getAppPath: (pathType: string): Promise<string> => api.getAppPath(pathType),
  ensureDataDirs: (): Promise<void> => api.ensureDataDirs(),

  saveCharacter: (data: CharacterData): Promise<void> => api.saveCharacter(data),
  loadCharacters: (): Promise<CharacterData[]> => api.loadCharacters(),
  deleteCharacter: (id: string): Promise<void> => api.deleteCharacter(id),

  saveAiRace: (data: Race): Promise<void> => api.saveAiRace(data),
  loadAiRaces: (): Promise<Race[]> => api.loadAiRaces(),
  deleteAiRace: (name: string): Promise<void> => api.deleteAiRace(name),

  saveAiClass: (data: CharClass): Promise<void> => api.saveAiClass(data),
  loadAiClasses: (): Promise<CharClass[]> => api.loadAiClasses(),
  deleteAiClass: (name: string): Promise<void> => api.deleteAiClass(name),

  saveAiBackground: (data: Background): Promise<void> => api.saveAiBackground(data),
  loadAiBackgrounds: (): Promise<Background[]> => api.loadAiBackgrounds(),
  deleteAiBackground: (name: string): Promise<void> => api.deleteAiBackground(name),

  saveAiBestiaryEntry: (data: BestiaryEntry): Promise<void> => api.saveAiBestiaryEntry(data),
  loadAiBestiaryEntries: (): Promise<BestiaryEntry[]> => api.loadAiBestiaryEntries(),
  deleteAiBestiaryEntry: (id: string): Promise<void> => api.deleteAiBestiaryEntry(id),
};

// Initial call to ensure data directories are ready when the app loads
if (api && typeof api.ensureDataDirs === 'function') {
  api.ensureDataDirs().catch(console.error);
} else {
  // This case might happen if the preload script hasn't run or electronApi isn't exposed,
  // which can be the case in a regular browser environment during development if not careful.
  console.warn('electronApi is not available. Data operations will not work. This is expected in a browser environment.');
}
