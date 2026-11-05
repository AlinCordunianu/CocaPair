import { describe, expect, it } from 'vitest';
import {
  boxesAreHugging,
  hasHugPair,
  HugConfirmation,
  validCanDetections,
} from './hugDetection';
import { decodeOutput, letterbox } from './detectionMath';
import { DETECTION_CONFIDENCE_THRESHOLD } from '../constants/detection';

const can = (classId = 0, x = 0.1, y = 0.2, width = 0.2, height = 0.5) => ({
  classId,
  className: classId === 0 ? 'coca_cola_can' : 'coca_cola_zero_can',
  confidence: 0.9,
  bbox: { x, y, width, height },
});

const pair = () => [can(0), can(1, 0.3)];

describe('bounding box hug proximity', () => {
  it('accepts overlap, edge contact, and a gap of exactly 5% of average width', () => {
    const a = can().bbox;
    expect(boxesAreHugging(a, can(1, 0.25).bbox)).toBe(true);
    expect(boxesAreHugging(a, can(1, 0.3).bbox)).toBe(true);
    expect(boxesAreHugging(a, can(1, 0.31).bbox)).toBe(true);
    expect(boxesAreHugging(a, can(1, 0.3101).bbox)).toBe(false);
  });

  it('uses the average width, supports custom tolerance, and is symmetric', () => {
    const a = can().bbox,
      b = can(1, 0.315, 0.2, 0.4).bbox;
    expect(boxesAreHugging(a, b)).toBe(true);
    expect(boxesAreHugging(b, a)).toBe(true);
    expect(boxesAreHugging(a, b, 0)).toBe(false);
    expect(boxesAreHugging(a, can(1, 0.32).bbox, 0.1)).toBe(true);
  });

  it('rejects boxes with horizontal alignment but large vertical separation', () => {
    expect(boxesAreHugging(can().bbox, can(1, 0.1, 0.8).bbox)).toBe(false);
  });

  it('uses actual diagonal edge distance rather than allowing a square tolerance', () => {
    const a = can(0, 0.1, 0.1, 0.2, 0.2).bbox;
    expect(boxesAreHugging(a, can(1, 0.306, 0.306, 0.2, 0.2).bbox)).toBe(true);
    expect(boxesAreHugging(a, can(1, 0.308, 0.308, 0.2, 0.2).bbox)).toBe(false);
  });
});

describe('multi-object hug detection', () => {
  it.each([
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ])('accepts the class combination %s + %s', (a, b) => {
    expect(hasHugPair([can(a), can(b, 0.3)])).toBe(true);
  });

  it('examines all cans, including a hugging pair below the highest-confidence detection', () => {
    const unrelated = { ...can(0, 0.8), confidence: 0.99 };
    expect(hasHugPair([unrelated, ...pair()])).toBe(true);
    expect(validCanDetections([unrelated, ...pair()])).toHaveLength(3);
  });

  it('does not count one can or duplicated predictions as two distinct cans', () => {
    const single = can();
    expect(hasHugPair([])).toBe(false);
    expect(hasHugPair([single])).toBe(false);
    expect(hasHugPair([single, single])).toBe(false);
    expect(
      hasHugPair([single, { ...single, classId: 1, bbox: { ...single.bbox } }]),
    ).toBe(false);
  });

  it('rejects unsupported classes, low/invalid confidence and invalid boxes', () => {
    const invalid = [
      { ...can(), classId: 2 },
      { ...can(), confidence: DETECTION_CONFIDENCE_THRESHOLD - 0.01 },
      { ...can(), confidence: NaN },
      { ...can(), confidence: 1.1 },
      { ...can(), bbox: { ...can().bbox, width: 0 } },
      { ...can(), bbox: { ...can().bbox, x: Infinity } },
      { ...can(), bbox: null },
    ];
    expect(validCanDetections(invalid)).toEqual([]);
    expect(hasHugPair([can(), ...invalid])).toBe(false);
  });

  it('uses decoded original-image coordinates with portrait and landscape letterboxing', () => {
    for (const [width, height] of [
      [720, 1280],
      [1280, 720],
    ]) {
      const transform = letterbox(width, height);
      const output = new Float32Array(50400);
      for (let i = 0; i < 2; i++) {
        output[i] =
          ((0.2 + i * 0.2) * transform.resizedWidth + transform.offsetX) / 640;
        output[8400 + i] =
          (0.5 * transform.resizedHeight + transform.offsetY) / 640;
        output[16800 + i] = (0.2 * transform.resizedWidth) / 640;
        output[25200 + i] = (0.5 * transform.resizedHeight) / 640;
        output[(4 + i) * 8400 + i] = 0.95;
      }
      const found = decodeOutput(output, [1, 6, 8400], transform);
      expect(found).toHaveLength(2);
      expect(hasHugPair(found)).toBe(true);
    }
  });
});

describe('consecutive hug confirmation and replay', () => {
  it('never confirms a single can, even over many results', () => {
    const hug = new HugConfirmation();
    for (let i = 0; i < 10; i++) expect(hug.update([can()])).toBe(false);
  });

  it('confirms only the third consecutive result, even when classes/order alternate', () => {
    const hug = new HugConfirmation();
    expect(hug.update(pair())).toBe(false);
    expect(hug.update([can(1, 0.3), can(0)])).toBe(false);
    expect(hug.update([can(1), can(1, 0.3)])).toBe(true);
  });

  it.each([
    ['no detections', () => []],
    ['one can', () => [can()]],
    ['separated cans', () => [can(), can(1, 0.5)]],
    ['one invalid can', () => [can(), { ...can(1, 0.3), confidence: 0.5 }]],
  ])('resets the streak after %s', (_, interrupted) => {
    const hug = new HugConfirmation();
    hug.update(pair());
    hug.update(pair());
    expect(hug.update(interrupted())).toBe(false);
    expect(hug.update(pair())).toBe(false);
    expect(hug.update(pair())).toBe(false);
    expect(hug.update(pair())).toBe(true);
  });

  it('suppresses repeated events until replay, even if cans disappear and return', () => {
    const hug = new HugConfirmation();
    expect([
      hug.update(pair()),
      hug.update(pair()),
      hug.update(pair()),
    ]).toEqual([false, false, true]);
    for (const detections of [pair(), [], [can()], pair(), pair(), pair()])
      expect(hug.update(detections)).toBe(false);
    hug.reset();
    expect(hug.update(pair())).toBe(false);
    expect(hug.update(pair())).toBe(false);
    expect(hug.update(pair())).toBe(true);
  });

  it('clears an unfinished streak on scan restart', () => {
    const hug = new HugConfirmation();
    hug.update(pair());
    hug.update(pair());
    hug.reset();
    expect(hug.update(pair())).toBe(false);
    expect(hug.update(pair())).toBe(false);
    expect(hug.update(pair())).toBe(true);
  });
});
