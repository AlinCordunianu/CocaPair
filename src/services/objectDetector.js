class ObjectDetector {
  worker = null;
  loading = null;
  nextId = 0;
  pending = new Map();
  busy = false;
  listeners = new Set();
  snapshot = { state: 'idle', info: null, error: null };

  getSnapshot = () => this.snapshot;

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  update(snapshot) {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }

  getWorker() {
    if (!this.worker) {
      const base = new URL(import.meta.env.BASE_URL, location.href);
      this.worker = new Worker(new URL('runtime/detector-worker.js', base));
      this.worker.onmessage = (event) => {
        const task = this.pending.get(event.data.id);
        if (!task) return;
        clearTimeout(task.timer);
        this.pending.delete(event.data.id);
        if (event.data.type === 'error')
          task.reject(new Error(event.data.message));
        else task.resolve(event.data);
      };
      this.worker.onerror = (event) =>
        this.failWorker(
          new Error(
            event.message || 'The local detector stopped unexpectedly.',
          ),
        );
    }
    return this.worker;
  }

  failWorker(error) {
    this.worker?.terminate();
    this.worker = null;
    this.loading = null;
    for (const task of this.pending.values()) {
      clearTimeout(task.timer);
      task.reject(error);
    }
    this.pending.clear();
    this.update({ state: 'error', info: null, error: error.message });
  }

  request(request, transfer = []) {
    const worker = this.getWorker();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.failWorker(
            new Error(
              'The detector took too long to respond. Please try again.',
            ),
          ),
        120_000,
      );

      this.pending.set(request.id, { resolve, reject, timer });
      try {
        worker.postMessage(request, transfer);
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(request.id);
        reject(error);
      }
    });
  }

  load() {
    if (this.loading) return this.loading;
    this.update({ state: 'loading', info: null, error: null });
    const base = new URL(import.meta.env.BASE_URL, location.href);
    this.loading = this.request({
      id: ++this.nextId,
      type: 'load',
      modelUrl: new URL('models/best.tflite', base).href,
      runtimeUrl: new URL('runtime/', base).href,
    })
      .then((response) => {
        if (response.type !== 'loaded')
          throw new Error('Unexpected detector response.');
        this.update({ state: 'ready', info: response.info, error: null });
        return response.info;
      })
      .catch((error) => {
        this.loading = null;
        this.update({ state: 'error', info: null, error: error.message });
        throw error;
      });
    return this.loading;
  }

  async detect(video) {
    if (
      this.busy ||
      this.snapshot.state !== 'ready' ||
      video.readyState < 2 ||
      !video.videoWidth
    )
      return null;
    this.busy = true;
    let bitmap = null;
    try {
      bitmap = await createImageBitmap(video);
      const request = { id: ++this.nextId, type: 'detect', bitmap };
      const response = await this.request(request, [bitmap]);
      if (response.type !== 'detections')
        throw new Error('Unexpected inference response.');
      return response.detections;
    } finally {
      bitmap?.close();
      this.busy = false;
    }
  }

  dispose() {
    this.failWorker(new Error('Detector closed.'));
    this.update({ state: 'idle', info: null, error: null });
  }
}

export const objectDetector = new ObjectDetector();
if (import.meta.hot) import.meta.hot.dispose(() => objectDetector.dispose());
