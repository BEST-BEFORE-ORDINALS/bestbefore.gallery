// Kept identical in both sites; the encoder is loaded only when recording starts.
export function recordingDimensions(width, height) {
    if (!(width >= 2 && height >= 2 && Number.isFinite(width) && Number.isFinite(height))) throw new Error('Invalid artwork dimensions.');
    const landscape = width > height;
    const scale = Math.min(1, (landscape ? 1920 : 1080) / width, (landscape ? 1080 : 1920) / height);
    return { width: Math.max(2, Math.floor(width * scale / 2) * 2), height: Math.max(2, Math.floor(height * scale / 2) * 2) };
}

export function supportsRecording() {
    return typeof VideoEncoder !== 'undefined' && typeof createImageBitmap === 'function';
}

export function createBestBeforeRecorder(send) {
    let active = null;
    let nextRequest = 0;
    const pending = new Map();
    const request = (type, signal, runId) => new Promise((resolve, reject) => {
        const requestId = ++nextRequest;
        const finish = (error, data) => {
            clearTimeout(timer);
            signal.removeEventListener('abort', aborted);
            pending.delete(requestId);
            if (error) reject(error); else resolve(data);
        };
        const aborted = () => finish(signal.reason);
        const timer = setTimeout(() => finish(new Error('The artwork stopped responding. Please try recording again.')), 10000);
        pending.set(requestId, { runId, finish });
        signal.addEventListener('abort', aborted, { once: true });
        if (signal.aborted) return aborted();
        send(type, { requestId, runId });
    });
    return {
        receive(data) {
            if (!['capture-ready', 'capture-frame', 'capture-error'].includes(data.type)) return;
            const item = pending.get(data.requestId);
            if (!item || item.runId !== data.runId) { data.bitmap?.close(); return; }
            item.finish(data.type === 'capture-error' ? new Error(data.message) : null, data);
        },
        cancel(reason = new DOMException('Recording cancelled', 'AbortError')) { active?.abort(reason); },
        async record(seconds, onProgress, onFinishing) {
            if (active) throw new Error('A recording is already in progress.');
            if (![15, 30, 60].includes(seconds)) throw new Error('Choose 15, 30, or 60 seconds.');
            if (!supportsRecording()) throw new Error('MP4 recording requires a browser with H.264 encoding support. Try an updated Chrome or Safari.');
            const controller = new AbortController();
            active = controller;
            const { signal } = controller;
            const runId = crypto.randomUUID();
            const stop = () => send('capture-stop', { runId });
            signal.addEventListener('abort', stop, { once: true });
            try {
                const { encodeRecording } = await import('./best-before-mp4.js');
                signal.throwIfAborted();
                const size = await request('capture-start', signal, runId);
                return await encodeRecording({
                    seconds, width: size.width, height: size.height, signal, onProgress, onFinishing,
                    getFrame: async () => (await request('capture-frame', signal, runId)).bitmap,
                });
            } finally {
                stop();
                signal.removeEventListener('abort', stop);
                if (active === controller) active = null;
            }
        },
    };
}
