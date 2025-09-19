import { makeBlob, placeInside, stepBlobs, drawBlobs, scalePositions } from "./blobs";

export function createLamp(canvas, userCfg) {
    const cfg = userCfg;
    const ctx = canvas.getContext("2d", { alpha: true });

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    const buf = typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(1, 1)
        : document.createElement("canvas");
    const bctx = buf.getContext("2d");

    let W = 0, H = 0, RAF = 0, lastW = 0, lastH = 0;
    const blobs = [];

    function resize() {
        dpr = Math.max(1, window.devicePixelRatio || 1);
        const cssW = Math.max(1, canvas.clientWidth || window.innerWidth);
        const cssH = Math.max(1, canvas.clientHeight || window.innerHeight);
        lastW = W || cssW * dpr;
        lastH = H || cssH * dpr;

        W = Math.max(1, Math.floor(cssW * dpr));
        H = Math.max(1, Math.floor(cssH * dpr));

        canvas.width = W; canvas.height = H;
        canvas.style.width = cssW + "px";
        canvas.style.height = cssH + "px";
        buf.width = W; buf.height = H;

        if (blobs.length === 0) {
            for (let i = 0; i < cfg.blobs; i++) {
                const b = makeBlob(cfg);
                placeInside(b, W, H, cfg, dpr);
                blobs.push(b);
            }
        } else {
            const sx = W / lastW, sy = H / lastH;
            scalePositions(blobs, sx, sy);
        }
    }

    let prev = performance.now();
    function loop(step, drawRefract) {
        const now = performance.now();
        const dt = Math.min(1.2, (now - prev) / 16.6667);
        prev = now;

        stepBlobs(blobs, dt, W, H, cfg, dpr);
        drawBlobs(bctx, W, H, blobs, cfg, dpr);
        drawRefract(ctx, buf, W, H, cfg, dpr);

        RAF = requestAnimationFrame(() => loop(step, drawRefract));
    }

    function start(drawRefract) {
        resize();
        prev = performance.now();
        RAF = requestAnimationFrame(() => loop(stepBlobs, drawRefract));
    }

    function stop() {
        cancelAnimationFrame(RAF);
    }

    function onResize() { resize(); }

    return { start, stop, onResize, get size() { return { W, H, dpr, buf, bctx, ctx, blobs }; } };
}
