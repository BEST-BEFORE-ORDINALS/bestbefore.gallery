const CHAIN_ORIGIN = 'https://ordinals.com';
const CHANNEL = 'best-before-player-v1';

// This runs inside an opaque sandbox, alongside the original on-chain renderer.
function playerBridge(channel, token) {
    const send = (type, data = {}) => parent.postMessage({ channel, token, type, ...data }, '*');
    let active = null;
    let ready = false;
    let previousPhase = null;
    const mime = ['video/mp4;codecs=avc1.640033', 'video/mp4'].find(type => globalThis.MediaRecorder?.isTypeSupported(type));
    const watch = setInterval(() => {
        const base = document.getElementById('artwork-canvas');
        const phase = typeof ACTIVE_PHASE === 'undefined' ? null : ACTIVE_PHASE;
        const rendering = typeof textureProgressing !== 'undefined' && textureProgressing;
        if (!base || !phase || rendering) return;
        if (phase === 'OPEN' && (typeof glContext === 'undefined' || !glContext || textureDirty)) return;
        if (!ready || phase !== previousPhase) {
            ready = true;
            previousPhase = phase;
            send('ready', { phase, canRecord: phase === 'OPEN' && !!mime });
        }
    }, 200);

    async function record(seconds) {
        if (active || !ready || ![15, 30, 60].includes(seconds)) return;
        if (!mime || ACTIVE_PHASE !== 'OPEN') return send('error', { message: 'MP4 recording is not available for this artwork in this browser.' });
        const base = document.getElementById('artwork-canvas');
        const layer = document.getElementById('gl-layer');
        const canvas = document.createElement('canvas');
        canvas.width = base.width;
        canvas.height = base.height;
        const ctx = canvas.getContext('2d');
        const state = { cancelled: false, raf: 0, timer: 0, progress: 0, stream: null, recorder: null };
        active = state;
        try {
            const paint = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(base, 0, 0);
                ctx.drawImage(layer, 0, 0);
                state.raf = requestAnimationFrame(paint);
            };
            paint();
            state.stream = canvas.captureStream(30);
            const recorder = new MediaRecorder(state.stream, { mimeType: mime, videoBitsPerSecond: 50000000 });
            state.recorder = recorder;
            const chunks = [];
            recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
            const stopped = new Promise((resolve, reject) => {
                recorder.onstop = resolve;
                recorder.onerror = event => reject(event.error || new Error('Recording failed.'));
            });
            recorder.start(1000);
            const started = performance.now();
            send('recording', { seconds, elapsed: 0 });
            state.progress = setInterval(() => send('recording', { seconds, elapsed: Math.min(seconds, (performance.now() - started) / 1000) }), 250);
            state.timer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, seconds * 1000);
            await stopped;
            if (state.cancelled) send('cancelled');
            else {
                send('finishing');
                const blob = new Blob(chunks, { type: recorder.mimeType });
                send('video', { blob, seconds, width: canvas.width, height: canvas.height });
            }
        } catch (error) {
            send('error', { message: error.message || 'Unable to record. Please try again.' });
        } finally {
            cancelAnimationFrame(state.raf);
            clearTimeout(state.timer);
            clearInterval(state.progress);
            state.stream?.getTracks().forEach(track => track.stop());
            active = null;
        }
    }

    function cancel() {
        if (!active) return;
        active.cancelled = true;
        if (active.recorder?.state === 'recording') active.recorder.stop();
    }
    addEventListener('message', async event => {
        if (event.source !== parent || event.data?.channel !== channel || event.data?.token !== token) return;
        const { type, seconds, filename } = event.data;
        if (type === 'record') void record(seconds);
        if (type === 'cancel') cancel();
        if (type === 'save' && ready && !active) {
            try { await saveFullArtwork({ fileName: filename }); }
            catch { send('error', { message: 'Unable to save PNG. Please try again.' }); }
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') send('escape');
        if (active && event.key.toLowerCase() === 's') { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && active) { cancel(); send('error', { message: 'Recording stopped. Keep this tab visible while recording.' }); }
    });
    addEventListener('pagehide', () => { cancel(); clearInterval(watch); });
}

export function buildBestBeforeDocument(source, id, token) {
    if (!/^[a-f0-9]{64}i\d+$/.test(id)) throw new Error('Invalid artwork ID.');
    const selfId = 'return window.location.pathname.split("/").pop();';
    const localMode = 'location.protocol === "file:" || location.origin === "null"';
    if (!source.includes(selfId) || !source.includes(localMode)) throw new Error('This artwork version does not support in-page recording.');
    // Preserve chain identity in srcdoc and keep real chain lookups enabled.
    source = source.replace(selfId, `return ${JSON.stringify(id)};`).replace(localMode, 'false');
    const url = `${CHAIN_ORIGIN}/content/${id}`;
    const setup = `<base href="${url}"><style>
        html,body { background: transparent !important; }
        #artwork-wrapper { transform: none !important; position: absolute !important; inset: 0 !important; width:100% !important; height:100% !important; }
        #artwork-canvas,#gl-layer { left:0 !important; top:0 !important; width:100% !important; height:100% !important; border:0 !important; }
    </style><script>
        const chainFetch = window.fetch.bind(window);
        window.fetch = (input, init) => chainFetch(typeof input === 'string' ? new URL(input, ${JSON.stringify(url)}).href : input, init);
    </script>`;
    source = source.replace(/<head([^>]*)>/i, `<head$1>${setup}`);
    return source.replace(/<\/body>/i, `<script>(${playerBridge.toString()})(${JSON.stringify(CHANNEL)},${JSON.stringify(token)});</script></body>`);
}

