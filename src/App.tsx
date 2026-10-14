import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Stroke,
  ShapeObject,
  ToolType,
  PenPreset,
  EraserMode,
  ShapeType,
  PageBackgroundConfig,
  AppMode,
  TextBlock,
  ChecklistItem,
  KeepNote,
} from './types/ink';
import { RecognitionResult, LanguageMode } from './types/ai';
import { Notebook, Page, NotebookSection } from './types/notebook';
import {
  AppSettings,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  createInitialSampleNotebook,
  getAllNotebooksFromDB,
  saveNotebookToDB,
  saveCrashRecoverySnapshot,
  getCrashRecoverySnapshot,
  clearCrashRecoverySnapshot,
} from './services/storage/db';
import { recognitionEngine, renderStrokesToImage } from './services/ai/recognitionEngine';
import { TopToolbar } from './components/toolbar/TopToolbar';
import { ColorSizePicker } from './components/toolbar/ColorSizePicker';
import { NoteCanvas } from './components/canvas/NoteCanvas';
import { SectionTabBar, ONENOTE_TAB_COLORS } from './components/onenote/SectionTabBar';
import { PageListSidebar } from './components/onenote/PageListSidebar';
import { KeepBoardView } from './components/keep/KeepBoardView';
import { SideBySidePanel } from './components/sidebyside/SideBySidePanel';
import { SettingsModal } from './components/modals/SettingsModal';
import { PageBackgroundModal } from './components/modals/PageBackgroundModal';
import { ExportModal } from './components/modals/ExportModal';
import { NotebookDrawer } from './components/modals/NotebookDrawer';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { computeBoundingBox } from './engine/strokeEngine';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface HistoryState {
  strokes: Stroke[];
  shapes: ShapeObject[];
  textBlocks?: TextBlock[];
  checklists?: ChecklistItem[];
}

