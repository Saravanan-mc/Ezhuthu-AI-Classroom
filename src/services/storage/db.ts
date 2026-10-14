import { Notebook, Page, NotebookSection } from '../../types/notebook';
import { PageBackgroundConfig, PenSettings, KeepNote } from '../../types/ink';
import { LanguageMode } from '../../types/ai';

const DB_NAME = 'EzhuthuClassroomDB';
const DB_VERSION = 1;
const STORE_NOTEBOOKS = 'notebooks';
const STORE_SETTINGS = 'settings';
const STORE_RECOVERY = 'crash_recovery';

export interface AppSettings {
  geminiApiKey: string;
  languageMode: LanguageMode;
  useOfflineFallback: boolean;
  beginnerMode: boolean;
  theme: 'dark' | 'light';
  penSettings: PenSettings;
  tabletSensitivity: 'soft' | 'normal' | 'firm';
}

export const DEFAULT_PAGE_BACKGROUND: PageBackgroundConfig = {
  type: 'ruled',
  paperColor: '#ffffff',
  lineColor: '#e2e8f0',
  lineSpacing: 34,
  gridSize: 24,
  margin: 70,
  pageSize: 'a4',
};

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  languageMode: 'auto',
  useOfflineFallback: false,
  beginnerMode: false,
  theme: 'light',
  penSettings: {
    preset: 'normal',
    size: 3,
    color: '#0f172a',
    opacity: 1,
    smoothing: 0.35,
    pressureEnabled: true,
  },
  tabletSensitivity: 'normal',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NOTEBOOKS)) {
        db.createObjectStore(STORE_NOTEBOOKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_RECOVERY)) {
        db.createObjectStore(STORE_RECOVERY, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveNotebookToDB(notebook: Notebook): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
    const store = tx.objectStore(STORE_NOTEBOOKS);
    store.put(notebook);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllNotebooksFromDB(): Promise<Notebook[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTEBOOKS, 'readonly');
    const store = tx.objectStore(STORE_NOTEBOOKS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteNotebookFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NOTEBOOKS, 'readwrite');
    const store = tx.objectStore(STORE_NOTEBOOKS);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Crash recovery snapshot saved continuously
 */
export async function saveCrashRecoverySnapshot(page: Page): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECOVERY, 'readwrite');
    const store = tx.objectStore(STORE_RECOVERY);
    store.put({ id: 'active_recovery_page', page, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCrashRecoverySnapshot(): Promise<{ page: Page; savedAt: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECOVERY, 'readonly');
      const store = tx.objectStore(STORE_RECOVERY);
      const req = store.get('active_recovery_page');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearCrashRecoverySnapshot(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_RECOVERY, 'readwrite');
    tx.objectStore(STORE_RECOVERY).delete('active_recovery_page');
  } catch (e) {
    console.error('Failed to clear recovery:', e);
  }
}

export function loadSettingsFromStorage(): AppSettings {
  try {
    const saved = localStorage.getItem('ezhuthu_classroom_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettingsToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem('ezhuthu_classroom_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function createInitialSampleNotebook(): Notebook {
  const nbId = 'nb_' + Date.now();
  const sec1Id = 'sec_math';
  const sec2Id = 'sec_ideas';

  const samplePage1: Page = {
    id: 'page_math_1',
    notebookId: nbId,
    sectionId: sec1Id,
    pageNumber: 1,
    title: 'Algebra & Calculus Notes',
    background: {
      ...DEFAULT_PAGE_BACKGROUND,
      type: 'ruled',
    },
    strokes: [],
    shapes: [],
    textObjects: [],
    textBlocks: [
      {
        id: 'tb_intro',
        text: '✏️ Use your pen tablet or stylus: write lines, math, or words!',
        x: 80,
        y: 80,
        fontSize: 18,
        color: '#2563eb',
        fontWeight: 'bold',
        timestamp: Date.now(),
      },
    ],
    checklists: [
      { id: 'chk_1', text: 'Try Nebo live conversion bar', completed: false, x: 80, y: 130, timestamp: Date.now() },
      { id: 'chk_2', text: 'Write 2x + 5 = 15 or 12 * 8 =', completed: false, x: 80, y: 165, timestamp: Date.now() },
    ],
    recognizedItems: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const samplePage2: Page = {
    id: 'page_ideas_1',
    notebookId: nbId,
    sectionId: sec2Id,
    pageNumber: 1,
    title: 'Project Ideas & Meeting',
    background: {
      ...DEFAULT_PAGE_BACKGROUND,
      type: 'grid',
    },
    strokes: [],
    shapes: [],
    textObjects: [],
    textBlocks: [],
    checklists: [],
    recognizedItems: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sections: NotebookSection[] = [
    {
      id: sec1Id,
      title: 'Math & Formulas',
      color: '#8b5cf6', // Purple OneNote tab
      pages: [samplePage1],
      activePageIndex: 0,
      createdAt: Date.now(),
    },
    {
      id: sec2Id,
      title: 'Ideas & Sketches',
      color: '#06b6d4', // Teal OneNote tab
      pages: [samplePage2],
      activePageIndex: 0,
      createdAt: Date.now(),
    },
    {
      id: 'sec_todo',
      title: 'Action Items',
      color: '#3b82f6', // Blue OneNote tab
      pages: [],
      activePageIndex: 0,
      createdAt: Date.now(),
    },
  ];

  const initialKeepNotes: KeepNote[] = [
    {
      id: 'keep_1',
      title: '📌 Welcome to Nebo + OneNote + Keep',
      content: 'Write anywhere with your pen tablet. Handwriting is recognized live line-by-line!',
      color: '#fee2e2',
      isPinned: true,
      tags: ['guide', 'notes'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'keep_2',
      title: '🎯 Daily Goals',
      content: '',
      color: '#dcfce7',
      isPinned: true,
      tags: ['todo'],
      checklists: [
        { id: 'c1', text: 'Test pen tablet pressure sensitivity', completed: true },
        { id: 'c2', text: 'Use Nebo scratch-out scribble gesture to delete ink', completed: false },
        { id: 'c3', text: 'Switch between OneNote Canvas & Keep Board', completed: false },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'keep_3',
      title: '📐 Math Equations',
      content: 'Write: 25 * 4 = or 3x + 10 = 40. The live preview will calculate solutions on the fly!',
      color: '#fef3c7',
      isPinned: false,
      tags: ['math'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  return {
    id: nbId,
    title: '📓 Master Notebook',
    subject: 'Notes & Workspace',
    tags: ['Nebo', 'OneNote', 'GoogleKeep', 'Math'],
    sections,
    activeSectionId: sec1Id,
    pages: [samplePage1, samplePage2],
    activePageIndex: 0,
    keepNotes: initialKeepNotes,
    isFavorite: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
