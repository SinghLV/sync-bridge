import React, { useEffect, useRef } from 'react';

const TacticalMap = ({ incidents }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 20;

      // 1. Draw Radar Background
      ctx.strokeStyle = 'rgba(74, 158, 255, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.stroke();

      // 2. Draw Sweep
      const sweepGradient = ctx.createConicGradient(angle, centerX, centerY);
      sweepGradient.addColorStop(0, 'rgba(74, 158, 255, 0.4)');
      sweepGradient.addColorStop(0.1, 'rgba(74, 158, 255, 0)');
      
      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle - 0.2, angle);
      ctx.fill();

      // 3. Draw Incidents (Pings)
      incidents.forEach((inc, idx) => {
        // Deterministic position based on ID
        const seed = inc.id ? inc.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : idx;
        const r = (seed % 0.8) * radius;
        const theta = (seed * 1.5) % (Math.PI * 2);
        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);

        const isCritical = inc.severity === 'critical';
        
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = isCritical ? '#ff3d55' : '#4a9eff';
        ctx.fillStyle = isCritical ? '#ff3d55' : '#4a9eff';
        
        ctx.beginPath();
        ctx.arc(x, y, isCritical ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0; // Reset
      });

      angle += 0.02;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [incidents]);

  return (
    <div style={S.mapWrapper}>
      <canvas ref={canvasRef} style={S.canvas} />
      <div style={S.overlay}>
        <div style={S.legend}>TACTICAL MESH SCANNER v2.4</div>
        <div style={S.activeCount}>{incidents.length} NODES DETECTED</div>
      </div>
    </div>
  );
};

const S = {
  mapWrapper: { width: '100%', height: '100%', background: '#050a15', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' },
  canvas: { width: '100%', height: '100%', display: 'block' },
  overlay: { position: 'absolute', top: 12, left: 12, pointerEvents: 'none' },
  legend: { fontSize: '0.6rem', color: '#4a9eff', fontWeight: 900, letterSpacing: '0.1em' },
  activeCount: { fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }
};

export default TacticalMap;
