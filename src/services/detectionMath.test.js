import { describe, expect, it } from 'vitest';
import { decodeOutput, letterbox, mapBox, previewBox } from './detectionMath';

describe('model decoding and coordinate mapping', () => {
  it('letterboxes landscape and portrait without distortion, then removes the padding', () => {
    expect(letterbox(1280, 720)).toMatchObject({
      resizedWidth: 640,
      resizedHeight: 360,
      offsetY: 140,
    });
    expect(letterbox(720, 1280)).toMatchObject({
      resizedWidth: 360,
      resizedHeight: 640,
      offsetX: 140,
    });
    expect(mapBox(0.5, 0.5, 1, 360 / 640, letterbox(1280, 720))).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
    expect(mapBox(0.5, 0.5, 360 / 640, 1, letterbox(720, 1280))).toEqual({
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    });
  });
  it('maps boxes through centered cover cropping', () => {
    const box = previewBox(
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      1280,
      720,
      280,
      452,
    );
    expect(box.y).toBeCloseTo(113);
    expect(box.height).toBeCloseTo(226);
    expect(box.x + box.width / 2).toBeCloseTo(140);
  });
  it('decodes channel-major normalized xywh and suppresses duplicate anchors across subtypes', () => {
    const output = new Float32Array(6 * 8400);
    for (let i = 0; i < 3; i++) {
      output[i] = 0.5;
      output[8400 + i] = 0.5;
      output[2 * 8400 + i] = 0.4;
      output[3 * 8400 + i] = 0.6;
    }
    output[4 * 8400] = 0.92;
    output[5 * 8400 + 1] = 0.85;
    output[4 * 8400 + 2] = 0.49;
    const found = decodeOutput(output, [1, 6, 8400], letterbox(640, 640));
    expect(found).toHaveLength(1);
    expect(found[0].classId).toBe(0);
    expect(found[0].bbox.x).toBeCloseTo(0.3);
    expect(found[0].bbox.y).toBeCloseTo(0.2);
  });
  it('rejects an incompatible export instead of silently misreading it', () => {
    expect(() =>
      decodeOutput(new Float32Array(1800), [1, 300, 6], letterbox(640, 640)),
    ).toThrow('Unexpected model output');
  });
  it.each([
    [0, 0],
    [0, 1],
  ])(
    'documents that unchanged NMS suppresses heavily overlapping cans (%s + %s)',
    (firstClass, secondClass) => {
      const output = new Float32Array(50400);
      for (let i = 0; i < 2; i++) {
        output[i] = 0.4 + i * 0.06;
        output[8400 + i] = 0.5;
        output[16800 + i] = 0.2;
        output[25200 + i] = 0.6;
        output[(4 + (i === 0 ? firstClass : secondClass)) * 8400 + i] =
          0.95 - i * 0.05;
      }
      const found = decodeOutput(output, [1, 6, 8400], letterbox(640, 640));
      expect(found).toHaveLength(1);
      expect(found[0].classId).toBe(firstClass);
    },
  );
  it.each([
    [0, 0],
    [0, 1],
    [1, 1],
  ])(
    'retains multiple separate cans with classes %s and %s',
    (firstClass, secondClass) => {
      const output = new Float32Array(6 * 8400);
      for (let i = 0; i < 2; i++) {
        output[i] = i === 0 ? 0.3 : 0.51;
        output[8400 + i] = 0.5;
        output[2 * 8400 + i] = 0.2;
        output[3 * 8400 + i] = 0.6;
        output[(4 + (i === 0 ? firstClass : secondClass)) * 8400 + i] =
          0.95 - i * 0.05;
      }
      const found = decodeOutput(output, [1, 6, 8400], letterbox(640, 640));
      expect(found.map((detection) => detection.classId)).toEqual([
        firstClass,
        secondClass,
      ]);
      expect(found[0].bbox.x).toBeCloseTo(0.2);
      expect(found[1].bbox.x).toBeCloseTo(0.41);
      expect(
        decodeOutput(
          new Float32Array(50400),
          [1, 6, 8400],
          letterbox(640, 640),
        ),
      ).toEqual([]);
    },
  );
  it('filters nonfinite values and boxes entirely in letterbox padding', () => {
    const output = new Float32Array(50400);
    output[4 * 8400] = 0.9;
    output[0] = 0.5;
    output[8400] = 0.05;
    output[2 * 8400] = 0.1;
    output[3 * 8400] = 0.1;
    output[4 * 8400 + 1] = NaN;
    expect(decodeOutput(output, [1, 6, 8400], letterbox(1280, 720))).toEqual(
      [],
    );
  });
});
