const DICTIONARY_STORAGE_KEY = 'ezhuthu_user_dictionary';

const DEFAULT_ACADEMIC_TERMS = [
  'திருவள்ளுவர்',
  'சென்னை',
  'மதுரை',
  'கோயம்புத்தூர்',
  'தமிழ்நாடு',
  'கணிதம்',
  'இயற்பியல்',
  'வேதியியல்',
  'உயிரியல்',
  'வானியல்',
  'பல்கலைக்கழகம்',
  'Newton',
  'Einstein',
  'Thermodynamics',
  'Photosynthesis',
  'Trigonometry',
  'Calculus',
  'Electromagnetism',
  'Algorithm',
  'JavaScript',
  'Python',
];

export class PersonalDictionary {
  private words: Set<string>;

  constructor() {
    this.words = new Set(DEFAULT_ACADEMIC_TERMS);
    this.load();
  }

  private load() {
    try {
      const saved = localStorage.getItem(DICTIONARY_STORAGE_KEY);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        parsed.forEach((w) => this.words.add(w));
      }
    } catch (e) {
      console.warn('Failed to load personal dictionary:', e);
    }
  }

  public save() {
    try {
      localStorage.setItem(
        DICTIONARY_STORAGE_KEY,
        JSON.stringify(Array.from(this.words))
      );
    } catch (e) {
      console.error('Failed to save personal dictionary:', e);
    }
  }

  public getWords(): string[] {
    return Array.from(this.words);
  }

  public addWord(word: string) {
    if (word.trim()) {
      this.words.add(word.trim());
      this.save();
    }
  }

  public removeWord(word: string) {
    this.words.delete(word);
    this.save();
  }

  public hasWord(word: string): boolean {
    return this.words.has(word.trim());
  }
}

export const userDictionary = new PersonalDictionary();
