const config = {
    blobs: 5,
    blurPx: 20,
    baseAlpha: 0.4,
    hueDrift: 0.004,
    speed: 4,
    jitter: 0.1,
    rMin: 70,
    rMax: 70,
    // старые поля остаются для совместимости:
    stripeWidth: 150,
    edgeWidth: 50,
    refractPx: 50,
    // новые параметры полос:
    stripes: {
        count: 8,
        width: 150,
        gap: 0,
        edgeWidth: 50,
        refractPx: 50,
        edgeBiasPow: 1.2,
        minCenterStrength: 0.2
    },
    bg: null,
    softPush: 0.0002,
    drag: 5,
    maxSpeedMul: 0.3
};
export default config;