export function createBestBeforePlayer({ frame, viewport, controls, id, onClose = () => {} }) {
    const token = crypto.randomUUID();
    const abort = new AbortController();
    const number = Number(id.split('i').pop()) + 1;
    let disposed = false;
    let ready = false;
    let canRecord = false;
    let busy = false;
    const originalStyle = frame.getAttribute('style');
    const originalSandbox = frame.getAttribute('sandbox');
    controls.classList.add('bb-capture');
    controls.innerHTML = `<button type="button" data-bb-save disabled>Save PNG</button>
        <span class="bb-capture__divider" aria-hidden="true"></span>
        <label class="bb-capture__duration"><span class="sr-only">Recording duration</span><select aria-label="Recording duration" disabled><option value="15">15 sec</option><option value="30" selected>30 sec</option><option value="60">60 sec</option></select></label>
        <button type="button" data-bb-record disabled><span class="bb-record-dot" aria-hidden="true"></span>Record MP4</button>
        <span class="bb-capture__status" role="status" aria-live="polite">Rendering artwork…</span>`;
    const save = controls.querySelector('[data-bb-save]');
    const record = controls.querySelector('[data-bb-record]');
    const duration = controls.querySelector('select');
    const status = controls.querySelector('[role="status"]');
    const send = (type, data = {}) => frame.contentWindow?.postMessage({ channel: CHANNEL, token, type, ...data }, '*');
    const update = () => {
        save.disabled = !ready || busy;
        duration.disabled = !canRecord || busy;
        record.disabled = !canRecord && !busy;
        record.classList.toggle('is-recording', busy);
        record.innerHTML = busy ? 'Cancel recording' : '<span class="bb-record-dot" aria-hidden="true"></span>Record MP4';
    };
    const savePNG = () => { if (ready && !busy) send('save', { filename: `BEST BEFORE ${number}.png` }); };
    save.addEventListener('click', savePNG);
    record.addEventListener('click', () => {
        if (busy) return send('cancel');
        if (!canRecord) return;
        busy = true; update(); status.textContent = 'Starting recording…';
        send('record', { seconds: Number(duration.value) });
    });
    const receive = event => {
        const data = event.data;
        if (disposed || event.source !== frame.contentWindow || data?.channel !== CHANNEL || data?.token !== token) return;
        if (data.type === 'ready') {
            ready = true; canRecord = data.canRecord;
            frame.style.visibility = 'visible';
            viewport.classList.add('is-ready');
            status.textContent = canRecord ? '1800 × 3200 · MP4' : data.phase === 'OPEN' ? 'MP4 recording unavailable in this browser' : 'Recording available for open artworks';
            update();
        }
        if (data.type === 'recording') status.textContent = `Recording ${Math.floor(data.elapsed)} / ${data.seconds}s`;
        if (data.type === 'finishing') status.textContent = 'Preparing MP4…';
        if (data.type === 'cancelled') { busy = false; update(); status.textContent = 'Recording cancelled'; }
        if (data.type === 'error') { busy = false; update(); status.textContent = data.message; }
        if (data.type === 'escape') onClose();
        if (data.type === 'video' && data.blob instanceof Blob && data.blob.type.startsWith('video/mp4')) {
            const url = URL.createObjectURL(data.blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `BEST-BEFORE-${number}-${data.width}x${data.height}-${data.seconds}s.mp4`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
            busy = false; update(); status.textContent = `${data.seconds}s MP4 saved`;
        }
    };
    window.addEventListener('message', receive);
    const keydown = event => {
        if (event.key.toLowerCase() !== 's' || event.ctrlKey || event.metaKey || event.altKey || event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
        if (ready && !busy) { event.preventDefault(); savePNG(); }
    };
    document.addEventListener('keydown', keydown);
    const resize = () => {
        const scale = viewport.getBoundingClientRect().width / 900;
        frame.style.cssText = `position:absolute!important;width:900px!important;height:1600px!important;max-width:none!important;max-height:none!important;inset:auto!important;left:50%!important;top:50%!important;border:0;transform-origin:center;transform:translate(-50%,-50%) scale(${scale})!important;visibility:visible;`;
    };
    frame.setAttribute('sandbox', 'allow-scripts allow-downloads');
    frame.removeAttribute('src');
    viewport.classList.add('bb-player-viewport');
    const observer = new ResizeObserver(resize);
    observer.observe(viewport); resize();
    fetch(`${CHAIN_ORIGIN}/content/${id}`, { signal: abort.signal }).then(async response => {
        if (!response.ok) throw new Error('Unable to load the artwork. Please reload.');
        const source = await response.text();
        if (!disposed) frame.srcdoc = buildBestBeforeDocument(source, id, token);
    }).catch(error => { if (!disposed) status.textContent = error.message; });
    return {
        savePNG,
        destroy() {
            disposed = true; abort.abort(); send('cancel');
            observer.disconnect();
            window.removeEventListener('message', receive);
            document.removeEventListener('keydown', keydown);
            frame.removeAttribute('srcdoc');
            frame.src = 'about:blank';
            if (originalSandbox === null) frame.removeAttribute('sandbox'); else frame.setAttribute('sandbox', originalSandbox);
            if (originalStyle === null) frame.removeAttribute('style'); else frame.setAttribute('style', originalStyle);
            viewport.classList.remove('bb-player-viewport', 'is-ready');
            controls.replaceChildren();
        },
    };
}
