import { describe, expect, it, vi } from 'vitest';
import { drawDetections } from './drawDetections';
import { previewBox } from '../../services/detectionMath';

function drawingContext() {
  return {
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 90 })),
  };
}

const cans = [
  {
    classId: 0,
    confidence: 0.95,
    bbox: { x: 0.35, y: 0.2, width: 0.15, height: 0.5 },
  },
  {
    classId: 1,
    confidence: 0.9,
    bbox: { x: 0.5, y: 0.2, width: 0.15, height: 0.5 },
  },
];

describe('continuous multi-can overlay', () => {
  it.each([
    [1280, 720, 280, 452],
    [720, 1280, 390, 650],
  ])(
    'draws every can and label using the existing preview mapping (%s × %s)',
    (videoWidth, videoHeight, width, height) => {
      const context = drawingContext();
      drawDetections(context, cans, videoWidth, videoHeight, width, height);
      expect(context.strokeRect).toHaveBeenCalledTimes(2);
      expect(context.fillText.mock.calls.map(([label]) => label)).toEqual([
        'Coca-Cola 95%',
        'Coca-Cola Zero 90%',
      ]);
      cans.forEach((can, index) => {
        const box = previewBox(
          can.bbox,
          videoWidth,
          videoHeight,
          width,
          height,
        );
        expect(context.strokeRect).toHaveBeenNthCalledWith(
          index + 1,
          box.x,
          box.y,
          box.width,
          box.height,
        );
      });
    },
  );

  it('removes disappeared cans and clears all stale boxes on an empty result', () => {
    const context = drawingContext();
    drawDetections(context, cans, 1280, 720, 280, 452);
    vi.clearAllMocks();
    drawDetections(context, [cans[1]], 1280, 720, 280, 452);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 280, 452);
    expect(context.strokeRect).toHaveBeenCalledTimes(1);
    expect(context.fillText.mock.calls[0][0]).toBe('Coca-Cola Zero 90%');
    vi.clearAllMocks();
    drawDetections(context, [], 1280, 720, 280, 452);
    expect(context.clearRect).toHaveBeenCalledOnce();
    expect(context.strokeRect).not.toHaveBeenCalled();
    expect(context.fillText).not.toHaveBeenCalled();
  });
});
