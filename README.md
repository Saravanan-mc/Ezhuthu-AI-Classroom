# ✍️ Ezhuthu AI Classroom

A feature-rich, cross-platform digital notebook and whiteboard web application built with **React**, **TypeScript**, and **Vite**. Designed to seamlessly blend traditional handwriting with modern AI, it features OneNote-style notebook organization, Google Keep-style board notes, and advanced handwriting & math recognition powered by Gemini.

---

## ✨ Key Features

* **OneNote-Style Organization:** Structured section tabs, colored page lists, pinning, and multi-page notebook navigation.
* **Advanced Note-Taking Canvas:** 
  * Support for freehand pen, highlighter, shapes, and eraser tools.
  * Customizable pen presets (fine, marker, highlighter, custom sizes/colors).
* **AI-Powered Handwriting & Math Recognition:** 
  * Integrated recognition engine supporting text conversion and math solutions (powered by Gemini AI and offline fallbacks).
  * Side-by-side verification and text block insertion.
* **Google Keep Board View:** Manage sticky notes and checklists alongside your primary classroom notebook.
* **Robust Data Persistence:** Local storage integration with IndexedDB for saving notebooks and automated crash recovery snapshots.
* **Productivity Shortcuts:** Full keyboard shortcut support (Undo/Redo, Quick Search via `Ctrl+K`, Save, Select All, Delete).

---

## 🛠️ Tech Stack

* **Framework:** [React 18+](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
* **Build Tool:** [Vite](https://vite.dev/)
* **Styling & Icons:** CSS, Lucide React
* **Storage:** IndexedDB / LocalStorage

---

## 📁 Project Structure

```text
├── src/
│   ├── components/         # UI components (Toolbar, Canvas, Modals, OneNote, Keep)
│   ├── engine/             # Stroke processing and bounding box calculation engines
│   ├── services/           # AI recognition engine and IndexedDB storage wrappers
│   ├── types/              # TypeScript interfaces (Ink, AI, Notebook)
│   ├── App.tsx             # Main application component & state router
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
├── index.html              # HTML root template
├── package.json            # Dependencies and scripts
└── vite.config.ts          # Vite configuration
