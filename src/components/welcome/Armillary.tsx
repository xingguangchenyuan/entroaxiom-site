import { useEffect, useRef } from 'react';
import { Armillary as ArmillaryEngine } from '../../lib/armillary';

/**
 * 欢迎页的浑天仪：canvas 三维骨架（见 src/lib/armillary.ts，移植自 armillary_v2_fixed.html）。
 * 按住仪器拖动可以旋转（横向转方位、纵向改俯仰，松手后带惯性），详见引擎的 dragTarget。
 * 外面那层静态 SVG 也是源文件里的三条同心圆（392 / 397 虚金环 / 462），保持原样。
 */
export function Armillary() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const engine = new ArmillaryEngine({ canvas, stage, fps: 30, dragTarget: stage });
    engine.start();
    return () => engine.dispose();
  }, []);

  return (
    <div className="welcome__armillary">
      <div className="welcome__armillary-stage" ref={stageRef}>
        <svg className="welcome__armillary-rings" viewBox="0 0 800 800" aria-hidden="true">
          <g transform="translate(400 400)">
            <circle className="arm-line" r="392" stroke="#e9e8e2" opacity=".14" />
            <circle className="arm-line arm-halo" r="397" stroke="#e5bf32" opacity=".3" strokeDasharray="1 9" />
            <circle className="arm-line" r="462" stroke="#e9e8e2" opacity=".07" />
          </g>
        </svg>
        <canvas
          className="welcome__armillary-canvas"
          ref={canvasRef}
          role="img"
          aria-label="三维旋转的浑天仪：星图、天体、彗星与十二地支"
        />
      </div>
    </div>
  );
}
