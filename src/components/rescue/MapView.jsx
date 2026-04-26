import React, { useEffect, useRef } from 'react';

const MapView = ({ incidents }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    let angle = 0;

    const draw = () => {
      // Semi-transparent clear for motion trail
      ctx.fillStyle = 'rgba(5, 10, 21, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 40;

      // 1. Technical Grid
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 2. Coordinate Axes
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.beginPath();
      ctx.moveTo(centerX - radius - 20, centerY);
      ctx.lineTo(centerX + radius + 20, centerY);
      ctx.moveTo(centerX, centerY - radius - 20);
      ctx.lineTo(centerX, centerY + radius + 20);
      ctx.stroke();

      // Labels
      ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.font = '700 8px "JetBrains Mono"';
      ctx.fillText('0° N', centerX - 10, centerY - radius - 25);
      ctx.fillText('180° S', centerX - 15, centerY + radius + 35);
      ctx.fillText('90° E', centerX + radius + 25, centerY + 3);
      ctx.fillText('270° W', centerX - radius - 55, centerY + 3);

      // 3. Radar Sweep
      const sweepGradient = ctx.createConicGradient(angle, centerX, centerY);
      sweepGradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
      sweepGradient.addColorStop(0.1, 'rgba(6, 182, 212, 0)');
      
      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle - 0.3, angle);
      ctx.fill();

      // 4. Incident Pings
      incidents.forEach((inc, idx) => {
        const seed = inc.id ? inc.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : idx;
        const r = (seed % 0.85) * radius;
        const theta = (seed * 1.7) % (Math.PI * 2);
        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);

        const isCritical = inc.severity === 'critical';
        
        // Pulse effect for pings
        const pulse = Math.sin(Date.now() / 200) * 2;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = isCritical ? '#f43f5e' : '#3b82f6';
        ctx.fillStyle = isCritical ? '#f43f5e' : '#3b82f6';
        
        ctx.beginPath();
        ctx.arc(x, y, (isCritical ? 4 : 3) + pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Technical Label next to ping
        if (isCritical) {
          ctx.fillStyle = 'rgba(244, 63, 94, 0.8)';
          ctx.fillText(`! ${inc.packet}`, x + 10, y + 2);
        }
        
        ctx.shadowBlur = 0;
      });

      angle += 0.015;
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [incidents]);

  return (
    <div style={S.mapWrapper} className="glass-panel">
      <div style={S.technicalHeader}>
        <span>SCAN_FREQ: 2.4GHZ</span>
        <span style={{ marginLeft: 'auto' }}>AZIMUTH: {(Date.now() % 3600 / 10).toFixed(1)}°</span>
      </div>
      <canvas ref={canvasRef} style={S.canvas} />
      <div style={S.overlay}>
        <div className="technical-data" style={S.activeCount}>
          ACTIVE_MESH_NODES: {incidents.length.toString().padStart(3, '0')}
        </div>
      </div>
    </div>
  );
};

const S = {
  mapWrapper: { width: '100%', height: '100%', background: '#05070a', borderRadius: 12, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  technicalHeader: { display: 'flex', padding: '8px 12px', fontSize: '0.5rem', color: '#475569', fontWeight: 900, fontFamily: '"JetBrains Mono"', borderBottom: '1px solid rgba(255,255,255,0.03)' },
  canvas: { flex: 1, width: '100%', display: 'block' },
  overlay: { position: 'absolute', bottom: 12, right: 12, pointerEvents: 'none' },
  activeCount: { fontSize: '0.6rem', color: '#3b82f6', fontWeight: 800, letterSpacing: '0.05em' }
};

export default MapView;
