import { Stroke, ShapeObject, TextObject, PageBackgroundConfig, TextBlock, ChecklistItem, KeepNote } from './ink';
import { RecognitionResult } from './ai';

export interface Page {
  id: string;
  notebookId: string;
  sectionId?: string;
  pageNumber: number;
  title: string;
  background: PageBackgroundConfig;
  strokes: Stroke[];
  shapes: ShapeObject[];
  textObjects: TextObject[];
  textBlocks?: TextBlock[];
  checklists?: ChecklistItem[];
  recognizedItems: RecognitionResult[];
  isPinned?: boolean;
  keepColor?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  thumbnail?: string;
}

export interface NotebookSection {
  id: string;
  title: string;
  color: string; // OneNote signature tab colors
  pages: Page[];
  activePageIndex: number;
  createdAt: number;
}

export interface Notebook {
  id: string;
  title: string;
  folderId?: string;
  subject: string;
  tags: string[];
  sections?: NotebookSection[];
  activeSectionId?: string;
  pages: Page[];
  activePageIndex: number;
  keepNotes?: KeepNote[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface AutosaveState {
  lastSavedAt: number;
  isDirty: boolean;
  isSaving: boolean;
  recoveryAvailable: boolean;
}
