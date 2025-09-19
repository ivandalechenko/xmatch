import { clamp, ease } from "./utils";

/**
 * cfg.stripes = {
 *   count: 8, width: 150, gap: 0,
 *   edgeWidth: 50, refractPx: 50,
 *   edgeBiasPow: 1.2,      // как быстро нарастает сила к краям
 *   minCenterStrength: 0.2 // минимальная сила в центре
 * }
 */
export function drawRefractionStripes(ctx, buf, W, H, cfg, dpr) {
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(buf, 0, 0);

    const s = cfg.stripes ?? {};
    const stripeW = Math.round(((s.width ?? cfg.stripeWidth) || 150) * dpr);
    const edgeW = Math.round(((s.edgeWidth ?? cfg.edgeWidth) || 50) * dpr);
    const gapW = Math.round((s.gap ?? 0) * dpr);
    const baseShift = Math.round(((s.refractPx ?? cfg.refractPx) || 50) * dpr);

    const count = Math.max(1, s.count ?? 8);
    const totalW = count * stripeW + (count - 1) * gapW;
    const startX = ((W - totalW) / 2) | 0;

    const pow = s.edgeBiasPow ?? 1.2;
    const minK = clamp(s.minCenterStrength ?? 0.2, 0, 1);
    const center = W / 2;

    for (let i = 0; i < count; i++) {
        const L = startX + i * (stripeW + gapW);
        const R = L + stripeW;

        const stripeCenter = (L + R) / 2;
        const distNorm = Math.min(1, Math.abs(stripeCenter - center) / center); // 0 в центре, 1 у краёв
        const strength = minK + (1 - minK) * Math.pow(distNorm, pow);
        const maxShift = Math.max(1, (baseShift * strength) | 0);

        const eW = Math.min(edgeW, Math.floor(stripeW / 2)); // не больше половины ширины

        // Левая кромка
        for (let x = L; x < L + eW; x++) {
            const t = 1 - (x - L) / eW;
            const sft = -maxShift * ease(clamp(t, 0, 1));
            const sx = clamp((x + sft) | 0, 0, W - 1);
            ctx.drawImage(buf, sx, 0, 1, H, x, 0, 1, H);
        }

        // Центр (без искажений)
        const midL = L + eW;
        const midR = R - eW;
        if (midR > midL) {
            ctx.drawImage(buf, midL, 0, midR - midL, H, midL, 0, midR - midL, H);
        }

        // Правая кромка
        for (let x = R - eW; x < R; x++) {
            const t = 1 - (R - x) / eW;
            const sft = maxShift * ease(clamp(t, 0, 1));
            const sx = clamp((x + sft) | 0, 0, W - 1);
            ctx.drawImage(buf, sx, 0, 1, H, x, 0, 1, H);
        }
    }
}
