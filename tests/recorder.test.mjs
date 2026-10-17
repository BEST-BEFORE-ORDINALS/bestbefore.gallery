import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { recordingDimensions, createBestBeforeRecorder } from '../src/best-before-recorder.js';
import { buildBestBeforeDocument } from '../src/best-before-player.js';

test('capture fits portrait and landscape bounds without upscaling or odd dimensions', () => {
    assert.deepEqual(recordingDimensions(1800, 3200), { width: 1080, height: 1920 });
    assert.deepEqual(recordingDimensions(3200, 1800), { width: 1920, height: 1080 });
    assert.deepEqual(recordingDimensions(1800, 1800), { width: 1080, height: 1080 });
    assert.deepEqual(recordingDimensions(901, 1601), { width: 900, height: 1600 });
    assert.throws(() => recordingDimensions(0, 3200));
    assert.throws(() => recordingDimensions(Infinity, 3200));
});

test('unsupported durations and encoders cannot start a raw fallback recording', async () => {
    const messages = [];
    const recorder = createBestBeforeRecorder((...args) => messages.push(args));
    await assert.rejects(recorder.record(1), /Choose 15, 30, or 60/);
    await assert.rejects(recorder.record(15), /H.264 encoding/);
    assert.equal(messages.length, 0);
});

test('late transferred bitmaps are released rather than retained by a finished session', () => {
    let closed = 0;
    const recorder = createBestBeforeRecorder(() => {});
    recorder.receive({ type: 'capture-frame', requestId: 3, runId: 'old', bitmap: { close() { closed++; } } });
    assert.equal(closed, 1);
});

test('sandbox capture scales both layers, authenticates requests, and discards cancelled frames', async () => {
    const source = '<head></head><body>return window.location.pathname.split("/").pop(); location.protocol === "file:" || location.origin === "null"</body>';
    const html = buildBestBeforeDocument(source, `${'a'.repeat(64)}i210`, 'test-token');
    const bridge = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
    const messages = [], draws = [];
    const parent = { postMessage: (data, origin, transfer) => messages.push({ data, transfer }) };
    const base = { width: 1800, height: 3200 }, layer = {};
    const canvas = { getContext: () => ({ clearRect() {}, drawImage: (...args) => draws.push(args) }) };
    let tick, receive, resolveBitmap;
    vm.runInNewContext(bridge, {
        parent,
        document: { getElementById: id => id === 'artwork-canvas' ? base : layer, createElement: () => canvas, addEventListener() {} },
        addEventListener: (type, callback) => { if (type === 'message') receive = callback; },
        setInterval: callback => { tick = callback; },
        ACTIVE_PHASE: 'OPEN', glContext: {}, textureDirty: false, textureProgressing: false,
        createImageBitmap: () => new Promise(resolve => { resolveBitmap = resolve; }),
    });
    tick();
    const send = (type, extra = {}) => receive({ source: parent, data: { channel: 'best-before-player-v1', token: 'test-token', runId: 'one', requestId: 1, type, ...extra } });
    const before = messages.length;
    await send('capture-start', { token: 'wrong' });
    assert.equal(messages.length, before);
    await send('capture-start');
    assert.equal(messages.at(-1).data.width, 1080);
    assert.equal(messages.at(-1).data.height, 1920);
    await send('capture-frame', { requestId: 2 });
    assert.deepEqual(draws.map(args => args.slice(1)), [[0, 0, 1080, 1920], [0, 0, 1080, 1920]]);
    let closed = 0;
    const bitmap = { close() { closed++; } };
    await send('capture-stop', { runId: 'stale' });
    resolveBitmap(bitmap);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(messages.at(-1).data.type, 'capture-frame');
    assert.equal(messages.at(-1).transfer[0], bitmap);
    await send('capture-frame', { requestId: 3 });
    const count = messages.length;
    await send('capture-stop');
    resolveBitmap(bitmap);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(closed, 1);
    assert.equal(messages.length, count, 'cancelled frames are never transferred');
    assert.equal(canvas.width, 0, 'release capture backing memory');
});
