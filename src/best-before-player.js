import { createBestBeforeRecorder, recordingDimensions, supportsRecording } from './best-before-recorder.js';

const CHAIN_ORIGIN = 'https://ordinals.com';
const CHANNEL = 'best-before-player-v1';

// This runs inside an opaque sandbox, alongside the original on-chain renderer.
function playerBridge(channel, token, fitDimensions) {
    const send = (type, data = {}, transfer = []) => parent.postMessage({ channel, token, type, ...data }, '*', transfer);
    let active = null;
    let ready = false;
    let visible = false;
    let previousPhase = null;
    const canCapture = typeof createImageBitmap === 'function';
    const watch = setInterval(() => {
        const base = document.getElementById('artwork-canvas');
        const phase = typeof ACTIVE_PHASE === 'undefined' ? null : ACTIVE_PHASE;
        const rendering = typeof textureProgressing !== 'undefined' && textureProgressing;
        if (!base || !phase) return;
        // Keep the state preview visible until the responsive square face is painted.
        if (phase !== 'OPEN' && (typeof PHASE_CACHE === 'undefined' || !PHASE_CACHE.bitmap || PHASE_CACHE.phase !== phase)) return;
        // Reveal the original canvas while its progressive renderer is running.
        // Export readiness still waits for the completed texture below.
        if (!visible) {
            visible = true;
            send('drawing', { phase });
        }
        if (rendering) return;
        if (phase === 'OPEN' && (typeof glContext === 'undefined' || !glContext || textureDirty)) return;
        if (!ready || phase !== previousPhase) {
            ready = true;
            previousPhase = phase;
            send('ready', { phase, canRecord: phase === 'OPEN' && canCapture });
        }
    }, 200);

    function cancel() {
        if (!active) return;
        active.cancelled = true;
        active.canvas.width = active.canvas.height = 0;
        active = null;
    }
    async function capture({ type, requestId, runId }) {
        let bitmap;
        try {
            if (type === 'capture-start') {
                if (active || !ready || ACTIVE_PHASE !== 'OPEN' || !canCapture) throw new Error('Recording is unavailable for this artwork.');
                const base = document.getElementById('artwork-canvas');
                const canvas = document.createElement('canvas');
                const size = fitDimensions(base.width, base.height);
                canvas.width = size.width; canvas.height = size.height;
                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) throw new Error('Unable to prepare artwork capture.');
                active = { canvas, ctx, runId, cancelled: false };
                send('capture-ready', { requestId, runId, ...size });
                return;
            }
            const state = active;
            if (!state || state.runId !== runId || ACTIVE_PHASE !== 'OPEN') throw new Error('Recording is no longer available.');
            const { canvas, ctx } = state;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(document.getElementById('artwork-canvas'), 0, 0, canvas.width, canvas.height);
            ctx.drawImage(document.getElementById('gl-layer'), 0, 0, canvas.width, canvas.height);
            bitmap = await createImageBitmap(canvas);
            if (state.cancelled || active !== state) { bitmap.close(); return; }
            send('capture-frame', { requestId, runId, bitmap }, [bitmap]);
        } catch (error) {
            bitmap?.close();
            send('capture-error', { requestId, runId, message: error.message || 'Unable to capture the artwork.' });
        }
    }
    addEventListener('message', async event => {
        if (event.source !== parent || event.data?.channel !== channel || event.data?.token !== token) return;
        const { type, filename, runId } = event.data;
        if (type === 'capture-start' || type === 'capture-frame') void capture(event.data);
        if (type === 'capture-stop' && active?.runId === runId) cancel();
        if (type === 'exhibition') document.documentElement.classList.toggle('exhibition-display', !!event.data.enabled);
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
        html.exhibition-display #artwork-wrapper > :not(canvas) { display:none !important; }
        #artwork-wrapper { transform: none !important; position: absolute !important; inset: 0 !important; width:100% !important; height:100% !important; }
        #artwork-canvas,#gl-layer { left:0 !important; top:0 !important; width:100% !important; height:100% !important; border:0 !important; }
    </style><script>
        const chainFetch = window.fetch.bind(window);
        window.fetch = (input, init) => chainFetch(typeof input === 'string' ? new URL(input, ${JSON.stringify(url)}).href : input, init);
    </script>`;
    source = source.replace(/<head([^>]*)>/i, `<head$1>${setup}`);
    // A callback keeps minified $& sequences literal instead of expanding the match.
    return source.replace(/<\/body>/i, () => `<script>(${playerBridge.toString()})(${JSON.stringify(CHANNEL)},${JSON.stringify(token)},${recordingDimensions.toString()});</script></body>`);
}

export function createBestBeforePlayer({ frame, viewport, controls, id, initialPhase = 'OPEN', onPhase = () => {}, onClose = () => {} }) {
    const token = crypto.randomUUID();
    const abort = new AbortController();
    const number = Number(id.split('i').pop()) + 1;
    let disposed = false;
    let ready = false;
    let canRecord = false;
    let busy = false;
    let exhibition = false;
    let currentPhase = initialPhase.toUpperCase();
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
    const recorder = createBestBeforeRecorder(send);
    const update = () => {
        save.disabled = !ready || busy;
        duration.disabled = !canRecord || busy;
        record.disabled = !canRecord && !busy;
        record.classList.toggle('is-recording', busy);
        record.innerHTML = busy ? 'Cancel recording' : '<span class="bb-record-dot" aria-hidden="true"></span>Record MP4';
    };
    const savePNG = () => { if (ready && !busy) send('save', { filename: `BEST BEFORE ${number}.png` }); };
    save.addEventListener('click', savePNG);
    const download = data => {
        const url = URL.createObjectURL(data.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `BEST-BEFORE-${number}-${data.width}x${data.height}-${data.seconds}s.mp4`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    };
    record.addEventListener('click', async () => {
        if (busy) return recorder.cancel();
        if (!canRecord) return;
        busy = true; update(); status.textContent = 'Starting recording…';
        try {
            const result = await recorder.record(Number(duration.value),
                elapsed => { status.textContent = `Recording ${Math.floor(elapsed)} / ${duration.value}s`; },
                () => { status.textContent = 'Preparing MP4…'; });
            if (!disposed) { download(result); status.textContent = `${result.seconds}s MP4 saved`; }
        } catch (error) {
            if (!disposed) status.textContent = error.name === 'AbortError' ? 'Recording cancelled' : error.message;
        } finally {
            busy = false;
            if (!disposed) update();
        }
    });
    const receive = event => {
        const data = event.data;
        if (disposed || event.source !== frame.contentWindow || data?.channel !== CHANNEL || data?.token !== token) return;
        recorder.receive(data);
        if (['drawing', 'ready'].includes(data.type)) {
            currentPhase = data.phase;
            onPhase(currentPhase);
            resize();
        }
        if (data.type === 'drawing') {
            send('exhibition', { enabled: exhibition });
            viewport.classList.add('is-live');
            status.textContent = 'Artwork taking shape…';
        }
        if (data.type === 'ready') {
            ready = true; canRecord = data.canRecord && supportsRecording();
            frame.style.visibility = 'visible';
            viewport.classList.add('is-live', 'is-ready');
            status.textContent = canRecord ? '1080p · MP4 for X' : data.phase === 'OPEN' ? 'MP4 recording needs an updated browser with H.264 support' : 'Recording available for open artworks';
            update();
        }
        if (data.type === 'error') {
            recorder.cancel(new Error(data.message));
            status.textContent = data.message;
        }
        if (data.type === 'escape') onClose();
    };
    window.addEventListener('message', receive);
    const keydown = event => {
        if (event.key.toLowerCase() !== 's' || event.ctrlKey || event.metaKey || event.altKey || event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
        if (ready && !busy) { event.preventDefault(); savePNG(); }
    };
    document.addEventListener('keydown', keydown);
    const visibility = () => { if (document.hidden) recorder.cancel(new Error('Recording stopped. Keep this tab visible while recording.')); };
    document.addEventListener('visibilitychange', visibility);
    const resize = () => {
        const box = viewport.getBoundingClientRect();
        const height = ['SEALED', 'EXPIRED'].includes(currentPhase) ? 900 : 1600;
        const scale = Math.max(box.width / 900, box.height / height);
        frame.style.cssText = `position:absolute!important;width:900px!important;height:${height}px!important;max-width:none!important;max-height:none!important;inset:auto!important;left:50%!important;top:50%!important;border:0;transform-origin:center;transform:translate(-50%,-50%) scale(${scale})!important;visibility:visible;`;
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
        setExhibition(enabled) { exhibition=enabled; send('exhibition', { enabled }); },
        destroy() {
            disposed = true; abort.abort(); recorder.cancel();
            observer.disconnect();
            window.removeEventListener('message', receive);
            document.removeEventListener('keydown', keydown);
            document.removeEventListener('visibilitychange', visibility);
            frame.removeAttribute('srcdoc');
            frame.src = 'about:blank';
            if (originalSandbox === null) frame.removeAttribute('sandbox'); else frame.setAttribute('sandbox', originalSandbox);
            if (originalStyle === null) frame.removeAttribute('style'); else frame.setAttribute('style', originalStyle);
            viewport.classList.remove('bb-player-viewport', 'is-live', 'is-ready');
            controls.replaceChildren();
        },
    };
}
