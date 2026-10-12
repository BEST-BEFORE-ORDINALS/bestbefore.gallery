import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildBestBeforeDocument } from '../src/best-before-player.js';

test('the live canvas is revealed during drawing, while exports wait for completion', () => {
    const source = '<head></head><body>return window.location.pathname.split("/").pop(); location.protocol === "file:" || location.origin === "null"</body>';
    const html = buildBestBeforeDocument(source, `${'a'.repeat(64)}i127`, 'test-token');
    const bridge = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
    const messages = [];
    let canvas = null;
    let tick;
    const context = vm.createContext({
        parent: { postMessage: message => messages.push(message) },
        document: { getElementById: () => canvas, addEventListener() {} },
        addEventListener() {},
        setInterval: callback => { tick = callback; },
        ACTIVE_PHASE: 'OPEN', textureProgressing: true, textureDirty: true,
        glContext: {}, MediaRecorder: { isTypeSupported: () => true },
    });
    vm.runInContext(bridge, context);
    tick();
    assert.equal(messages.length, 0, 'keep loading preview until a canvas exists');
    canvas = {};
    tick();
    assert.deepEqual(messages.map(m => m.type), ['drawing']);
    tick();
    assert.equal(messages.length, 1, 'drawing notification is sent once');
    context.textureProgressing = false;
    tick();
    assert.equal(messages.length, 1, 'wait for the final GPU texture upload');
    context.textureDirty = false;
    tick();
    assert.deepEqual(messages.map(m => m.type), ['drawing', 'ready']);
    assert.equal(messages[1].canRecord, true);
    assert.ok(messages.every(m => m.token === 'test-token'));
});

test('injected bridge preserves replacement metacharacters in serialized code', async()=>{
  const {buildBestBeforeDocument}=await import('../src/best-before-player.js');
  const id='a'.repeat(64)+'i1';
  const source='<html><head></head><body><script>function self(){return window.location.pathname.split("/").pop();} const local=location.protocol === "file:" || location.origin === "null";</script></body></html>';
  // A minifier may name a variable $, producing the same $& replacement sequence.
  const result=buildBestBeforeDocument(source,id,'literal$&token');
  assert.ok(result.includes('"literal$&token"'));
  assert.equal((result.match(/<\/body>/g)||[]).length,1);
});
