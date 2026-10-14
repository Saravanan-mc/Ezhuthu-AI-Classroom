import { ContentType } from '../../types/ink';

export interface AnalyzedContent {
  contentType: ContentType;
  rawText: string;
  correctedText: string;
  autoTitle?: string;
  suggestedTags: string[];
  correctionsMade: {
    original: string;
    corrected: string;
    reason: string;
  }[];
}

// Common Tamil spelling / context mistakes and their correct academic forms
const TAMIL_CONTEXT_CORRECTIONS: Record<string, string> = {
  'மொளி': 'மொழி',
  'தமிளி': 'தமிழ்',
  'பள்ளிகு': 'பள்ளிக்கு',
  'சென்றனர': 'சென்றனர்',
  'கணிதம': 'கணிதம்',
  'வணக்கம': 'வணக்கம்',
  'பாடகம': 'பாடம்',
  'செனனை': 'சென்னை',
  'திருவள்ளுவர': 'திருவள்ளுவர்',
  'ஆசிரியர': 'ஆசிரியர்',
  'மாணவரகள': 'மாணவர்கள்',
  'புததகம': 'புத்தகம்',
  'அறிவியல': 'அறிவியல்',
  'இயற்பியல': 'இயற்பியல்',
  'வேதியியல': 'வேதியியல்',
};

// Common English spelling errors in classroom notes
const ENGLISH_CONTEXT_CORRECTIONS: Record<string, string> = {
  'schooll': 'school',
  'mathematicss': 'mathematics',
  'mathematic': 'mathematics',
  'physic': 'physics',
  'accleration': 'acceleration',
  'graviti': 'gravity',
  'velosity': 'velocity',
  'calculas': 'calculus',
  'equasion': 'equation',
  'formulla': 'formula',
  'chaptr': 'chapter',
  'defination': 'definition',
  'experimnt': 'experiment',
};

/**
 * Classifies content into Heading, Bullet list, Equation, Number, or Paragraph
 */
export function classifyHandwritingContent(text: string): ContentType {
  const trimmed = text.trim();
  if (!trimmed) return 'general-text';

  // 1. Math Equation / Arithmetic Check
  if (
    /[=<>±×÷√∑π²³]/.test(trimmed) ||
    /^\s*\d+[\s+\-*/.]+\d+\s*(=.*)?$/.test(trimmed) ||
    /^[a-zA-Z]\s*²|\^[0-9]/.test(trimmed)
  ) {
    return 'equation';
  }

  // 2. Pure Number / Measurement / Currency
  if (/^([₹$€£]\s*)?-?\d+(\.\d+)?%?$/.test(trimmed)) {
    return 'number';
  }

  // 3. Bullet List or Numbered List
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
  if (
    lines.length > 1 &&
    lines.every((l) => /^([*•\-]|\d+[.)]|[க-ன][.)])\s+/.test(l))
  ) {
    return 'bullet-list';
  }

  // 4. Heading: Short line (< 50 chars), uppercase or capitalized, or Tamil title pattern
  if (lines.length === 1 && trimmed.length < 55) {
    const isUpper = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
    const isTamilHeading = /[\u0B80-\u0BFF]/.test(trimmed) && trimmed.length < 40;
    const isLectureTitle = /^(chapter|lesson|lecture|unit|பாடம்|வகுப்பு|அத்தியாயம்)/i.test(trimmed);
    if (isUpper || isTamilHeading || isLectureTitle) {
      return 'heading';
    }
  }

  return 'paragraph';
}

/**
 * Smart Auto-Correction without destroying original text
 */
export function applySmartContextCorrections(rawText: string): AnalyzedContent {
  const contentType = classifyHandwritingContent(rawText);
  const words = rawText.split(/(\s+|[.,;!?()]+)/);
  const correctionsMade: { original: string; corrected: string; reason: string }[] = [];

  const correctedWords = words.map((w) => {
    const cleanWord = w.trim();
    if (!cleanWord) return w;

    // Check Tamil corrections
    if (TAMIL_CONTEXT_CORRECTIONS[cleanWord]) {
      const fixed = TAMIL_CONTEXT_CORRECTIONS[cleanWord];
      correctionsMade.push({
        original: cleanWord,
        corrected: fixed,
        reason: 'Tamil orthography & pulli/la-zha correction',
      });
      return w.replace(cleanWord, fixed);
    }

    // Check English corrections (case-insensitive)
    const lower = cleanWord.toLowerCase();
    if (ENGLISH_CONTEXT_CORRECTIONS[lower]) {
      const fixed = ENGLISH_CONTEXT_CORRECTIONS[lower];
      // Preserve uppercase if original was capitalized
      const finalWord = cleanWord[0] === cleanWord[0].toUpperCase()
        ? fixed.charAt(0).toUpperCase() + fixed.slice(1)
        : fixed;

      correctionsMade.push({
        original: cleanWord,
        corrected: finalWord,
        reason: 'Academic spelling correction',
      });
      return w.replace(cleanWord, finalWord);
    }

    return w;
  });

  let correctedText = correctedWords.join('');

  // Auto Capitalization for English sentences: "today we are..." -> "Today we are..."
  if (/^[a-z]/.test(correctedText)) {
    correctedText = correctedText.charAt(0).toUpperCase() + correctedText.slice(1);
  }

  // Auto Title detection: If content is a heading or short first line
  let autoTitle: string | undefined = undefined;
  if (contentType === 'heading' || rawText.trim().length < 50) {
    autoTitle = correctedText.trim().replace(/^[*#•\s]+/, '');
  }

  // Auto Tagging based on academic terms
  const suggestedTags: string[] = [];
  const lowerAll = correctedText.toLowerCase();
  if (/tamil|தமிழ்|இலக்கியம்|திருக்குறள்/.test(lowerAll)) suggestedTags.push('Tamil');
  if (/math|கணிதம்|equation|formula|calculus|algebra|\d+\s*[+\-*/=]/.test(lowerAll)) suggestedTags.push('Mathematics');
  if (/physic|இயற்பியல்|newton|force|velocity|motion|energy/.test(lowerAll)) suggestedTags.push('Physics');
  if (/chemistry|வேதியியல்|acid|reaction|atom/.test(lowerAll)) suggestedTags.push('Chemistry');
  if (/code|computer|javascript|algorithm/.test(lowerAll)) suggestedTags.push('Computer Science');

  return {
    contentType,
    rawText,
    correctedText,
    autoTitle,
    suggestedTags,
    correctionsMade,
  };
}
