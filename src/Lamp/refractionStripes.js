import { clamp, ease } from "./utils";

/**
 * Полосы с визуальным градиентом: на краю (max refraction) — rgba(255,255,255,0.1),
 * к центру полосы (нет рефракции) — прозрачный.
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
        const distNorm = Math.min(1, Math.abs(stripeCenter - center) / center);
        const strength = minK + (1 - minK) * Math.pow(distNorm, pow);
        const maxShift = Math.max(1, (baseShift * strength) | 0);

        const eW = Math.min(edgeW, Math.floor(stripeW / 2));

        // левая кромка (смещение)
        for (let x = L; x < L + eW; x++) {
            const t = 1 - (x - L) / eW;
            const sft = -maxShift * ease(clamp(t, 0, 1));
            const sx = clamp((x + sft) | 0, 0, W - 1);
            ctx.drawImage(buf, sx, 0, 1, H, x, 0, 1, H);
        }

        // центр без искажений
        const midL = L + eW;
        const midR = R - eW;
        if (midR > midL) {
            ctx.drawImage(buf, midL, 0, midR - midL, H, midL, 0, midR - midL, H);
        }

        // правая кромка (смещение)
        for (let x = R - eW; x < R; x++) {
            const t = 1 - (R - x) / eW;
            const sft = maxShift * ease(clamp(t, 0, 1));
            const sx = clamp((x + sft) | 0, 0, W - 1);
            ctx.drawImage(buf, sx, 0, 1, H, x, 0, 1, H);
        }

        // --- визуальный градиент стекла на краях ---
        // левая кромка: от края (L) белый 0.1 → к центру полосы прозрачный
        if (eW > 0) {
            const gLeft = ctx.createLinearGradient(L, 0, L + eW, 0);
            gLeft.addColorStop(0, "rgba(255,255,255,0.04)");
            gLeft.addColorStop(1, "rgba(255,255,255,0.00)");
            ctx.fillStyle = gLeft;
            ctx.fillRect(L, 0, eW, H);

            // правая кромка: от края (R) белый 0.1 → внутрь прозрачный
            const gRight = ctx.createLinearGradient(R, 0, R - eW, 0);
            gRight.addColorStop(0, "rgba(255,255,255,0.04)");
            gRight.addColorStop(1, "rgba(255,255,255,0.00)");
            ctx.fillStyle = gRight;
            ctx.fillRect(R - eW, 0, eW, H);
        }
    }
}
