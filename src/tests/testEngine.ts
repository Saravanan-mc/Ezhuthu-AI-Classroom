import { computeBoundingBox, stabilizePoints, calculateStrokeWidth, isStrokeHit } from '../engine/strokeEngine';
import { detectShapeFromStroke } from '../engine/shapeDetector';
import { recognizeOffline } from '../services/ai/offlineEngine';
import { solveHandwrittenMath } from '../services/ai/aiTutor';
import { solveMathExpression } from '../services/ai/mathSolver';
import { detectScratchOutGesture } from '../engine/gestureDetector';
import { Point, Stroke } from '../types/ink';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

async function runTestSuite() {
  console.log('\n--- 🧪 STARTING AUTOMATED TEST SUITE ---\n');

  // Test 1: Bounding Box Calculation
  const pts: Point[] = [
    { x: 10, y: 20, pressure: 0.5, timestamp: 1 },
    { x: 50, y: 80, pressure: 0.8, timestamp: 2 },
    { x: 30, y: 40, pressure: 0.4, timestamp: 3 },
  ];
  const bbox = computeBoundingBox(pts, 0);
  assert(bbox.minX === 10, 'BBox minX matches 10');
  assert(bbox.minY === 20, 'BBox minY matches 20');
  assert(bbox.maxX === 50, 'BBox maxX matches 50');
  assert(bbox.maxY === 80, 'BBox maxY matches 80');
  assert(bbox.width === 40, 'BBox width is 40');
  assert(bbox.height === 60, 'BBox height is 60');

  // Test 2: Stroke Stabilization
  const noisyPts: Point[] = [
    { x: 0, y: 0, pressure: 0.5, timestamp: 1 },
    { x: 10, y: 20, pressure: 0.6, timestamp: 2 },
    { x: 20, y: 40, pressure: 0.7, timestamp: 3 },
  ];
  const smoothed = stabilizePoints(noisyPts, 0.5);
  assert(smoothed.length === 3, 'Smoothed points count matches');
  assert(smoothed[1].x === 5, 'Exponential smoothing applied to X coordinate');

  // Test 3: Pressure Dynamics & Width
  const wSoft = calculateStrokeWidth(4, 0.2, 'normal', true);
  const wHard = calculateStrokeWidth(4, 0.9, 'normal', true);
  assert(wHard > wSoft, 'Higher stylus pressure produces thicker stroke');

  // Test 4: Hit Testing for Eraser
  const testStroke: Stroke = {
    id: 's1',
    points: [
      { x: 10, y: 10, pressure: 0.5, timestamp: 1 },
      { x: 50, y: 50, pressure: 0.5, timestamp: 2 },
    ],
    color: '#000000',
    width: 4,
    opacity: 1,
    preset: 'normal',
    timestamp: Date.now(),
    bbox: { minX: 10, minY: 10, maxX: 50, maxY: 50, width: 40, height: 40 },
  };
  assert(isStrokeHit(testStroke, 30, 30, 10), 'Hit test hits middle of stroke line segment');
  assert(!isStrokeHit(testStroke, 200, 200, 10), 'Hit test misses distant point');

  // Test 5: Shape Recognition - Circle
  const circlePts: Point[] = [];
  const radius = 50;
  for (let angle = 0; angle <= Math.PI * 2; angle += 0.2) {
    circlePts.push({
      x: 100 + Math.cos(angle) * radius,
      y: 100 + Math.sin(angle) * radius,
      pressure: 0.5,
      timestamp: Date.now(),
    });
  }
  const detectedCircle = detectShapeFromStroke(circlePts, '#000', 3);
  assert(detectedCircle !== null && detectedCircle.type === 'circle', 'Accurately recognizes rough circle');

  // Test 6: Shape Recognition - Line
  const linePts: Point[] = [];
  for (let x = 10; x <= 120; x += 10) {
    linePts.push({ x, y: 50, pressure: 0.5, timestamp: Date.now() });
  }
  const detectedLine = detectShapeFromStroke(linePts, '#000', 3);
  assert(detectedLine !== null && detectedLine.type === 'line', 'Accurately recognizes straight line stroke');

  // Test 7: Offline Recognition Fallback for Tamil
  const offlineTamil = recognizeOffline([testStroke], testStroke.bbox, { languageMode: 'tamil' });
  assert(offlineTamil.lines.length > 0, 'Offline engine produces Tamil recognized lines');
  assert(offlineTamil.lines[0].words.some((w) => /[\u0B80-\u0BFF]/.test(w.word)), 'Words contain valid Tamil Unicode characters');

  // Test 8: Offline Recognition Fallback for Mixed Tamil + English
  const offlineMixed = recognizeOffline([testStroke], testStroke.bbox, { languageMode: 'auto' });
  assert(offlineMixed.languageDetected === 'mixed', 'Offline auto mode detects mixed text');

  // Test 9: Math Solver
  const mathRes = await solveHandwrittenMath('25 + 75');
  assert(mathRes.result === '100', 'Handwritten math evaluator computes 25 + 75 = 100');

  // Test 10: Nebo Math Solver (Arithmetic, Powers & Algebraic Formulas)
  const mathSol1 = solveMathExpression('12 * 8 =');
  assert(mathSol1 !== null && mathSol1.solution.includes('96'), 'Nebo Math Solver computes 12 * 8 = 96');

  const mathSol2 = solveMathExpression('2x + 5 = 15');
  assert(mathSol2 !== null && mathSol2.solution === 'x = 5', 'Nebo Math Solver solves 2x + 5 = 15 => x = 5');

  // Test 10b: Algebraic expansion (a+b)power2
  const mathSolPower = solveMathExpression('(a+b)power2');
  assert(
    mathSolPower !== null && mathSolPower.solution === 'a² + 2ab + b²',
    `Nebo Math Solver expands (a+b)power2 => a² + 2ab + b² (got: ${mathSolPower?.solution})`
  );

  const mathSolMinus = solveMathExpression('(a-b)power2');
  assert(
    mathSolMinus !== null && mathSolMinus.solution === 'a² - 2ab + b²',
    `Nebo Math Solver expands (a-b)power2 => a² - 2ab + b² (got: ${mathSolMinus?.solution})`
  );

  const mathSolSuperscript = solveMathExpression('(a+b)²');
  assert(
    mathSolSuperscript !== null && mathSolSuperscript.solution === 'a² + 2ab + b²',
    'Nebo Math Solver expands (a+b)² with superscript'
  );

  const mathSolNumericPower = solveMathExpression('(2+3)power2');
  assert(
    mathSolNumericPower !== null && mathSolNumericPower.solution === '25',
    'Nebo Math Solver evaluates (2+3)power2 => 25'
  );

  const mathSolDiff = solveMathExpression('(a+b)(a-b)');
  assert(
    mathSolDiff !== null && mathSolDiff.solution === 'a² - b²',
    'Nebo Math Solver expands (a+b)(a-b) => a² - b²'
  );

  // Test 11: Nebo Scratch-out Scribble Gesture
  const scratchPts: Point[] = [
    { x: 10, y: 20, pressure: 0.5, timestamp: 1 },
    { x: 40, y: 22, pressure: 0.5, timestamp: 2 },
    { x: 12, y: 24, pressure: 0.5, timestamp: 3 },
    { x: 42, y: 26, pressure: 0.5, timestamp: 4 },
    { x: 11, y: 28, pressure: 0.5, timestamp: 5 },
    { x: 44, y: 30, pressure: 0.5, timestamp: 6 },
    { x: 14, y: 32, pressure: 0.5, timestamp: 7 },
    { x: 40, y: 34, pressure: 0.5, timestamp: 8 },
  ];
  const scratchStroke: Stroke = {
    id: 'scratch_1',
    points: scratchPts,
    color: '#000',
    width: 3,
    opacity: 1,
    preset: 'normal',
    timestamp: Date.now(),
    bbox: computeBoundingBox(scratchPts),
  };
  const targetStroke: Stroke = {
    id: 'target_1',
    points: [
      { x: 15, y: 22, pressure: 0.5, timestamp: 1 },
      { x: 35, y: 22, pressure: 0.5, timestamp: 2 },
    ],
    color: '#000',
    width: 3,
    opacity: 1,
    preset: 'normal',
    timestamp: Date.now(),
    bbox: { minX: 15, minY: 22, maxX: 35, maxY: 22, width: 20, height: 1 },
  };
  const gestureResult = detectScratchOutGesture(scratchStroke, [targetStroke]);
  assert(
    gestureResult.type === 'scratch' && gestureResult.targetStrokeIds.includes('target_1'),
    'Nebo scratch-out scribble erases overlapping strokes'
  );

  console.log('\n🎉 ALL 11 AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
