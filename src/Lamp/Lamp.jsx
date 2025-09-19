import { useEffect, useRef } from "react";
import defaultCfg from "./config";
import { createLamp } from "./engine";
import { drawRefractionStripes } from "./refractionStripes";

export default function Lamp({ config = {} }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const $c = canvasRef.current;
        const engine = createLamp($c, { ...defaultCfg, ...config });

        // локальный ResizeObserver по канвасу (доп. к тем, что внутри)
        const ro = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(() => engine.onResize())
            : null;
        ro?.observe($c);

        engine.start(drawRefractionStripes);

        return () => {
            ro?.disconnect();
            engine.stop();
        };
    }, [config]);

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
