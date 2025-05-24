import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises'; // Using fs.promises for async operations
import { URL } from 'url'; // Import URL for pathToFileURL

// Define base data path
const dataPath = path.join(app.getPath('userData'), 'HeroForgeData');
const charactersPath = path.join(dataPath, 'characters');
const aiRacesPath = path.join(dataPath, 'aiRaces');
const aiClassesPath = path.join(dataPath, 'aiClasses');
const aiBackgroundsPath = path.join(dataPath, 'aiBackgrounds');
const aiBestiaryPath = path.join(dataPath, 'aiBestiary');

let mainWindow: BrowserWindow | null;

// Helper function to sanitize filenames
const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_\-\.]/gi, '_');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Corrected: assuming preload.js is in the same dir after tsc
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Open DevTools in development
  } else {
    // Ensure the path is correct for production
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  createWindow();
  await handleEnsureDataDirs(); // Ensure data directories are created on startup
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers

ipcMain.handle('get-app-path', (event, pathType: string) => {
  try {
    return app.getPath(pathType as any); // pathType can be any of the valid app.getPath names
  } catch (error) {
    console.error(`Error getting app path for ${pathType}:`, error);
    throw error;
  }
});

const handleEnsureDataDirs = async () => {
  try {
    await fs.mkdir(dataPath, { recursive: true });
    await fs.mkdir(charactersPath, { recursive: true });
    await fs.mkdir(aiRacesPath, { recursive: true });
    await fs.mkdir(aiClassesPath, { recursive: true });
    await fs.mkdir(aiBackgroundsPath, { recursive: true });
    await fs.mkdir(aiBestiaryPath, { recursive: true });
    console.log('Data directories ensured:', dataPath);
  } catch (error) {
    console.error('Error ensuring data directories:', error);
    throw error; // Re-throw to be caught by the invoker if necessary
  }
};
ipcMain.handle('ensure-data-dirs', handleEnsureDataDirs);


// --- Character Handlers ---
ipcMain.handle('save-character', async (event, characterData: any) => {
  if (!characterData || !characterData.id) {
    throw new Error('Invalid character data or missing ID');
  }
  const filename = path.join(charactersPath, `${sanitizeFilename(characterData.id)}.json`);
  try {
    const jsonContent = JSON.stringify(characterData, null, 2);
    await fs.writeFile(filename, jsonContent);
    console.log(`Character saved: ${filename}`);
  } catch (error) {
    console.error(`Error saving character ${characterData.id}:`, error);
    throw error;
  }
});

ipcMain.handle('load-characters', async () => {
  try {
    await fs.access(charactersPath); // Check if directory exists
    const files = await fs.readdir(charactersPath);
    const characters = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(charactersPath, file), 'utf-8');
        characters.push(JSON.parse(content));
      }
    }
    console.log(`Loaded ${characters.length} characters.`);
    return characters;
  } catch (error: any) {
    if (error.code === 'ENOENT') { // Directory doesn't exist
      console.log('Characters directory does not exist. Returning empty array.');
      return []; // Return empty array if directory doesn't exist
    }
    console.error('Error loading characters:', error);
    throw error;
  }
});

ipcMain.handle('delete-character', async (event, characterId: string) => {
  if (!characterId) {
    throw new Error('Invalid character ID');
  }
  const filename = path.join(charactersPath, `${sanitizeFilename(characterId)}.json`);
  try {
    await fs.unlink(filename);
    console.log(`Character deleted: ${filename}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`Character file not found for deletion: ${filename}`);
      return; // Or throw a specific error if preferred
    }
    console.error(`Error deleting character ${characterId}:`, error);
    throw error;
  }
});

// --- AI Race Handlers ---
ipcMain.handle('save-ai-race', async (event, raceData: any) => {
  if (!raceData || !raceData.name) {
    throw new Error('Invalid race data or missing name');
  }
  const filename = path.join(aiRacesPath, `${sanitizeFilename(raceData.name)}.json`);
  try {
    const jsonContent = JSON.stringify(raceData, null, 2);
    await fs.writeFile(filename, jsonContent);
    console.log(`AI Race saved: ${filename}`);
  } catch (error) {
    console.error(`Error saving AI Race ${raceData.name}:`, error);
    throw error;
  }
});

ipcMain.handle('load-ai-races', async () => {
  try {
    await fs.access(aiRacesPath);
    const files = await fs.readdir(aiRacesPath);
    const races = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(aiRacesPath, file), 'utf-8');
        races.push(JSON.parse(content));
      }
    }
    console.log(`Loaded ${races.length} AI races.`);
    return races;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('AI Races directory does not exist. Returning empty array.');
      return [];
    }
    console.error('Error loading AI races:', error);
    throw error;
  }
});

ipcMain.handle('delete-ai-race', async (event, raceName: string) => {
  if (!raceName) {
    throw new Error('Invalid race name');
  }
  const filename = path.join(aiRacesPath, `${sanitizeFilename(raceName)}.json`);
  try {
    await fs.unlink(filename);
    console.log(`AI Race deleted: ${filename}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`AI Race file not found for deletion: ${filename}`);
      return;
    }
    console.error(`Error deleting AI Race ${raceName}:`, error);
    throw error;
  }
});

