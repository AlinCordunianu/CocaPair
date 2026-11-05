import { afterEach, describe, expect, it, vi } from 'vitest';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { DETECTION_CONFIDENCE_THRESHOLD } from '../constants/detection';
import { decodeOutput, letterbox } from './detectionMath';
import { HugConfirmation, validCanDetections } from './hugDetection';
import { meetsConfidenceThreshold } from './confidence';
import { drawDetections } from '../components/DetectionOverlay/drawDetections';
import { objectDetector } from './objectDetector';

const scores = [0.65, 0.69, 0.7, 0.72, 0.75, 0.79, 0.8, 0.85];
const acceptedScores = scores.filter((score) => score >= 0.7).map(Math.fround);

function outputForScores(values, classId = 0) {
  const output = new Float32Array(50400);
  values.forEach((score, index) => {
    output[index] = 0.29 + index * 0.055;
    output[8400 + index] = 0.5;
    output[16800 + index] = 0.04;
    output[25200 + index] = 0.4;
    output[(4 + classId) * 8400 + index] = score;
  });
  return output;
}

describe.each([0, 1])(
  'configured 0.70 confidence pipeline for class %s',
  (classId) => {
    it.each(scores)(
      'handles Float32 model score %s consistently in decoding and scanning',
      (score) => {
        expect(DETECTION_CONFIDENCE_THRESHOLD).toBe(0.7);
        const output = outputForScores([score], classId);
        const detections = decodeOutput(
          output,
          [1, 6, 8400],
          letterbox(640, 640),
        );
        const expectedCount = score >= 0.7 ? 1 : 0;
        expect(detections).toHaveLength(expectedCount);
        expect(validCanDetections(detections)).toHaveLength(expectedCount);
        const plainDetection = {
          classId,
          confidence: score,
          bbox: { x: 0.4, y: 0.2, width: 0.1, height: 0.4 },
        };
        expect(validCanDetections([plainDetection])).toHaveLength(
          expectedCount,
        );
      },
    );
  },
);

describe('worker transport through scan filtering to the UI renderer', () => {
  afterEach(() => {
    objectDetector.dispose();
    vi.unstubAllGlobals();
  });

  it('passes all requested scores at or above 0.70 through the real worker/service code to canvas labels', async () => {
    // Mock model execution only: this proves pipeline behavior, not model accuracy.
    const output = outputForScores(scores);
    const runtime = await build({
      entryPoints: ['src/services/detector.worker.js'],
      bundle: true,
      write: false,
      format: 'iife',
      plugins: [
        {
          name: 'synthetic-litert',
          setup(builder) {
            builder.onResolve({ filter: /^@litertjs\/core$/ }, () => ({
              path: 'litert',
              namespace: 'synthetic',
            }));
            builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({
              contents: `
          export const isWebGPUSupported = () => false;
          export const loadLiteRt = async () => {};
          export const loadAndCompile = async () => globalThis.testModel;
          export class Tensor { constructor() {} delete() {} }
        `,
            }));
          },
        },
      ],
    });
    const model = {
      isFullyAccelerated: false,
      getInputDetails: () => [{ dtype: 'float32', shape: [1, 3, 640, 640] }],
      getOutputDetails: () => [{ dtype: 'float32', shape: [1, 6, 8400] }],
      run: vi.fn(async () => [
        {
          data: async () => output,
          type: { layout: { dimensions: [1, 6, 8400] } },
          delete() {},
        },
      ]),
    };
    const workerSelf = {};
    const rgba = new Uint8ClampedArray(640 * 640 * 4);
    runInNewContext(runtime.outputFiles[0].text, {
      self: workerSelf,
      Float32Array,
      testModel: model,
      fetch: async () => ({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1),
      }),
      OffscreenCanvas: class {
        getContext() {
          return {
            fillRect() {},
            drawImage() {},
            getImageData: () => ({ data: rgba }),
          };
        }
      },
    });
    vi.stubGlobal('location', { href: 'https://cocapair.test/' });
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          workerSelf.postMessage = (data) => this.onmessage({ data });
        }

        postMessage(data) {
          void workerSelf.onmessage({ data });
        }

        terminate() {}
      },
    );
    vi.stubGlobal('createImageBitmap', async () => ({
      width: 640,
      height: 640,
      close() {},
    }));
    await objectDetector.load();
    const detections = await objectDetector.detect({
      readyState: 2,
      videoWidth: 640,
    });
    expect(
      detections.map((detection) => detection.confidence).sort((a, b) => a - b),
    ).toEqual(acceptedScores);
    // This is the same filter called by useObjectDetection before onDetections.
    const forUi = validCanDetections(detections);
    const context = {
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: () => ({ width: 100 }),
    };
    drawDetections(context, forUi, 640, 640, 390, 650);
    expect(context.strokeRect).toHaveBeenCalledTimes(6);
    for (const score of acceptedScores)
      expect(
        context.fillText.mock.calls.some(([label]) =>
          label.endsWith(`${Math.round(score * 100)}%`),
        ),
      ).toBe(true);
    expect(model.run).toHaveBeenCalledOnce();
  });
});

describe('threshold boundary and documented exclusions', () => {
  it('accepts the Float32 representation of 0.70 but rejects the immediately lower Float32 value', () => {
    const boundary = Math.fround(0.7);
    expect(boundary).toBe(0.699999988079071);
    expect(meetsConfidenceThreshold(boundary)).toBe(true);
    expect(meetsConfidenceThreshold(boundary - 2 ** -24)).toBe(false);
  });

  it('attributes an overlapping 0.79 candidate to NMS, not the confidence filter', () => {
    const output = outputForScores([0.79, 0.85]);
    output[1] = output[0];
    const detections = decodeOutput(output, [1, 6, 8400], letterbox(640, 640));
    output[1] = output[0] + 0.1;
    expect(
      decodeOutput(output, [1, 6, 8400], letterbox(640, 640)),
    ).toHaveLength(2);
    expect(detections).toHaveLength(1);
    expect(detections[0].confidence).toBeCloseTo(0.85);
  });

  it('preserves three-consecutive-result hug confirmation for accepted scores below 0.8', () => {
    const pair = [0.72, 0.75].map((confidence, index) => ({
      classId: index,
      confidence: Math.fround(confidence),
      bbox: { x: 0.1 + index * 0.2, y: 0.2, width: 0.2, height: 0.5 },
    }));
    const hug = new HugConfirmation();
    expect(hug.update(pair)).toBe(false);
    expect(hug.update(pair)).toBe(false);
    expect(hug.update(pair)).toBe(true);
    expect(hug.update(pair)).toBe(false);
  });
});
