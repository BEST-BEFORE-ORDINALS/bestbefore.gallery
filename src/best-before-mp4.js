import { BufferTarget, CanvasSource, EncodedAudioPacketSource, EncodedPacket, Mp4OutputFormat, Output, Quality, canEncodeVideo } from 'mediabunny';

const FPS = 30;
const VIDEO_CODEC = 'avc1.640029'; // H.264 High, Level 4.1, 8-bit 4:2:0.
const VIDEO_BITRATE = 6_000_000;

function waitUntil(deadline, signal) {
    signal.throwIfAborted();
    const delay = deadline - performance.now();
    if (delay <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const aborted = () => { clearTimeout(timer); reject(signal.reason); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', aborted); resolve(); }, delay);
        signal.addEventListener('abort', aborted, { once: true });
    });
}

export async function encodeRecording({ seconds, width, height, signal, getFrame, onProgress, onFinishing }) {
    const quality = new Quality({ bitrate: VIDEO_BITRATE, bitrateMode: 'constant' });
    const videoOptions = { codec: 'avc', fullCodecString: VIDEO_CODEC, quality, latencyMode: 'realtime', keyFrameInterval: 2 };
    const supported = await canEncodeVideo('avc', { ...videoOptions, width, height, frameRate: FPS });
    signal.throwIfAborted();
    if (!supported) throw new Error('This browser cannot export the required H.264 + AAC MP4. Try an updated Chrome or Safari.');

    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Unable to prepare the recording canvas.');
    const target = new BufferTarget();
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
    let videoBytes = 0;
    let videoFrames = 0;
    const video = new CanvasSource(canvas, {
        ...videoOptions,
        onEncodedPacket(packet) { videoBytes += packet.data.byteLength; videoFrames++; },
    });
    const audio = new EncodedAudioPacketSource('aac');
    output.addVideoTrack(video, { frameRate: FPS });
    output.addAudioTrack(audio);
    // One complete 1024-sample AAC-LC stereo silent access unit, generated with:
    // ffmpeg -f lavfi -i anullsrc=r=48000:cl=stereo -t 0.1 -c:a aac -b:a 128k -f adts silence.aac
    // Strip ADTS headers and the first encoder-identification packet. Silence compresses to six bytes.
    // Repeating this unit avoids browser AAC support/priming differences; no microphone is involved.
    const silence = new Uint8Array([0x21, 0x10, 0x04, 0x60, 0x8c, 0x1c]);
    const audioMetadata = { decoderConfig: { codec: 'mp4a.40.2', numberOfChannels: 2, sampleRate: 48000, description: new Uint8Array([0x11, 0x90]) } };
    let audioSample = 0;
    const addSilenceUntil = async end => {
        while (audioSample < end) {
            signal.throwIfAborted();
            const count = Math.min(1024, seconds * 48000 - audioSample);
            await audio.add(new EncodedPacket(silence, 'key', audioSample / 48000, count / 48000), audioSample === 0 ? audioMetadata : undefined);
            audioSample += count;
        }
    };
    let cancelled = null;
    const cancel = () => { cancelled ??= output.cancel().catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
        signal.throwIfAborted();
        await output.start();
        const started = performance.now();
        const frames = seconds * FPS;
        for (let index = 0; index < frames; index++) {
            await waitUntil(started + index * 1000 / FPS, signal);
            signal.throwIfAborted();
            const bitmap = await getFrame();
            try {
                signal.throwIfAborted();
                context.drawImage(bitmap, 0, 0, width, height);
                // Explicit timestamps and durations, not MediaRecorder's variable capture clock.
                await video.add(index / FPS, 1 / FPS);
            } finally { bitmap.close(); }
            if (index % FPS === 0) {
                await addSilenceUntil(Math.min(seconds, index / FPS + 1) * 48000);
                onProgress(index / FPS);
            }
        }
        await waitUntil(started + seconds * 1000, signal);
        signal.throwIfAborted();
        onFinishing();
        video.close(); audio.close();
        await output.finalize();
        signal.throwIfAborted();
        // Never download a partial file or an encoder result exceeding the delivery budget.
        if (videoFrames !== frames || videoBytes * 8 / seconds > 8_000_000 || !target.buffer?.byteLength) {
            throw new Error('The browser could not create a compatible MP4. Please try recording again in another browser.');
        }
        return { blob: new Blob([target.buffer], { type: 'video/mp4' }), width, height, seconds };
    } catch (error) {
        cancel();
        await cancelled;
        throw signal.aborted ? signal.reason : error;
    } finally {
        signal.removeEventListener('abort', cancel);
        canvas.width = canvas.height = 0;
    }
}