// --- AI Class Handlers ---
ipcMain.handle('save-ai-class', async (event, classData: any) => {
  if (!classData || !classData.name) {
    throw new Error('Invalid class data or missing name');
  }
  const filename = path.join(aiClassesPath, `${sanitizeFilename(classData.name)}.json`);
  try {
    const jsonContent = JSON.stringify(classData, null, 2);
    await fs.writeFile(filename, jsonContent);
    console.log(`AI Class saved: ${filename}`);
  } catch (error) {
    console.error(`Error saving AI Class ${classData.name}:`, error);
    throw error;
  }
});

ipcMain.handle('load-ai-classes', async () => {
  try {
    await fs.access(aiClassesPath);
    const files = await fs.readdir(aiClassesPath);
    const classes = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(aiClassesPath, file), 'utf-8');
        classes.push(JSON.parse(content));
      }
    }
    console.log(`Loaded ${classes.length} AI classes.`);
    return classes;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('AI Classes directory does not exist. Returning empty array.');
      return [];
    }
    console.error('Error loading AI classes:', error);
    throw error;
  }
});

ipcMain.handle('delete-ai-class', async (event, className: string) => {
  if (!className) {
    throw new Error('Invalid class name');
  }
  const filename = path.join(aiClassesPath, `${sanitizeFilename(className)}.json`);
  try {
    await fs.unlink(filename);
    console.log(`AI Class deleted: ${filename}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`AI Class file not found for deletion: ${filename}`);
      return;
    }
    console.error(`Error deleting AI Class ${className}:`, error);
    throw error;
  }
});


// --- AI Background Handlers ---
ipcMain.handle('save-ai-background', async (event, backgroundData: any) => {
  if (!backgroundData || !backgroundData.name) {
    throw new Error('Invalid background data or missing name');
  }
  const filename = path.join(aiBackgroundsPath, `${sanitizeFilename(backgroundData.name)}.json`);
  try {
    const jsonContent = JSON.stringify(backgroundData, null, 2);
    await fs.writeFile(filename, jsonContent);
    console.log(`AI Background saved: ${filename}`);
  } catch (error) {
    console.error(`Error saving AI Background ${backgroundData.name}:`, error);
    throw error;
  }
});

ipcMain.handle('load-ai-backgrounds', async () => {
  try {
    await fs.access(aiBackgroundsPath);
    const files = await fs.readdir(aiBackgroundsPath);
    const backgrounds = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(aiBackgroundsPath, file), 'utf-8');
        backgrounds.push(JSON.parse(content));
      }
    }
    console.log(`Loaded ${backgrounds.length} AI backgrounds.`);
    return backgrounds;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('AI Backgrounds directory does not exist. Returning empty array.');
      return [];
    }
    console.error('Error loading AI backgrounds:', error);
    throw error;
  }
});

ipcMain.handle('delete-ai-background', async (event, backgroundName: string) => {
  if (!backgroundName) {
    throw new Error('Invalid background name');
  }
  const filename = path.join(aiBackgroundsPath, `${sanitizeFilename(backgroundName)}.json`);
  try {
    await fs.unlink(filename);
    console.log(`AI Background deleted: ${filename}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`AI Background file not found for deletion: ${filename}`);
      return;
    }
    console.error(`Error deleting AI Background ${backgroundName}:`, error);
    throw error;
  }
});

// --- AI Bestiary Handlers ---
ipcMain.handle('save-ai-bestiary-entry', async (event, entryData: any) => {
  if (!entryData || !entryData.id) {
    throw new Error('Invalid bestiary entry data or missing ID');
  }
  const filename = path.join(aiBestiaryPath, `${sanitizeFilename(entryData.id)}.json`);
  try {
    const jsonContent = JSON.stringify(entryData, null, 2);
    await fs.writeFile(filename, jsonContent);
    console.log(`AI Bestiary Entry saved: ${filename}`);
  } catch (error) {
    console.error(`Error saving AI Bestiary Entry ${entryData.id}:`, error);
    throw error;
  }
});

ipcMain.handle('load-ai-bestiary-entries', async () => {
  try {
    await fs.access(aiBestiaryPath);
    const files = await fs.readdir(aiBestiaryPath);
    const entries = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(path.join(aiBestiaryPath, file), 'utf-8');
        entries.push(JSON.parse(content));
      }
    }
    console.log(`Loaded ${entries.length} AI bestiary entries.`);
    return entries;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('AI Bestiary directory does not exist. Returning empty array.');
      return [];
    }
    console.error('Error loading AI bestiary entries:', error);
    throw error;
  }
});

ipcMain.handle('delete-ai-bestiary-entry', async (event, entryId: string) => {
  if (!entryId) {
    throw new Error('Invalid bestiary entry ID');
  }
  const filename = path.join(aiBestiaryPath, `${sanitizeFilename(entryId)}.json`);
  try {
    await fs.unlink(filename);
    console.log(`AI Bestiary Entry deleted: ${filename}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`AI Bestiary Entry file not found for deletion: ${filename}`);
      return;
    }
    console.error(`Error deleting AI Bestiary Entry ${entryId}:`, error);
    throw error;
  }
});
