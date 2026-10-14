export interface MathSolveResult {
  expression: string;
  solution: string;
  isMath: boolean;
  steps?: string[];
}

/**
 * Normalizes user/handwriting math inputs:
 * Handles "power", "^", superscripts (²³), multiplication/division symbols.
 */
function normalizeMathInput(rawText: string): string {
  return rawText
    .trim()
    .replace(/[xX](?=\d)/g, '*') // e.g. 5x2 -> 5*2
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    // Unicode superscripts to ^N
    .replace(/⁰/g, '^0')
    .replace(/¹/g, '^1')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5')
    .replace(/⁶/g, '^6')
    .replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8')
    .replace(/⁹/g, '^9')
    // "power of 2", "power 2", "power2" -> ^2
    .replace(/power\s*(?:of\s*)?(\d+)/gi, '^$1')
    .replace(/squared/gi, '^2')
    .replace(/cubed/gi, '^3')
    // Common handwriting OCR output where exponent 2 or 3 attached to closing paren without caret: (a+b)2 -> (a+b)^2
    .replace(/\)\s*([23])(?!\d)/g, ')^$1')
    .replace(/\s+/g, ' ');
}

interface Term {
  coeff: number;
  vars: { [v: string]: number }; // variable name -> power
}

function parseSimpleTerm(str: string): Term | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^([+-]?\s*\d*\.?\d*)\s*([a-zA-Z]*)$/);
  if (!match) return null;

  let coeffStr = match[1].replace(/\s/g, '');
  const varPart = match[2];

  let coeff = 1;
  if (coeffStr === '' || coeffStr === '+') {
    coeff = 1;
  } else if (coeffStr === '-') {
    coeff = -1;
  } else {
    coeff = parseFloat(coeffStr);
  }

  if (isNaN(coeff)) return null;

  const vars: { [v: string]: number } = {};
  if (varPart) {
    vars[varPart] = 1;
  }

  return { coeff, vars };
}

function formatTerm(term: Term, isFirst: boolean): string {
  if (term.coeff === 0) return '';
  const sign = term.coeff < 0 ? (isFirst ? '-' : ' - ') : (isFirst ? '' : ' + ');
  const absCoeff = Math.abs(term.coeff);

  const varStr = Object.entries(term.vars)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([v, p]) => {
      if (p === 1) return v;
      if (p === 2) return `${v}²`;
      if (p === 3) return `${v}³`;
      return `${v}^${p}`;
    })
    .join('');

  if (!varStr) {
    return `${sign}${absCoeff}`;
  }

  if (absCoeff === 1) {
    return `${sign}${varStr}`;
  }

  return `${sign}${absCoeff}${varStr}`;
}

/**
 * Solves algebraic binomial / polynomial expansions like (a+b)^2, (a-b)^2, (a+b)^3, etc.
 */
