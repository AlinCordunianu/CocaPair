import {
  isWebGPUSupported,
  loadAndCompile,
  loadLiteRt,
  Tensor,
} from '@litertjs/core';
import { MODEL_INPUT_SIZE } from '../constants/detection';
import { decodeOutput, letterbox } from './detectionMath';
let model = null;
let loading = null;
let busy = false;
const canvas = new OffscreenCanvas(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
const context = canvas.getContext('2d', { willReadFrequently: true });
const pixels = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
const inputBuffer = new Float32Array(pixels * 3);

async function load(modelUrl, runtimeUrl) {
  if (!loading)
    loading = (async () => {
      if (!context)
        throw new Error(
          'Your browser cannot prepare camera images. Please try a current browser.',
        );
      await loadLiteRt(runtimeUrl);
      const response = await fetch(modelUrl);
      if (!response.ok)
        throw new Error(`Unable to load the detector (${response.status}).`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      let backend = 'wasm';
      if (isWebGPUSupported()) {
        try {
          model = await loadAndCompile(bytes, {
            accelerator: 'webgpu',
            gpuOptions: { precision: 'fp32' },
          });
          backend = model.isFullyAccelerated ? 'webgpu' : 'wasm';
        } catch (error) {
          console.info(
            'WebGPU compilation unavailable; using local WebAssembly.',
            error,
          );
        }
      }
      if (!model) model = await loadAndCompile(bytes, { accelerator: 'wasm' });
      const inputs = model.getInputDetails(),
        outputs = model.getOutputDetails();
      const inputShape = Array.from(inputs[0].shape),
        outputShape = Array.from(outputs[0].shape);
      if (
        inputs.length !== 1 ||
        inputs[0].dtype !== 'float32' ||
        inputShape.join(',') !== '1,3,640,640' ||
        outputs.length !== 1 ||
        outputs[0].dtype !== 'float32' ||
        outputShape.join(',') !== '1,6,8400'
      ) {
        model.delete();
        model = null;
        throw new Error(
          'The model tensors do not match the inspected CocaPair export.',
        );
      }
      return {
        backend,
        inputShape,
        outputShape,
        fullyAccelerated: model.isFullyAccelerated,
      };
    })().catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}

async function detect(bitmap) {
  if (!model || !context) {
    bitmap.close();
    throw new Error('Detector is not ready.');
  }
  if (busy) {
    bitmap.close();
    throw new Error('An inference is already in progress.');
  }
  busy = true;
  let input = null;
  let outputs = [];
  try {
    const transform = letterbox(bitmap.width, bitmap.height);
    context.fillStyle = 'rgb(114,114,114)';
    context.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
    context.drawImage(
      bitmap,
      transform.offsetX,
      transform.offsetY,
      transform.resizedWidth,
      transform.resizedHeight,
    );
    const rgba = context.getImageData(
      0,
      0,
      MODEL_INPUT_SIZE,
      MODEL_INPUT_SIZE,
    ).data;
    for (let i = 0, j = 0; i < pixels; i++, j += 4) {
      inputBuffer[i] = rgba[j] / 255;
      inputBuffer[pixels + i] = rgba[j + 1] / 255;
      inputBuffer[2 * pixels + i] = rgba[j + 2] / 255;
    }
    input = new Tensor(inputBuffer, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
    outputs = await model.run(input);
    const data = await outputs[0].data();
    if (!(data instanceof Float32Array))
      throw new Error('Detector returned an unexpected data type.');
    const detections = decodeOutput(
      data,
      Array.from(outputs[0].type.layout.dimensions),
      transform,
    );
    return detections;
  } finally {
    bitmap.close();
    input?.delete();
    for (const output of outputs) output.delete();
    busy = false;
  }
}

self.onmessage = async (event) => {
  const request = event.data;
  let response;
  try {
    if (request.type === 'load') {
      response = {
        id: request.id,
        type: 'loaded',
        info: await load(request.modelUrl, request.runtimeUrl),
      };
    } else {
      response = {
        id: request.id,
        type: 'detections',
        detections: await detect(request.bitmap),
      };
    }
  } catch (error) {
    response = {
      id: request.id,
      type: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'The detector could not complete this request.',
    };
  }
  self.postMessage(response);
};
