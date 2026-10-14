export type LanguageMode = 'auto' | 'tamil' | 'english' | 'math';

export interface WordConfidence {
  word: string;
  confidence: number; // 0 to 1
  isUncertain: boolean;
  alternatives: string[];
}

export interface LineResult {
  lineIndex: number;
  text: string;
  language: 'tamil' | 'english' | 'mixed' | 'number' | 'math';
  words: WordConfidence[];
  yPosition?: number;
}

export interface RecognitionResult {
  id: string;
  rawText: string;
  languageDetected: 'tamil' | 'english' | 'mixed' | 'math';
  overallConfidence: number;
  lines: LineResult[];
  timestamp: number;
  mathSolution?: MathSolution;
}

export interface MathSolution {
  latexFormula: string;
  expression: string;
  result: string;
  steps: string[];
  explanation: string;
}

export interface AIQuizItem {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface AISummary {
  title: string;
  overview: string;
  keyPoints: string[];
  formulasOrVocabulary: string[];
  actionItems: string[];
}

export interface RecognitionOptions {
  languageMode: LanguageMode;
  apiKey?: string;
  useOfflineFallback?: boolean;
  detectMath?: boolean;
}
