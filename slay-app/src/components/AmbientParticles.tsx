import React, { useRef, useEffect } from 'react';

interface AmbientParticlesProps {
  particleCount?: number;
  glowColor?: string;
  speed?: number;
}

export const AmbientParticles: React.FC<AmbientParticlesProps> = ({
  particleCount = 45,
  glowColor = 'rgba(0, 255, 102, 0.4)',
  speed = 0.5
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Spore / Void particle model
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * speed,
      vy: -Math.random() * speed * 0.8 - 0.2, // drifting upwards like enchanted spores
      alpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      color: Math.random() > 0.4 ? '#00FF66' : Math.random() > 0.5 ? '#22D3EE' : '#FF3B81'
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha += Math.sin(Date.now() * p.pulseSpeed) * 0.005;

        // Wrap around bounds
        if (p.y < 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.1, Math.min(0.85, p.alpha));
        ctx.shadowBlur = 10;
        ctx.shadowColor = glowColor;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [particleCount, glowColor, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-70 transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
};