function solveAlgebraicExpansion(normalized: string, rawText: string): MathSolveResult | null {
  const clean = normalized.replace(/=\s*$/, '').trim();

  // 1. Trinomial square: (a + b + c)^2 or (a - b - c)^2
  const triMatch = clean.match(/^\(\s*([+-]?\s*\w+)\s*([+-]\s*\w+)\s*([+-]\s*\w+)\s*\)\s*\^\s*2$/);
  if (triMatch) {
    const t1 = parseSimpleTerm(triMatch[1]);
    const t2 = parseSimpleTerm(triMatch[2]);
    const t3 = parseSimpleTerm(triMatch[3]);

    if (t1 && t2 && t3) {
      // (t1 + t2 + t3)^2 = t1^2 + t2^2 + t3^2 + 2*t1*t2 + 2*t2*t3 + 2*t3*t1
      const terms: Term[] = [
        { coeff: t1.coeff * t1.coeff, vars: multiplyVars(t1.vars, t1.vars) },
        { coeff: t2.coeff * t2.coeff, vars: multiplyVars(t2.vars, t2.vars) },
        { coeff: t3.coeff * t3.coeff, vars: multiplyVars(t3.vars, t3.vars) },
        { coeff: 2 * t1.coeff * t2.coeff, vars: multiplyVars(t1.vars, t2.vars) },
        { coeff: 2 * t2.coeff * t3.coeff, vars: multiplyVars(t2.vars, t3.vars) },
        { coeff: 2 * t3.coeff * t1.coeff, vars: multiplyVars(t3.vars, t1.vars) },
      ];

      const solution = terms.map((t, idx) => formatTerm(t, idx === 0)).join('');
      return {
        expression: rawText,
        solution,
        isMath: true,
        steps: [
          `Identity: (u + v + w)² = u² + v² + w² + 2uv + 2vw + 2wu`,
          `Expanded: ${solution}`,
        ],
      };
    }
  }

  // 2. Binomial power: (t1 + t2)^2 or (t1 + t2)^3
  const binomMatch = clean.match(/^\(\s*([+-]?\s*\w+)\s*([+-]\s*\w+)\s*\)\s*\^\s*([23])$/);
  if (binomMatch) {
    const t1 = parseSimpleTerm(binomMatch[1]);
    const t2 = parseSimpleTerm(binomMatch[2]);
    const power = parseInt(binomMatch[3], 10);

    if (t1 && t2) {
      // Check if both terms are purely numeric constants
      const isPureNumeric = Object.keys(t1.vars).length === 0 && Object.keys(t2.vars).length === 0;
      if (isPureNumeric) {
        const base = t1.coeff + t2.coeff;
        const ans = Math.pow(base, power);
        return {
          expression: rawText,
          solution: ans.toString(),
          isMath: true,
          steps: [
            `(${t1.coeff} + ${t2.coeff})^${power} = (${base})^${power}`,
            `= ${ans}`,
          ],
        };
      }

      if (power === 2) {
        // (t1 + t2)^2 = t1^2 + 2*t1*t2 + t2^2
        const tA: Term = { coeff: t1.coeff * t1.coeff, vars: multiplyVars(t1.vars, t1.vars) };
        const tB: Term = { coeff: 2 * t1.coeff * t2.coeff, vars: multiplyVars(t1.vars, t2.vars) };
        const tC: Term = { coeff: t2.coeff * t2.coeff, vars: multiplyVars(t2.vars, t2.vars) };

        const terms = [tA, tB, tC];
        const solution = terms.map((t, idx) => formatTerm(t, idx === 0)).join('');

        const var1 = Object.keys(t1.vars)[0] || 'a';
        const var2 = Object.keys(t2.vars)[0] || 'b';

        return {
          expression: rawText,
          solution,
          isMath: true,
          steps: [
            `Formula: (${var1} + ${var2})² = ${var1}² + 2${var1}${var2} + ${var2}²`,
            `Expanded form: ${solution}`,
          ],
        };
      }

      if (power === 3) {
        // (t1 + t2)^3 = t1^3 + 3*t1^2*t2 + 3*t1*t2^2 + t2^3
        const tA: Term = { coeff: Math.pow(t1.coeff, 3), vars: multiplyVars(t1.vars, multiplyVars(t1.vars, t1.vars)) };
        const tB: Term = { coeff: 3 * t1.coeff * t1.coeff * t2.coeff, vars: multiplyVars(multiplyVars(t1.vars, t1.vars), t2.vars) };
        const tC: Term = { coeff: 3 * t1.coeff * t2.coeff * t2.coeff, vars: multiplyVars(t1.vars, multiplyVars(t2.vars, t2.vars)) };
        const tD: Term = { coeff: Math.pow(t2.coeff, 3), vars: multiplyVars(t2.vars, multiplyVars(t2.vars, t2.vars)) };

        const terms = [tA, tB, tC, tD];
        const solution = terms.map((t, idx) => formatTerm(t, idx === 0)).join('');
        return {
          expression: rawText,
          solution,
          isMath: true,
          steps: [
            `Formula: (u + v)³ = u³ + 3u²v + 3uv² + v³`,
            `Expanded form: ${solution}`,
          ],
        };
      }
    }
  }

  // 3. Difference of squares product: (t1 + t2)(t1 - t2)
  const diffMatch = clean.match(/^\(\s*([+-]?\s*\w+)\s*([+-]\s*\w+)\s*\)\s*\(\s*([+-]?\s*\w+)\s*([+-]\s*\w+)\s*\)$/);
  if (diffMatch) {
    const t1 = parseSimpleTerm(diffMatch[1]);
    const t2 = parseSimpleTerm(diffMatch[2]);
    const t3 = parseSimpleTerm(diffMatch[3]);
    const t4 = parseSimpleTerm(diffMatch[4]);

    if (t1 && t2 && t3 && t4) {
      if (
        t1.coeff === t3.coeff &&
        areVarsEqual(t1.vars, t3.vars) &&
        t2.coeff === -t4.coeff &&
        areVarsEqual(t2.vars, t4.vars)
      ) {
        // (a + b)(a - b) = a^2 - b^2
        const tA: Term = { coeff: t1.coeff * t1.coeff, vars: multiplyVars(t1.vars, t1.vars) };
        const tB: Term = { coeff: -Math.abs(t2.coeff * t2.coeff), vars: multiplyVars(t2.vars, t2.vars) };
        const solution = `${formatTerm(tA, true)}${formatTerm(tB, false)}`;
        return {
          expression: rawText,
          solution,
          isMath: true,
          steps: [
            `Formula: (u + v)(u - v) = u² - v²`,
            `Expanded form: ${solution}`,
          ],
        };
      }
    }
  }

  // 4. Standalone factoring: a^2 - b^2 or a² - b² -> (a + b)(a - b)
  const factDiff = clean.match(/^([a-zA-Z])\s*\^\s*2\s*-\s*([a-zA-Z])\s*\^\s*2$/);
  if (factDiff) {
    const v1 = factDiff[1];
    const v2 = factDiff[2];
    return {
      expression: rawText,
      solution: `(${v1} + ${v2})(${v1} - ${v2})`,
      isMath: true,
      steps: [`Factor difference of squares: ${v1}² - ${v2}² = (${v1} + ${v2})(${v1} - ${v2})`],
    };
  }

  return null;
}

