import { rnd, clamp } from "./utils";

export function makeBlob(cfg) {
    const r = rnd(cfg.rMin, cfg.rMax);
    return {
        x: 0, y: 0, r,
        rv: cfg.rMin === cfg.rMax ? 0 : rnd(-0.06, 0.06),
        vx: (Math.random() * 2 - 1) * cfg.speed,
        vy: (Math.random() * 2 - 1) * cfg.speed,
        hue: rnd(0, 360),
        sat: rnd(55, 75),
        light: rnd(48, 62),
    };
}

export function margin(cfg, dpr) {
    return Math.ceil(cfg.blurPx * dpr) + 4;
}

export function placeInside(b, W, H, cfg, dpr) {
    const rr = b.r * dpr, m = margin(cfg, dpr);
    const minX = rr + m, maxX = W - rr - m;
    const minY = rr + m, maxY = H - rr - m;
    b.x = rnd(minX, Math.max(minX + 1, maxX));
    b.y = rnd(minY, Math.max(minY + 1, maxY));
}

export function stepBlobs(blobs, dt, W, H, cfg, dpr) {
    const maxSpeed = cfg.speed * cfg.maxSpeedMul * dpr;
    const k = cfg.softPush * dpr;

    const rrM = margin(cfg, dpr);

    for (const b of blobs) {
        b.vx += (Math.random() * 2 - 1) * cfg.jitter * dpr * dt;
        b.vy += (Math.random() * 2 - 1) * cfg.jitter * dpr * dt;

        const rr = b.r * dpr;
        const minX = rr + rrM, maxX = W - rr - rrM;
        const minY = rr + rrM, maxY = H - rr - rrM;

        let ax = 0, ay = 0;
        if (b.x < minX) ax += (minX - b.x) * k;
        if (b.x > maxX) ax += (maxX - b.x) * k;
        if (b.y < minY) ay += (minY - b.y) * k;
        if (b.y > maxY) ay += (maxY - b.y) * k;

        b.vx = (b.vx + ax * dt) * cfg.drag;
        b.vy = (b.vy + ay * dt) * cfg.drag;

        const sp = Math.hypot(b.vx, b.vy);
        if (sp > maxSpeed) {
            b.vx = (b.vx / sp) * maxSpeed;
            b.vy = (b.vy / sp) * maxSpeed;
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        b.r += b.rv * dt * 16;
        if (b.r < cfg.rMin) { b.r = cfg.rMin; b.rv *= -1; }
        if (b.r > cfg.rMax) { b.r = cfg.rMax; b.rv *= -1; }

        b.hue = (b.hue + cfg.hueDrift * dt * 60) % 360;
    }
}

export function drawBlobs(bctx, W, H, blobs, cfg, dpr) {
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

export function scalePositions(blobs, sx, sy) {
    for (const b of blobs) {
        b.x *= sx; b.y *= sy;
    }
}
