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

    function cssSize() {
        // для full-viewport канваса надёжнее брать окно
        const cssW = Math.max(1, window.innerWidth);
        const cssH = Math.max(1, window.innerHeight);
        return { cssW, cssH };
    }

    function resize() {
        const curDpr = Math.max(1, window.devicePixelRatio || 1);
        if (curDpr !== dpr) dpr = curDpr;

        const { cssW, cssH } = cssSize();
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
    function loop(drawRefract) {
        const now = performance.now();
        let dt = (now - prev) / 1000;      // сек
        prev = now;

        stepBlobs(blobs, dt, W, H, cfg, dpr);
        drawBlobs(bctx, W, H, blobs, cfg, dpr);
        drawRefract(ctx, buf, W, H, cfg, dpr);

        RAF = requestAnimationFrame(() => loop(drawRefract));
    }

    // --- watchers ---
    let ro = null;
    let mq = null;
    let resizeScheduled = false;
    const scheduleResize = () => {
        if (resizeScheduled) return;
        resizeScheduled = true;
        requestAnimationFrame(() => {
            resizeScheduled = false;
            resize();
        });
    };

    function attachWatchers() {
        // ResizeObserver на корень документа — реагирует на смену вьюпорта/панелей
        if (typeof ResizeObserver !== "undefined") {
            ro = new ResizeObserver(scheduleResize);
            ro.observe(document.documentElement);
        }
        // DPR change (зум/скейл/ретина переключение)
        try {
            mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
            mq.addEventListener?.("change", scheduleResize);
            // подстраховка: слушаем любые изменения размера окна/ориентации
            window.addEventListener("resize", scheduleResize);
            window.addEventListener("orientationchange", scheduleResize);
            document.addEventListener("visibilitychange", () => {
                if (!document.hidden) scheduleResize();
            });
        } catch { /* noop */ }
    }

    function detachWatchers() {
        if (ro) { try { ro.disconnect(); } catch { } ro = null; }
        if (mq) { try { mq.removeEventListener?.("change", scheduleResize); } catch { } mq = null; }
        window.removeEventListener("resize", scheduleResize);
        window.removeEventListener("orientationchange", scheduleResize);
    }

    function start(drawRefract) {
        resize();
        attachWatchers();
        prev = performance.now();
        RAF = requestAnimationFrame(() => loop(drawRefract));
    }

    function stop() {
        cancelAnimationFrame(RAF);
        detachWatchers();
    }

    function onResize() { scheduleResize(); }

    return { start, stop, onResize, get size() { return { W, H, dpr, buf, bctx, ctx, blobs }; } };
}
