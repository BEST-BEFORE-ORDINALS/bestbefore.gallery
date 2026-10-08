// Keep the original on-chain document and its native-resolution canvases intact.
// A stable portrait viewport also avoids its <=400px static-render fallback.
export function fitBestBeforeFrame(frame, viewport, { phase = 'open', focusOnLoad = false } = {}) {
    const originalStyle = frame.getAttribute('style');
    let currentPhase = phase;
    let disposed = false;
    const resize = () => {
        if (disposed) return;
        const inset = currentPhase === 'open' ? 0.9 : 1;
        const scale = viewport.clientWidth / (900 * inset);
        const styles = {
            position: 'absolute', width: '900px', height: '1600px',
            'max-width': 'none', 'max-height': 'none',
            inset: 'auto', left: '50%', top: '50%', border: '0',
            'transform-origin': 'center',
            transform: `translate(-50%, -50%) scale(${scale})`,
        };
        for (const [name, value] of Object.entries(styles)) frame.style.setProperty(name, value, 'important');
    };
    const focus = () => {
        if (disposed || !frame.isConnected) return;
        frame.focus({ preventScroll: true });
        frame.contentWindow?.focus();
    };
    const loaded = () => {
        resize();
        if (focusOnLoad && (document.activeElement === document.body || document.activeElement === frame)) focus();
    };
    frame.addEventListener('load', loaded);
    const observer = new ResizeObserver(resize);
    observer.observe(viewport);
    resize();
    if (focusOnLoad) focus();
    return {
        focus,
        setPhase(phase) { currentPhase = String(phase).toLowerCase(); resize(); },
        destroy() {
            disposed = true;
            observer.disconnect();
            frame.removeEventListener('load', loaded);
            if (originalStyle === null) frame.removeAttribute('style');
            else frame.setAttribute('style', originalStyle);
        },
    };
}