function multiplyVars(v1: { [v: string]: number }, v2: { [v: string]: number }): { [v: string]: number } {
  const result: { [v: string]: number } = { ...v1 };
  for (const [v, p] of Object.entries(v2)) {
    result[v] = (result[v] || 0) + p;
  }
  return result;
}

function areVarsEqual(v1: { [v: string]: number }, v2: { [v: string]: number }): boolean {
  const k1 = Object.keys(v1);
  const k2 = Object.keys(v2);
  if (k1.length !== k2.length) return false;
  return k1.every((k) => v1[k] === v2[k]);
}

/**
 * Parses and evaluates mathematical expressions and equations:
 * - Arithmetic & Powers: 12 + 4, 25 * 4, 2^8, 5power2, (2+3)power2, sqrt(16)
 * - Algebraic Expansions: (a+b)power2, (a+b)^2, (a-b)^2, (a+b)^3, (a+b+c)^2, (x+2)^2
 * - Linear Equations: 2x + 5 = 15 => x = 5
 */
export function solveMathExpression(rawText: string): MathSolveResult | null {
  if (!rawText) return null;

  // Clean and normalize text
  const clean = normalizeMathInput(rawText);

  // 1. Check for algebraic expansion formulas: e.g. (a+b)power2, (a+b)^2, (x+2)^2, (a-b)^3
  const algebraicSol = solveAlgebraicExpansion(clean, rawText);
  if (algebraicSol) {
    return algebraicSol;
  }

  // 2. Check for linear equation: ax + b = c or ax = b
  const eqMatch = clean.match(/^([+-]?\s*\d*\.?\d*)\s*([a-zA-Z])\s*([+-]\s*\d+\.?\d*)?\s*=\s*([+-]?\s*\d+\.?\d*)$/);
  if (eqMatch) {
    const varName = eqMatch[2];
    let aStr = eqMatch[1].replace(/\s/g, '');
    if (aStr === '' || aStr === '+') aStr = '1';
    if (aStr === '-') aStr = '-1';
    const a = parseFloat(aStr);

    const bStr = (eqMatch[3] || '0').replace(/\s/g, '');
    const b = parseFloat(bStr);

    const cStr = eqMatch[4].replace(/\s/g, '');
    const c = parseFloat(cStr);

    if (!isNaN(a) && a !== 0 && !isNaN(b) && !isNaN(c)) {
      const rhs = c - b;
      const ans = rhs / a;
      const formattedAns = Number.isInteger(ans) ? ans.toString() : ans.toFixed(2);
      return {
        expression: rawText,
        solution: `${varName} = ${formattedAns}`,
        isMath: true,
        steps: [
          `${a !== 1 ? a : ''}${varName} = ${c} ${b >= 0 ? '- ' + b : '+ ' + Math.abs(b)}`,
          `${a !== 1 ? a : ''}${varName} = ${rhs}`,
          `${varName} = ${formattedAns}`,
        ],
      };
    }
  }

  // 3. Check for arithmetic evaluation: e.g. "12 + 45 =", "25 * 4", "5power2", "2^8", "sqrt(16) + 3^2"
  const exprCandidate = clean.replace(/=\s*$/, '').trim();

  // Basic sanity check to ensure it looks like an arithmetic expression
  if (!/^[\d\s+\-*/^().,%sqrtPIpieE]+$/i.test(exprCandidate)) {
    return null;
  }

  // Check if contains at least one operator or function
  if (!/[+\-*/^%]|sqrt/i.test(exprCandidate)) {
    return null;
  }

  try {
    const sanitized = exprCandidate
      .replace(/sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)')
      .replace(/\^/g, '**')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![a-z])/gi, 'Math.E');

    // Only allow safe math tokens
    if (/^[0-9+\-*/().\s,Math.sqrtPIE**]+$/.test(sanitized)) {
      // Safely evaluate math expression without full eval
      const fn = new Function(`return (${sanitized});`);
      const val = fn();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        const rounded = Number.isInteger(val) ? val.toString() : parseFloat(val.toFixed(4)).toString();
        return {
          expression: exprCandidate,
          solution: `${clean.includes('=') ? clean : clean + ' ='} ${rounded}`,
          isMath: true,
        };
      }
    }
  } catch {
    // Not valid arithmetic
  }

  return null;
}