export const App: React.FC = () => {
  // Settings & Theme
  const [settings, setSettings] = useState<AppSettings>(loadSettingsFromStorage());

  // Notebook State
  const [notebook, setNotebook] = useState<Notebook>(createInitialSampleNotebook());
  const [activeSectionId, setActiveSectionId] = useState<string>('sec_math');
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Tools & Pen
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [penSettings, setPenSettings] = useState(settings.penSettings);
  const [eraserMode, setEraserMode] = useState<EraserMode>('stroke');
  const [languageMode, setLanguageMode] = useState<LanguageMode>(settings.languageMode);
  const [currentShapeType] = useState<ShapeType>('rectangle');
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);

  // Canvas View & Modes
  const [zoom, setZoom] = useState<number>(1.0);
  const [appMode, setAppMode] = useState<AppMode>('note');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);

  // Recognition & Side-by-Side
  const [sideBySideResult, setSideBySideResult] = useState<RecognitionResult | null>(null);
  const [cropImageUrl, setCropImageUrl] = useState<string | undefined>(undefined);
  const [isSideBySideOpen, setIsSideBySideOpen] = useState<boolean>(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Autosave & Crash Recovery
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [recoverySnapshot, setRecoverySnapshot] = useState<Page | null>(null);

  // Current Section & Pages resolution
  const sections: NotebookSection[] = notebook.sections && notebook.sections.length > 0
    ? notebook.sections
    : [
        {
          id: 'sec_default',
          title: 'Notes',
          color: ONENOTE_TAB_COLORS[0],
          pages: notebook.pages,
          activePageIndex: 0,
          createdAt: Date.now(),
        },
      ];

  const currentSection = sections.find((s) => s.id === activeSectionId) || sections[0];
  const currentSectionPages = currentSection.pages.length > 0 ? currentSection.pages : notebook.pages;
  const currentPage = currentSectionPages[activePageIndex] || currentSectionPages[0] || notebook.pages[0];

  // Apply Theme attribute to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Load from IndexedDB on startup
  useEffect(() => {
    async function initDB() {
      try {
        const storedNotebooks = await getAllNotebooksFromDB();
        if (storedNotebooks && storedNotebooks.length > 0) {
          const nb = storedNotebooks[0];
          setNotebook(nb);
          if (nb.sections && nb.sections.length > 0) {
            const secId = nb.activeSectionId || nb.sections[0].id;
            setActiveSectionId(secId);
            const sec = nb.sections.find((s) => s.id === secId) || nb.sections[0];
            setActivePageIndex(sec.activePageIndex || 0);
          } else {
            setActivePageIndex(nb.activePageIndex || 0);
          }
        } else {
          const initial = createInitialSampleNotebook();
          await saveNotebookToDB(initial);
          setNotebook(initial);
          if (initial.sections && initial.sections.length > 0) {
            setActiveSectionId(initial.sections[0].id);
          }
        }

        // Check crash recovery
        const recovery = await getCrashRecoverySnapshot();
        if (recovery && recovery.page && recovery.page.strokes.length > 0) {
          setRecoverySnapshot(recovery.page);
        }
      } catch (e) {
        console.warn('Database initialization warning:', e);
      }
    }
    initDB();
  }, []);

  // Continuous Autosave & Crash Safe Snapshot
  const autosaveTimerRef = useRef<any>(null);
  useEffect(() => {
    if (!currentPage) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveNotebookToDB({ ...notebook, activeSectionId, activePageIndex });
        await saveCrashRecoverySnapshot(currentPage);
      } finally {
        setIsSaving(false);
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [notebook, activeSectionId, activePageIndex, currentPage]);

  // Helper to update current page content
  const updateCurrentPage = useCallback(
    (pageUpdates: Partial<Page>) => {
      const updatedPage: Page = {
        ...currentPage,
        ...pageUpdates,
        updatedAt: Date.now(),
      };

      if (notebook.sections && notebook.sections.length > 0) {
        const updatedSections = notebook.sections.map((sec) => {
          if (sec.id !== currentSection.id) return sec;
          const updatedPages = [...sec.pages];
          updatedPages[activePageIndex] = updatedPage;
          return { ...sec, pages: updatedPages };
        });

        // Also update notebook.pages
        const updatedAllPages = [...notebook.pages];
        const globalIdx = updatedAllPages.findIndex((p) => p.id === currentPage.id);
        if (globalIdx !== -1) {
          updatedAllPages[globalIdx] = updatedPage;
        }

        setNotebook((prev) => ({
          ...prev,
          sections: updatedSections,
          pages: updatedAllPages,
        }));
      } else {
        const updatedPages = [...notebook.pages];
        updatedPages[activePageIndex] = updatedPage;
        setNotebook((prev) => ({ ...prev, pages: updatedPages }));
      }
    },
    [currentPage, currentSection, activePageIndex, notebook]
  );

  // Push to Undo Stack
  const pushUndoState = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-30),
      {
        strokes: currentPage.strokes,
        shapes: currentPage.shapes,
        textBlocks: currentPage.textBlocks,
        checklists: currentPage.checklists,
      },
    ]);
    setRedoStack([]);
  }, [currentPage]);

  // Strokes Change
  const handleStrokesChange = useCallback(
    (newStrokes: Stroke[]) => {
      pushUndoState();
      updateCurrentPage({ strokes: newStrokes });
    },
    [pushUndoState, updateCurrentPage]
  );

  // Shapes Change
  const handleShapesChange = useCallback(
    (newShapes: ShapeObject[]) => {
      pushUndoState();
      updateCurrentPage({ shapes: newShapes });
    },
    [pushUndoState, updateCurrentPage]
  );

  // TextBlocks Change
  const handleTextBlocksChange = useCallback(
    (newBlocks: TextBlock[]) => {
      pushUndoState();
      updateCurrentPage({ textBlocks: newBlocks });
    },
    [pushUndoState, updateCurrentPage]
  );

  // Checklists Change
  const handleChecklistsChange = useCallback(
    (newChecklists: ChecklistItem[]) => {
      pushUndoState();
      updateCurrentPage({ checklists: newChecklists });
    },
    [pushUndoState, updateCurrentPage]
  );

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [
      ...prev,
      {
        strokes: currentPage.strokes,
        shapes: currentPage.shapes,
        textBlocks: currentPage.textBlocks,
        checklists: currentPage.checklists,
      },
    ]);
    setUndoStack((prev) => prev.slice(0, -1));

    updateCurrentPage({
      strokes: previous.strokes,
      shapes: previous.shapes,
      textBlocks: previous.textBlocks,
      checklists: previous.checklists,
    });
  }, [undoStack, currentPage, updateCurrentPage]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [
      ...prev,
      {
        strokes: currentPage.strokes,
        shapes: currentPage.shapes,
        textBlocks: currentPage.textBlocks,
        checklists: currentPage.checklists,
      },
    ]);
    setRedoStack((prev) => prev.slice(0, -1));

    updateCurrentPage({
      strokes: next.strokes,
      shapes: next.shapes,
      textBlocks: next.textBlocks,
      checklists: next.checklists,
    });
  }, [redoStack, currentPage, updateCurrentPage]);

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+K, Ctrl+A, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Search shortcut always accessible
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // Do not hijack typing inside text blocks or inputs!
      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNotebookToDB(notebook);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedStrokeIds(currentPage.strokes.map((s) => s.id));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedStrokeIds.length > 0) {
          e.preventDefault();
          pushUndoState();
          const remaining = currentPage.strokes.filter((s) => !selectedStrokeIds.includes(s.id));
          updateCurrentPage({ strokes: remaining });
          setSelectedStrokeIds([]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, notebook, selectedStrokeIds, currentPage, pushUndoState, updateCurrentPage]);

  // Handwriting → Text Recognition Conversion (Nebo & Side-by-Side verification)
  const handleConvertStrokes = async (strokesToConvert?: Stroke[]) => {
    const targetStrokes =
      strokesToConvert && strokesToConvert.length > 0
        ? strokesToConvert
        : selectedStrokeIds.length > 0
        ? currentPage.strokes.filter((s) => selectedStrokeIds.includes(s.id))
        : currentPage.strokes;

    if (!targetStrokes || targetStrokes.length === 0) {
      alert('Please write something with your pen tablet first to convert!');
      return;
    }

    try {
      const { dataUrl } = renderStrokesToImage(targetStrokes);
      setCropImageUrl(dataUrl);

      const result = await recognitionEngine.recognizeStrokes(targetStrokes, {
        languageMode,
        apiKey: settings.geminiApiKey,
        useOfflineFallback: settings.useOfflineFallback,
        detectMath: languageMode === 'math',
      });

      setSideBySideResult(result);
      setIsSideBySideOpen(true);
    } catch (err: any) {
      alert(`Recognition notice: ${err.message || 'Error processing handwriting'}`);
    }
  };

  // Force Full Text: converts all handwriting on the current page directly into clean typed text blocks
  const handleForceFullText = async () => {
    const targetStrokes = currentPage.strokes;
    if (!targetStrokes || targetStrokes.length === 0) {
      alert('Please write something with your pen tablet first to convert full text!');
      return;
    }

    try {
      const result = await recognitionEngine.recognizeStrokes(targetStrokes, {
        languageMode,
        apiKey: settings.geminiApiKey,
        useOfflineFallback: settings.useOfflineFallback,
        detectMath: languageMode === 'math',
      });

      if (result && result.rawText && result.rawText.trim()) {
        const fullBbox = computeBoundingBox(targetStrokes.flatMap((s) => s.points), 8);
        const textToUse = result.mathSolution
          ? `${result.rawText.trim()} => ${result.mathSolution.result}`
          : result.rawText.trim();

        const newBlock: TextBlock = {
          id: 'tb_' + Date.now(),
          text: textToUse,
          x: Math.max(16, fullBbox.minX),
          y: Math.max(16, fullBbox.minY),
          fontSize: 18,
          color: penSettings.color,
          isMath: !!result.mathSolution,
          timestamp: Date.now(),
        };

        handleStrokesChange([]);
        handleTextBlocksChange([...(currentPage.textBlocks || []), newBlock]);
      }
    } catch (err: any) {
      alert(`Full text conversion notice: ${err.message || 'Error converting full text'}`);
    }
  };

  // Section Management
  const handleSelectSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setActivePageIndex(0);
  };

  const handleAddSection = (title: string, color: string) => {
    const newPageId = 'page_' + Date.now();
    const newSecId = 'sec_' + Date.now();

    const newPage: Page = {
      id: newPageId,
      notebookId: notebook.id,
      sectionId: newSecId,
      pageNumber: 1,
      title: 'New Page',
      background: { ...currentPage.background },
      strokes: [],
      shapes: [],
      textObjects: [],
      textBlocks: [],
      checklists: [],
      recognizedItems: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newSection: NotebookSection = {
      id: newSecId,
      title,
      color,
      pages: [newPage],
      activePageIndex: 0,
      createdAt: Date.now(),
    };

    const updatedSections = [...sections, newSection];
    setNotebook((prev) => ({
      ...prev,
      sections: updatedSections,
      activeSectionId: newSecId,
      pages: [...prev.pages, newPage],
    }));
    setActiveSectionId(newSecId);
    setActivePageIndex(0);
  };

  const handleRenameSection = (sectionId: string, newTitle: string) => {
    const updatedSections = sections.map((s) => (s.id === sectionId ? { ...s, title: newTitle } : s));
    setNotebook((prev) => ({ ...prev, sections: updatedSections }));
  };

  const handleChangeSectionColor = (sectionId: string, newColor: string) => {
    const updatedSections = sections.map((s) => (s.id === sectionId ? { ...s, color: newColor } : s));
    setNotebook((prev) => ({ ...prev, sections: updatedSections }));
  };

  const handleDeleteSection = (sectionId: string) => {
    if (sections.length <= 1) {
      // Reset to a clean initial section with 1 empty page
      const newSecId = 'sec_' + Date.now();
      const newPageId = 'page_' + Date.now();
      const cleanPage: Page = {
        id: newPageId,
        notebookId: notebook.id,
        sectionId: newSecId,
        pageNumber: 1,
        title: 'Page 1',
        background: { ...currentPage.background },
        strokes: [],
        shapes: [],
        textObjects: [],
        textBlocks: [],
        checklists: [],
        recognizedItems: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const cleanSection: NotebookSection = {
        id: newSecId,
        title: 'Section 1',
        color: '#3b82f6',
        pages: [cleanPage],
        activePageIndex: 0,
        createdAt: Date.now(),
      };
      setNotebook((prev) => ({
        ...prev,
        sections: [cleanSection],
        activeSectionId: newSecId,
        pages: [cleanPage],
      }));
      setActiveSectionId(newSecId);
      setActivePageIndex(0);
      return;
    }

    const remainingSections = sections.filter((s) => s.id !== sectionId);
    const nextSec = remainingSections[0];
    const remainingPages = notebook.pages.filter((p) => p.sectionId !== sectionId);

    setNotebook((prev) => ({
      ...prev,
      sections: remainingSections,
      activeSectionId: nextSec.id,
      pages: remainingPages,
    }));
    setActiveSectionId(nextSec.id);
    setActivePageIndex(0);
  };

  // Page Management
  const handleAddPage = () => {
    const newPage: Page = {
      id: 'page_' + Date.now(),
      notebookId: notebook.id,
      sectionId: currentSection.id,
      pageNumber: currentSectionPages.length + 1,
      title: `Page ${currentSectionPages.length + 1}`,
      background: { ...currentPage.background },
      strokes: [],
      shapes: [],
      textObjects: [],
      textBlocks: [],
      checklists: [],
      recognizedItems: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (notebook.sections && notebook.sections.length > 0) {
      const updatedSections = notebook.sections.map((sec) => {
        if (sec.id !== currentSection.id) return sec;
        return { ...sec, pages: [...sec.pages, newPage] };
      });
      setNotebook((prev) => ({
        ...prev,
        sections: updatedSections,
        pages: [...prev.pages, newPage],
      }));
    } else {
      setNotebook((prev) => ({ ...prev, pages: [...prev.pages, newPage] }));
    }
    setActivePageIndex(currentSectionPages.length);
  };

  const handleDeletePage = (index: number) => {
    if (currentSectionPages.length <= 1) {
      // If deleting the only page in the section, reset it to clean empty page
      const cleanPage: Page = {
        ...currentPage,
        title: 'Page 1',
        strokes: [],
        shapes: [],
        textObjects: [],
        textBlocks: [],
        checklists: [],
        recognizedItems: [],
        updatedAt: Date.now(),
      };

      if (notebook.sections && notebook.sections.length > 0) {
        const updatedSections = notebook.sections.map((sec) => {
          if (sec.id !== currentSection.id) return sec;
          return { ...sec, pages: [cleanPage] };
        });
        setNotebook((prev) => ({ ...prev, sections: updatedSections }));
      } else {
        setNotebook((prev) => ({ ...prev, pages: [cleanPage] }));
      }
      setActivePageIndex(0);
      return;
    }

    const targetPage = currentSectionPages[index];
    const remainingPages = currentSectionPages.filter((_, i) => i !== index);

    if (notebook.sections && notebook.sections.length > 0) {
      const updatedSections = notebook.sections.map((sec) => {
        if (sec.id !== currentSection.id) return sec;
        return { ...sec, pages: remainingPages };
      });
      const updatedAllPages = notebook.pages.filter((p) => p.id !== targetPage.id);
      setNotebook((prev) => ({
        ...prev,
        sections: updatedSections,
        pages: updatedAllPages,
      }));
    } else {
      setNotebook((prev) => ({ ...prev, pages: remainingPages }));
    }
    setActivePageIndex(Math.max(0, index - 1));
  };

  const handleDuplicatePage = (index: number) => {
    const pageToDup = currentSectionPages[index];
    if (!pageToDup) return;
    const duplicatedPage: Page = {
      ...pageToDup,
      id: 'page_' + Date.now(),
      title: `${pageToDup.title} (Copy)`,
      strokes: pageToDup.strokes.map((s) => ({ ...s, id: 'str_' + Math.random().toString(36).substring(2, 7) })),
      shapes: [...pageToDup.shapes],
      textBlocks: pageToDup.textBlocks ? [...pageToDup.textBlocks] : [],
      checklists: pageToDup.checklists ? [...pageToDup.checklists] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (notebook.sections && notebook.sections.length > 0) {
      const updatedSections = notebook.sections.map((sec) => {
        if (sec.id !== currentSection.id) return sec;
        const pagesCopy = [...sec.pages];
        pagesCopy.splice(index + 1, 0, duplicatedPage);
        return { ...sec, pages: pagesCopy };
      });
      setNotebook((prev) => ({
        ...prev,
        sections: updatedSections,
        pages: [...prev.pages, duplicatedPage],
      }));
    } else {
      const pagesCopy = [...notebook.pages];
      pagesCopy.splice(index + 1, 0, duplicatedPage);
      setNotebook((prev) => ({ ...prev, pages: pagesCopy }));
    }
    setActivePageIndex(index + 1);
  };

  const handleRenamePage = (index: number, newTitle: string) => {
    const target = currentSectionPages[index];
    if (!target) return;
    const updatedPage = { ...target, title: newTitle, updatedAt: Date.now() };
    const updatedPages = [...currentSectionPages];
    updatedPages[index] = updatedPage;

    if (notebook.sections && notebook.sections.length > 0) {
      const updatedSections = notebook.sections.map((sec) => {
        if (sec.id !== currentSection.id) return sec;
        return { ...sec, pages: updatedPages };
      });
      setNotebook((prev) => ({ ...prev, sections: updatedSections }));
    } else {
      setNotebook((prev) => ({ ...prev, pages: updatedPages }));
    }
  };

  const handleClearPage = () => {
    pushUndoState();
    updateCurrentPage({
      strokes: [],
      shapes: [],
      textBlocks: [],
      checklists: [],
      textObjects: [],
      recognizedItems: [],
    });
    setSelectedStrokeIds([]);
  };

  const handleReplaceStrokesWithText = (text: string) => {
    const targetStrokes =
      selectedStrokeIds.length > 0
        ? currentPage.strokes.filter((s) => selectedStrokeIds.includes(s.id))
        : currentPage.strokes;

    if (!targetStrokes || targetStrokes.length === 0) return;

    const bbox = computeBoundingBox(targetStrokes.flatMap((s) => s.points), 8);
    const remainingStrokes = currentPage.strokes.filter((s) => !targetStrokes.some((ts) => ts.id === s.id));

    const newTextBlock: TextBlock = {
      id: 'tb_' + Date.now(),
      text,
      x: bbox.minX,
      y: bbox.minY,
      fontSize: Math.max(16, Math.min(28, Math.round(bbox.height * 0.75))),
      color: penSettings.color,
      timestamp: Date.now(),
    };

    pushUndoState();
    updateCurrentPage({
      strokes: remainingStrokes,
      textBlocks: [...(currentPage.textBlocks || []), newTextBlock],
    });
    setSelectedStrokeIds([]);
    setIsSideBySideOpen(false);
  };

  const handleTogglePinPage = (index: number) => {
    const target = currentSectionPages[index];
    if (!target) return;
    const isNowPinned = !target.isPinned;
    const updatedPages = [...currentSectionPages];
    updatedPages[index] = { ...target, isPinned: isNowPinned };

    if (notebook.sections && notebook.sections.length > 0) {
      const updatedSections = notebook.sections.map((sec) => {
        if (sec.id !== currentSection.id) return sec;
        return { ...sec, pages: updatedPages };
      });
      setNotebook((prev) => ({ ...prev, sections: updatedSections }));
    } else {
      setNotebook((prev) => ({ ...prev, pages: updatedPages }));
    }
  };

  // Google Keep Notes Management
  const keepNotes: KeepNote[] = notebook.keepNotes || [];

  const handleAddKeepNote = (noteData: Omit<KeepNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote: KeepNote = {
      ...noteData,
      id: 'keep_' + Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotebook((prev) => ({
      ...prev,
      keepNotes: [newNote, ...(prev.keepNotes || [])],
    }));
  };

  const handleUpdateKeepNote = (updatedNote: KeepNote) => {
    const updated = keepNotes.map((n) => (n.id === updatedNote.id ? { ...updatedNote, updatedAt: Date.now() } : n));
    setNotebook((prev) => ({ ...prev, keepNotes: updated }));
  };

  const handleDeleteKeepNote = (noteId: string) => {
    const updated = keepNotes.filter((n) => n.id !== noteId);
    setNotebook((prev) => ({ ...prev, keepNotes: updated }));
  };

  // Save Settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettingsToStorage(newSettings);
    setPenSettings(newSettings.penSettings);
    setLanguageMode(newSettings.languageMode);
  };

  // Background Config Change
  const handleChangeBackground = (newBg: PageBackgroundConfig) => {
    updateCurrentPage({ background: newBg });
  };

  // Restore crash recovery
  const handleRestoreRecovery = () => {
    if (!recoverySnapshot) return;
    updateCurrentPage({
      ...recoverySnapshot,
      id: 'page_recovered_' + Date.now(),
      updatedAt: Date.now(),
    });
    setRecoverySnapshot(null);
    clearCrashRecoverySnapshot();
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Toolbar */}
      <TopToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        penPreset={penSettings.preset}
        onPenPresetChange={(preset: PenPreset) =>
          setPenSettings((prev) => ({
            ...prev,
            preset,
            size: preset === 'fine' ? 1.5 : preset === 'marker' ? 6 : preset === 'highlighter' ? 18 : 3,
          }))
        }
        eraserMode={eraserMode}
        onEraserModeChange={setEraserMode}
        languageMode={languageMode}
        onLanguageModeChange={setLanguageMode}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={() => saveNotebookToDB(notebook)}
        onConvert={() => handleConvertStrokes()}
        onForceFullText={handleForceFullText}
        isSaving={isSaving}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onClearPage={handleClearPage}
        zoom={zoom}
        onZoomChange={setZoom}
        appMode={appMode}
        onSelectAppMode={setAppMode}
      />

      {/* Mode 1: OneNote Canvas & Nebo Live Handwriting */}
      {appMode === 'note' ? (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* OneNote Section Tabs Bar */}
          <SectionTabBar
            sections={sections}
            activeSectionId={currentSection.id}
            onSelectSection={handleSelectSection}
            onAddSection={handleAddSection}
            onRenameSection={handleRenameSection}
            onChangeSectionColor={handleChangeSectionColor}
            onDeleteSection={handleDeleteSection}
          />

          {/* Main Area: Page Sidebar + Note Canvas */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
            {/* OneNote Page List Sidebar */}
            <PageListSidebar
              pages={currentSectionPages}
              activePageIndex={activePageIndex}
              onSelectPage={setActivePageIndex}
              onAddPage={handleAddPage}
              onDeletePage={handleDeletePage}
              onDuplicatePage={handleDuplicatePage}
              onRenamePage={handleRenamePage}
              onTogglePinPage={handleTogglePinPage}
              isOpen={isSidebarOpen}
              onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Note Canvas with Nebo Live Conversion Bar */}
            <main className="workspace-area" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <NoteCanvas
                strokes={currentPage.strokes}
                shapes={currentPage.shapes}
                textBlocks={currentPage.textBlocks || []}
                checklists={currentPage.checklists || []}
                onStrokesChange={handleStrokesChange}
                onShapesChange={handleShapesChange}
                onTextBlocksChange={handleTextBlocksChange}
                onChecklistsChange={handleChecklistsChange}
                backgroundConfig={currentPage.background}
                currentTool={currentTool}
                penSettings={penSettings}
                eraserMode={eraserMode}
                currentShapeType={currentShapeType}
                selectedStrokeIds={selectedStrokeIds}
                onSelectStrokes={setSelectedStrokeIds}
                onConvertSelection={(selected, isMath) => {
                  if (isMath) setLanguageMode('math');
                  handleConvertStrokes(selected);
                }}
                zoom={zoom}
                onZoomChange={setZoom}
                languageMode={languageMode}
                apiKey={settings.geminiApiKey}
                onClearPage={handleClearPage}
              />
            </main>
          </div>
        </div>
      ) : (
        /* Mode 2: Google Keep Board View */
        <KeepBoardView
          notes={keepNotes}
          onAddNote={handleAddKeepNote}
          onUpdateNote={handleUpdateKeepNote}
          onDeleteNote={handleDeleteKeepNote}
        />
      )}

      {/* Floating Color & Size Palette when Pen/Highlighter is active */}
      {appMode === 'note' && (currentTool === 'pen' || currentTool === 'highlighter') && (
        <ColorSizePicker settings={penSettings} onChange={setPenSettings} />
      )}

      {/* Crash Recovery Banner */}
      {recoverySnapshot && (
        <div className="recovery-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#d97706" />
            <span>
              Unsaved notes from a previous session detected ({recoverySnapshot.strokes.length} strokes).
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-pill" style={{ padding: '2px 10px', fontSize: 12 }} onClick={handleRestoreRecovery}>
              <RotateCcw size={13} /> Restore Page
            </button>
            <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => setRecoverySnapshot(null)}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Verification Panel */}
      <SideBySidePanel
        recognitionResult={sideBySideResult}
        cropImageUrl={cropImageUrl}
        isOpen={isSideBySideOpen}
        onClose={() => setIsSideBySideOpen(false)}
        onAccept={(editedText) => {
          handleReplaceStrokesWithText(editedText);
        }}
        onReplaceOnCanvas={handleReplaceStrokesWithText}
        onRetry={() => handleConvertStrokes()}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        notebook={notebook}
        onNavigateToPage={(secId, pageIdx) => {
          setActiveSectionId(secId);
          setActivePageIndex(pageIdx);
          setAppMode('note');
        }}
        onNavigateToKeepNote={() => {
          setAppMode('keep');
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Page Background & Rule Lines Modal */}
      <PageBackgroundModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        config={currentPage.background}
        onChangeConfig={handleChangeBackground}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        page={currentPage}
      />

      {/* Notebook Drawer */}
      <NotebookDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        notebook={notebook}
        activePageIndex={activePageIndex}
        onSelectPage={setActivePageIndex}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
      />
    </div>
  );
};

export default App;
