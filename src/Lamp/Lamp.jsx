import { useEffect, useRef } from "react";
import defaultCfg from "./config";
import { createLamp } from "./engine";
import { drawRefractionStripes } from "./refractionStripes";

export default function Lamp({ config = {} }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const $c = canvasRef.current;
        const engine = createLamp($c, { ...defaultCfg, ...config });
        const onResize = () => engine.onResize();
        engine.start(drawRefractionStripes);
        window.addEventListener("resize", onResize);
        return () => { engine.stop(); window.removeEventListener("resize", onResize); };
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
