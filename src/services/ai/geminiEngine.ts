import { Stroke, BoundingBox } from '../../types/ink';
import { RecognitionResult, RecognitionOptions } from '../../types/ai';

export async function recognizeWithGemini(
  imageDataUrl: string,
  _strokes: Stroke[],
  _bbox: BoundingBox,
  options: RecognitionOptions
): Promise<RecognitionResult> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new Error('No Gemini API key provided');
  }

  // Extract base64 portion
  const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

  let languageInstruction = '';
  if (options.languageMode === 'tamil') {
    languageInstruction = 'Prioritize TAMIL handwriting recognition strictly. Transcribe Tamil letters, uyir, mei, uyirmei, pulli, and Tamil numerals accurately.';
  } else if (options.languageMode === 'english') {
    languageInstruction = 'Prioritize ENGLISH handwriting recognition (print or cursive), numbers, and Latin punctuation.';
  } else if (options.languageMode === 'math') {
    languageInstruction = 'Focus on MATHEMATICAL formulas, fractions, symbols (+, -, *, /, =, <, >, sqrt, ^), numbers, and algebraic expressions. Provide step-by-step solution if an equation/problem is written.';
  } else {
    languageInstruction = 'AUTO DETECT: The handwriting may be TAMIL, ENGLISH, NUMBERS, or a MIXED combination in the same sentence (e.g., "இன்று we are learning Mathematics" or "தமிழ்நாட்டின் capital is Chennai" or "2x + 5 = 15"). Preserve mixed Tamil and English words accurately without forcing everything into one language.';
  }

  const prompt = `You are an expert handwriting-to-text recognition AI specialized in Tamil and English handwritten notes for classrooms and tutoring.
${languageInstruction}

Analyze the handwritten image and extract the exact text, preserving line breaks, paragraph structure, and list items.

Return ONLY a valid, parseable JSON object matching this schema (do NOT wrap with markdown ticks if possible, or wrap in \`\`\`json):
{
  "rawText": "Full reconstructed text with line breaks",
  "languageDetected": "tamil" | "english" | "mixed" | "math",
  "overallConfidence": 0.95,
  "lines": [
    {
      "lineIndex": 1,
      "text": "Full line text",
      "language": "tamil" | "english" | "mixed" | "number",
      "words": [
        {
          "word": "wordText",
          "confidence": 0.92,
          "isUncertain": false,
          "alternatives": ["alt1", "alt2"]
        }
      ]
    }
  ],
  "mathSolution": {
    "latexFormula": "2x + 5 = 15",
    "expression": "2x + 5 = 15",
    "result": "x = 5",
    "steps": ["2x = 15 - 5", "2x = 10", "x = 5"],
    "explanation": "Subtract 5 from both sides, then divide by 2."
  }
}
Note: Include "mathSolution" only if mathematical equations, arithmetic, or formulas are detected in the writing.`;

  // Try gemini-2.5-flash, then fallback to gemini-1.5-flash
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const resJson = await response.json();
      const rawOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawOutput) {
        throw new Error('Empty response from Gemini API');
      }

      // Parse JSON from text
      const cleanJson = rawOutput.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        id: 'rec_' + Date.now(),
        rawText: parsed.rawText || '',
        languageDetected: parsed.languageDetected || 'mixed',
        overallConfidence: parsed.overallConfidence || 0.9,
        lines: parsed.lines || [
          {
            lineIndex: 1,
            text: parsed.rawText || '',
            language: parsed.languageDetected || 'mixed',
            words: (parsed.rawText || '').split(/\s+/).map((w: string) => ({
              word: w,
              confidence: 0.9,
              isUncertain: false,
              alternatives: [],
            })),
          },
        ],
        timestamp: Date.now(),
        mathSolution: parsed.mathSolution,
      };
    } catch (e: any) {
      lastError = e;
      // Continue to next model if available
    }
  }

  throw lastError || new Error('Failed to connect to Gemini API');
}
