// Lamp.jsx
import { useEffect, useRef } from "react";

export default function Lamp() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const cfg = {
            blobs: 5,
            blurPx: 20,
            baseAlpha: 0.4,
            hueDrift: 0.004,
            speed: 4,
            jitter: .1,
            rMin: 70,
            rMax: 70,
            stripeWidth: 150,
            edgeWidth: 50,
            refractPx: 50,
            bg: null,
            softPush: 0.0002,   // мягкое втягивание обратно (сила пружины)
            drag: 5,       // сопротивление
            maxSpeedMul: .3     // ограничение максимальной скорости
        };

        const ease = t => t * t * (3 - 2 * t);

        const $c = canvasRef.current;
        const ctx = $c.getContext("2d", { alpha: true });
        let dpr = Math.max(1, window.devicePixelRatio || 1);

        const buf =
            typeof OffscreenCanvas !== "undefined"
                ? new OffscreenCanvas(1, 1)
                : document.createElement("canvas");
        const bctx = buf.getContext("2d");

        let W = 0, H = 0, RAF = 0, lastW = 0, lastH = 0;

        const blobs = [];
        const rnd = (a, b) => a + Math.random() * (b - a);
        const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const margin = () => Math.ceil(cfg.blurPx * dpr) + 4;

        function makeBlob() {
            const r = rnd(cfg.rMin, cfg.rMax);
            return {
                x: 0, y: 0,
                r,
                rv: cfg.rMin === cfg.rMax ? 0 : rnd(-0.06, 0.06),
                vx: (Math.random() * 2 - 1) * cfg.speed * dpr,
                vy: (Math.random() * 2 - 1) * cfg.speed * dpr,
                hue: rnd(0, 360),
                sat: rnd(55, 75),
                light: rnd(48, 62),
            };
        }

        function placeInside(b) {
            const rr = b.r * dpr, m = margin();
            const minX = rr + m, maxX = W - rr - m;
            const minY = rr + m, maxY = H - rr - m;
            b.x = rnd(minX, Math.max(minX + 1, maxX));
            b.y = rnd(minY, Math.max(minY + 1, maxY));
        }

        function resize() {
            dpr = Math.max(1, window.devicePixelRatio || 1);
            const cssW = Math.max(1, $c.clientWidth || window.innerWidth);
            const cssH = Math.max(1, $c.clientHeight || window.innerHeight);
            lastW = W || cssW * dpr;
            lastH = H || cssH * dpr;

            W = Math.max(1, Math.floor(cssW * dpr));
            H = Math.max(1, Math.floor(cssH * dpr));

            $c.width = W; $c.height = H;
            $c.style.width = cssW + "px";
            $c.style.height = cssH + "px";
            buf.width = W; buf.height = H;

            if (blobs.length === 0) {
                for (let i = 0; i < cfg.blobs; i++) {
                    const b = makeBlob();
                    placeInside(b);
                    blobs.push(b);
                }
            } else {
                // масштабируем позиции без телепорта
                const sx = W / lastW, sy = H / lastH;
                for (const b of blobs) {
                    b.x *= sx; b.y *= sy;
                }
            }
        }

        function stepBlobs(dt) {
            const maxSpeed = cfg.speed * cfg.maxSpeedMul * dpr;
            const k = cfg.softPush * dpr; // сила втягивания
            for (const b of blobs) {
                // случайное дрожание
                b.vx += (Math.random() * 2 - 1) * cfg.jitter * dpr * dt;
                b.vy += (Math.random() * 2 - 1) * cfg.jitter * dpr * dt;

                // мягкое втягивание внутрь «безопасного прямоугольника»
                const rr = b.r * dpr, m = margin();
                const minX = rr + m, maxX = W - rr - m;
                const minY = rr + m, maxY = H - rr - m;

                let ax = 0, ay = 0;
                if (b.x < minX) ax += (minX - b.x) * k;
                if (b.x > maxX) ax += (maxX - b.x) * k;
                if (b.y < minY) ay += (minY - b.y) * k;
                if (b.y > maxY) ay += (maxY - b.y) * k;

                b.vx = (b.vx + ax * dt) * cfg.drag;
                b.vy = (b.vy + ay * dt) * cfg.drag;

                // ограничение максимальной скорости
                const sp = Math.hypot(b.vx, b.vy);
                if (sp > maxSpeed) {
                    b.vx = (b.vx / sp) * maxSpeed;
                    b.vy = (b.vy / sp) * maxSpeed;
                }

                b.x += b.vx * dt;
                b.y += b.vy * dt;

                // радиус и цвет
                b.r += b.rv * dt * 16;
                if (b.r < cfg.rMin) { b.r = cfg.rMin; b.rv *= -1; }
                if (b.r > cfg.rMax) { b.r = cfg.rMax; b.rv *= -1; }
                b.hue = (b.hue + cfg.hueDrift * dt * 60) % 360;
            }
        }

        function drawBlobs() {
            bctx.clearRect(0, 0, W, H);
            if (cfg.bg) { bctx.fillStyle = cfg.bg; bctx.fillRect(0, 0, W, H); }
            bctx.save();
            bctx.filter = `blur(${Math.round(cfg.blurPx * dpr)}px)`;
            for (const b of blobs) {
                bctx.beginPath();
                bctx.arc(b.x, b.y, b.r * dpr, 0, Math.PI * 2);
                bctx.fillStyle = `hsla(${b.hue}, ${b.sat}%, ${b.light}%, ${cfg.baseAlpha})`;
                bctx.fill();
            }
            bctx.restore();
        }

        function drawRefraction() {
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(buf, 0, 0);

            const stripeW = Math.round(cfg.stripeWidth * dpr);
            const edgeW = Math.round(cfg.edgeWidth * dpr);
            const maxShift = Math.round(cfg.refractPx * dpr);

            const cx = (W / 2) | 0;
            const L = (cx - stripeW / 2) | 0;
            const R = L + stripeW;

            // левая кромка
            for (let x = L; x < L + edgeW; x++) {
                const t = 1 - (x - L) / edgeW;
                const s = -maxShift * ease(clamp(t, 0, 1));
                const sx = clamp((x + s) | 0, 0, W - 1);
                ctx.drawImage(buf, sx, 0, 1, H, x, 0, 1, H);
            }

            // центр (без искажений)
            const midL = L + edgeW;
            const midR = R - edgeW;
            if (midR > midL) {
                ctx.drawImage(buf, midL, 0, midR - midL, H, midL, 0, midR - midL, H);
            }

            // правая кромка
            for (let x = R - edgeW; x < R; x++) {
                const t = 1 - (R - x) / edgeW;
                const s = maxShift * ease(clamp(t, 0, 1));
                const sx = clamp((x + s) | 0, 0, W - 1);
                ctx.drawImage(buf, sx, 0, 1, H, x, 0, 1, H);
            }
        }

        let prev = performance.now();
        function frame(now) {
            const dt = Math.min(1.2, (now - prev) / 16.6667);
            prev = now;
            stepBlobs(dt);
            drawBlobs();
            drawRefraction();
            RAF = requestAnimationFrame(frame);
        }

        resize();
        RAF = requestAnimationFrame(frame);
        const onResize = () => resize();
        window.addEventListener("resize", onResize);

        return () => {
            cancelAnimationFrame(RAF);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: "100vw",
                height: "100vh",
                display: "block",
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
            }}
        />
    );
}
