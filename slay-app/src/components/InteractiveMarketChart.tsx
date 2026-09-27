import React, { useRef, useEffect, useState } from 'react';

interface InteractiveMarketChartProps {
  basePrice: number;
  priceChange24h: number;
  height?: number;
  ambientColor?: string;
}

export const InteractiveMarketChart: React.FC<InteractiveMarketChartProps> = ({
  basePrice,
  priceChange24h,
  height = 240,
  ambientColor = '#00FF66'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dataPoints, setDataPoints] = useState<Array<{ time: string; price: number; volume: number }>>([]);

  // Generate realistic deterministic price walk based on basePrice & change
  useEffect(() => {
    const points: Array<{ time: string; price: number; volume: number }> = [];
    const numPoints = 36;
    const startMultiplier = 1 - (priceChange24h / 100);
    let current = basePrice * startMultiplier;

    for (let i = 0; i < numPoints; i++) {
      const progress = i / (numPoints - 1);
      // Random walk leaning towards final target price
      const drift = (basePrice - current) * (0.15 + progress * 0.1);
      const volatility = basePrice * 0.04 * (Math.sin(i * 0.8) + (Math.random() - 0.48));
      current = Math.max(0.000001, current + drift + volatility);
      
      const hour = (24 - Math.floor((1 - progress) * 24)) % 24;
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;

      points.push({
        time: timeStr,
        price: i === numPoints - 1 ? basePrice : current,
        volume: Math.floor(Math.random() * 45000 + 5000)
      });
    }

    setDataPoints(points);
  }, [basePrice, priceChange24h]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    canvas.height = height;

    const prices = dataPoints.map((d) => d.price);
    const minPrice = Math.min(...prices) * 0.98;
    const maxPrice = Math.max(...prices) * 1.02;
    const priceRange = maxPrice - minPrice || 1;

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Chart Gradient Line
    const coords = dataPoints.map((pt, i) => {
      const x = (i / (dataPoints.length - 1)) * (width - 40) + 20;
      const y = height - 30 - ((pt.price - minPrice) / priceRange) * (height - 60);
      return { x, y, pt };
    });

    // Fill Gradient below curve
    const areaGrad = ctx.createLinearGradient(0, 0, 0, height);
    areaGrad.addColorStop(0, `${ambientColor}35`);
    areaGrad.addColorStop(1, 'rgba(5, 5, 7, 0.0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, height - 20);
    coords.forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.lineTo(coords[coords.length - 1].x, height - 20);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Stroke path
    ctx.beginPath();
    coords.forEach((c, i) => {
      if (i === 0) ctx.moveTo(c.x, c.y);
      else {
        // Smooth bezier curve
        const prev = coords[i - 1];
        const cx = (prev.x + c.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cx, (prev.y + c.y) / 2);
      }
    });
    ctx.lineTo(coords[coords.length - 1].x, coords[coords.length - 1].y);
    ctx.strokeStyle = ambientColor;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = ambientColor;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Hover marker
    if (hoverIndex !== null && coords[hoverIndex]) {
      const active = coords[hoverIndex];
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(active.x, 0);
      ctx.lineTo(active.x, height - 20);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(active.x, active.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 8;
      ctx.shadowColor = ambientColor;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [dataPoints, hoverIndex, height, ambientColor]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = canvas.width;
    const index = Math.round(((mouseX - 20) / (width - 40)) * (dataPoints.length - 1));
    if (index >= 0 && index < dataPoints.length) {
      setHoverIndex(index);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? dataPoints[hoverIndex] : dataPoints[dataPoints.length - 1];

  return (
    <div className="relative w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-mono px-2">
        <div className="flex items-center gap-2">
          <span className="text-chrome-400">Continuous Bonding Index:</span>
          <span className="text-chrome-100 font-bold">${activePoint?.price.toFixed(6)}</span>
        </div>
        {activePoint && (
          <div className="text-chrome-400">
            <span>Time: {activePoint.time}</span>
            <span className="mx-1.5 text-chrome-600">·</span>
            <span>Vol: ${(activePoint.volume / 1000).toFixed(1)}k</span>
          </div>
        )}
      </div>

      <div className="w-full relative overflow-hidden rounded-xl bg-obsidian-900 border border-white/5">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full block cursor-crosshair"
        />
      </div>
    </div>
  );
};
