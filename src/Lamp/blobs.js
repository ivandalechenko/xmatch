// components/Lamp/blobs.js
import { rnd, clamp } from "./utils";

/*
  Динамическая «толще/тоньше»:
  — добавлены поля aspectPhase/aspectSpeed, а rx/ry теперь пересчитываются каждый кадр
  — диапазон задаётся ovalAspectMin/ovalAspectMax
*/

export function makeBlob(cfg) {
    const aMin = Math.max(0.1, cfg.ovalAspectMin ?? 1);
    const aMax = Math.max(aMin, cfg.ovalAspectMax ?? 3.0);

    const baseR = Math.max(1, (cfg.size ?? 100) / 2);

    const mid = (aMin + aMax) * 0.5;
    const amp = (aMax - aMin) * 0.5 * rnd(0.6, 1.0); // «дыхание» не всегда до краёв
    const phase = rnd(0, Math.PI * 2);
    const speed = rnd(0.25, 0.7); // рад/с

    const aspect = clamp(mid + Math.sin(phase) * amp, aMin, aMax);
    const rx = baseR * aspect;
    const ry = baseR / aspect;
    const rForZone = Math.max(rx, ry);

    return {
        x: 0, y: 0,
        r: rForZone, rx, ry,
        baseR,
        aspect,
        aMin, aMax,
        aspectPhase: phase,
        aspectSpeed: speed,

        vx: (cfg.maxSpeed ?? 0) * (Math.random() * 2 - 1),
        vy: (cfg.maxSpeed ?? 0) * (Math.random() * 2 - 1),
        hue: rnd(0, 360),

        angle: rnd(0, Math.PI * 2),
        angVel: Math.random() / 8,
        angKickA: 0,
        angAcc: (Math.random() - .5) * 1,

        delayLeft: rnd(cfg.minAccelerationDelay, cfg.maxAccelerationDelay),
        accelLeft: 0,
        dirX: 0, dirY: 0, aMag: 0,

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
    const backA = Math.max(0, cfg.maxSpeedBackAcceleration ?? 0);
    const maxAng = Math.max(0, cfg.maxRotateSpeed ?? 0) * (Math.PI / 180);
    const backAngA = backA * (Math.PI / 180);

    const smoothK = 6;
    const zoneMul = 1.0;
    const maxDepthMul = 1.5;

    for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];

        // === ДИНАМИЧЕСКАЯ ТОЛЩИНА (aspect) ===
        b.aspectPhase += b.aspectSpeed * dt;
        const mid = (b.aMin + b.aMax) * 0.5;
        const amp = (b.aMax - b.aMin) * 0.5;
        b.aspect = clamp(mid + Math.sin(b.aspectPhase) * amp, b.aMin, b.aMax);

        // пересчёт радиусов фигуры и «зоны стены»
        b.rx = b.baseR * b.aspect;
        b.ry = b.baseR / b.aspect;
        b.r = Math.max(b.rx, b.ry);

        // планировщик линейного «пинка» + запуск углового «пинка»
        if (b.accelLeft > 0) {
            b.accelLeft -= dt;
            if (b.accelLeft <= 0) {
                b.accelLeft = 0;
                b.aMag = 0; b.dirX = 0; b.dirY = 0;
                b.angKickA = 0;
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

                const kickSign = Math.random() < 0.5 ? -1 : 1;
                const kickA = rnd(0.2, 0.6) * maxAng;
                b.angKickA = kickSign * kickA;

                b.delayLeft = 0;
            }
        }

        // целевое линейное ускорение
        let targetAx = b.dirX * b.aMag;
        let targetAy = b.dirY * b.aMag;

        // «мягкая зона» у краёв
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

        // сглажение к целям (линейным)
        b.ax += (targetAx - b.ax) * smoothK * dt;
        b.ay += (targetAy - b.ay) * smoothK * dt;

        // угловое
        const targetAngA = b.accelLeft > 0 ? b.angKickA : 0;
        b.angAcc += (targetAngA - b.angAcc) * smoothK * dt;

        // сопротивление при превышении maxV
        const spPrev = Math.hypot(b.vx, b.vy);
        if (maxV > 0 && spPrev > maxV && backA > 0) {
            const inv = 1 / spPrev;
            b.ax += -b.vx * inv * (backA * dpr);
            b.ay += -b.vy * inv * (backA * dpr);
        }

        // интеграция
        b.vx += b.ax * dt;
        b.vy += b.ay * dt;
        b.angVel += b.angAcc * dt;

        // ограничение угловой скорости
        if (maxAng > 0 && Math.abs(b.angVel) > maxAng && backAngA > 0) {
            if (b.angVel > maxAng) b.angVel = Math.max(maxAng, b.angVel - backAngA * dt);
            else if (b.angVel < -maxAng) b.angVel = Math.min(-maxAng, b.angVel + backAngA * dt);
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.angle += b.angVel * dt;
        if (b.angle > Math.PI * 2) b.angle -= Math.PI * 2;
        else if (b.angle < 0) b.angle += Math.PI * 2;

        const hueSpeed = cfg.hueChangeSpeed ?? 0;
        b.hue = (b.hue + hueSpeed * dt) % 360;
        if (b.hue < 0) b.hue += 360;
    }
}

// волнистый овал (центр в 0,0)
function drawCurvedOvalPath(ctx, b, dpr) {
    const steps = 200;
    const rx = Math.max(1, b.rx * dpr);
    const ry = Math.max(1, b.ry * dpr);
    const amp = b.curveAmp ?? 0.08;
    const freq = (b.curveFreq ?? 4) | 0;

    const base = Math.min(rx, ry) * amp;

    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const ex = Math.cos(t) * rx;
        const ey = Math.sin(t) * ry;
        const nx = Math.cos(t);
        const ny = Math.sin(t);
        const w = Math.sin(t * freq + (b.curvePhase ?? 0)) * base;

        const x = ex + nx * w;
        const y = ey + ny * w;

        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

export function drawBlobs(bctx, W, H, blobs, cfg, dpr) {
    bctx.clearRect(0, 0, W, H);
    const blur = Math.max(0, cfg.blurPx ?? 0) * dpr;
    bctx.save();
    if (blur > 0) bctx.filter = `blur(${Math.round(blur)}px)`;

    const alpha = clamp(cfg.alpha ?? 1, 0, 1);
    for (const b of blobs) {
        b.curvePhase = (b.curvePhase ?? 0) + (b.curveSpeed ?? 0.7) * dtr(60 / 60);

        bctx.save();
        bctx.translate(b.x, b.y);
        bctx.rotate(b.angle);
        bctx.beginPath();
        drawCurvedOvalPath(bctx, b, dpr);
        bctx.fillStyle = `hsla(${b.hue}, 65%, 55%, ${alpha})`;
        bctx.fill();
        bctx.restore();
    }

    bctx.restore();
}

export function scalePositions(blobs, sx, sy) {
    for (const b of blobs) {
        b.x *= sx;
        b.y *= sy;
    }
}

function dtr(deg) { return deg * (Math.PI / 180); }
