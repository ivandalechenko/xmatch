import { clamp, ease } from "./utils";

export function drawRefraction(ctx, buf, W, H, cfg, dpr) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(buf, 0, 0);

    const stripeW = Math.round(cfg.stripeWidth * dpr);
    const edgeW = Math.round(cfg.edgeWidth * dpr);
    const maxShift = Math.round(cfg.refractPx * dpr);

    const cx = (W / 2) | 0;
    const L = (cx - stripeW / 2) | 0;
    const R = L + stripeW;

    for (let x = L; x < L + edgeW; x++) {
        const t = 1 - (x - L) / edgeW;
        const s = -maxShift * ease(clamp(t, 0, 1));
        const sx = clamp((x + s) | 0, 0, W - 1);
        ctx.drawImage(buf, sx, 0, 1, H, x, 0, 1, H);
    }

    const midL = L + edgeW;
    const midR = R - edgeW;
    if (midR > midL) {
        ctx.drawImage(buf, midL, 0, midR - midL, H, midL, 0, midR - midL, H);
    }

    for (let x = R - edgeW; x < R; x++) {
        const t = 1 - (R - x) / edgeW;
        const s = maxShift * ease(clamp(t, 0, 1));
        const sx = clamp((x + s) | 0, 0, W - 1);
        ctx.drawImage(buf, sx, 0, 1, H, x, 0, 1, H);
    }
}
