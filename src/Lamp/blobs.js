// components/Lamp/blobs.js
import { rnd, clamp } from "./utils";

/*
  Использует ТОЛЬКО эти поля config:
  blobs, blurPx, alpha, hueChangeSpeed, maxSpeed,
  minAcceleration, maxAcceleration,
  minAccelerationTime, maxAccelerationTime,
  minAccelerationDelay, maxAccelerationDelay,
  size, wallAcceleration, maxSpeedBackAcceleration
*/

export function makeBlob(cfg) {
    const r = Math.max(1, (cfg.size ?? 100) / 2);
    return {
        x: 0, y: 0,
        r,
        vx: cfg.maxSpeed * (Math.random() * 2 - 1), vy: cfg.maxSpeed * (Math.random() * 2 - 1),
        hue: rnd(0, 360),

        // планировщик «пинков»
        delayLeft: rnd(cfg.minAccelerationDelay, cfg.maxAccelerationDelay),
        accelLeft: 0,
        dirX: 0, dirY: 0, aMag: 0,

        // сглажённое ускорение
        ax: 0, ay: 0,
    };
}

export function margin() { return 0; }

export function placeInside(b, W, H) {
    b.x = rnd(0, Math.max(1, W));
    b.y = rnd(0, Math.max(1, H));
}


export function stepBlobs(blobs, dt, W, H, cfg, dpr) {
    const maxV = Math.max(0, cfg.maxSpeed ?? 0) * dpr;
    const minA = Math.max(0, cfg.minAcceleration ?? 0) * dpr;
    const maxA = Math.max(minA, (cfg.maxAcceleration ?? minA) * dpr);
    const minAT = Math.max(0.001, cfg.minAccelerationTime ?? 1);
    const maxAT = Math.max(minAT, cfg.maxAccelerationTime ?? minAT);
    const minAD = Math.max(0, cfg.minAccelerationDelay ?? 1);
    const maxAD = Math.max(minAD, cfg.maxAccelerationDelay ?? minAD);
    const wallA = Math.max(0, cfg.wallAcceleration ?? 0) * dpr;
    const backA = Math.max(0, cfg.maxSpeedBackAcceleration ?? 0) * dpr;

    const smoothK = 6;
    const zoneMul = 1.0;
    const maxDepthMul = 1.5;

    for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];

        // планировщик случайного ускорения
        if (b.accelLeft > 0) {
            b.accelLeft -= dt;
            if (b.accelLeft <= 0) {
                b.accelLeft = 0;
                b.aMag = 0; b.dirX = 0; b.dirY = 0;
                b.delayLeft = rnd(minAD, maxAD);
            }
        } else {
            b.delayLeft -= dt;
            if (b.delayLeft <= 0) {
                const ang = rnd(0, Math.PI * 2);
                b.dirX = Math.cos(ang);
                b.dirY = Math.sin(ang);
                b.aMag = rnd(minA, maxA);
                b.accelLeft = rnd(minAT, maxAT);
                b.delayLeft = 0;
            }
        }

        // целевое ускорение
        let targetAx = b.dirX * b.aMag;
        let targetAy = b.dirY * b.aMag;

        // мягкая зона у краёв
        const rr = Math.max(1, b.r * dpr);
        const zone = rr * zoneMul;

        const distLeft = b.x;
        const distRight = W - b.x;
        const distTop = b.y;
        const distBottom = H - b.y;

        if (distLeft <= zone) targetAx += wallA * clamp(1 - distLeft / zone, 0, maxDepthMul);
        if (distRight <= zone) targetAx -= wallA * clamp(1 - distRight / zone, 0, maxDepthMul);
        if (distTop <= zone) targetAy += wallA * clamp(1 - distTop / zone, 0, maxDepthMul);
        if (distBottom <= zone) targetAy -= wallA * clamp(1 - distBottom / zone, 0, maxDepthMul);

        // сглажение к цели
        b.ax += (targetAx - b.ax) * smoothK * dt;
        b.ay += (targetAy - b.ay) * smoothK * dt;

        // «сопротивление воздуха» при превышении maxV
        const spPrev = Math.hypot(b.vx, b.vy);
        if (maxV > 0 && spPrev > maxV && backA > 0) {
            const inv = 1 / spPrev;
            b.ax += -b.vx * inv * backA;
            b.ay += -b.vy * inv * backA;
        }

        // интеграция скорости/позиции
        b.vx += b.ax * dt;
        b.vy += b.ay * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // цвет
        const hueSpeed = cfg.hueChangeSpeed ?? 0;
        b.hue = (b.hue + hueSpeed * dt) % 360;
        if (b.hue < 0) b.hue += 360;

        // ЛОГ СКОРОСТЕЙ
        console.log(`blob ${i}: vx=${b.vx.toFixed(2)} vy=${b.vy.toFixed(2)}`);
    }
}

export function drawBlobs(bctx, W, H, blobs, cfg, dpr) {
    bctx.clearRect(0, 0, W, H);
    const blur = Math.max(0, cfg.blurPx ?? 0) * dpr;
    bctx.save();
    if (blur > 0) bctx.filter = `blur(${Math.round(blur)}px)`;

    const alpha = clamp(cfg.alpha ?? 1, 0, 1);
    for (const b of blobs) {
        bctx.beginPath();
        bctx.arc(b.x, b.y, b.r * dpr, 0, Math.PI * 2);
        bctx.fillStyle = `hsla(${b.hue}, 65%, 55%, ${alpha})`;
        bctx.fill();
    }

    bctx.restore();
}

export function scalePositions(blobs, sx, sy) {
    for (const b of blobs) {
        b.x *= sx;
        b.y *= sy;
    }
}
