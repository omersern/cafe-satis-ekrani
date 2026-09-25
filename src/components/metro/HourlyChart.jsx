import { useState } from 'react';

const formatMoney = (value) => new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
}).format(Number(value) || 0);

export default function HourlyChart({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const maxSales = Math.max(...data.map((item) => Number(item.sales) || 0), 1);
  const width = 800;
  const height = 120;
  const padding = { left: 42, right: 28, top: 14, bottom: 20 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const points = data.map((item, index) => ({
    x: padding.left + (index / Math.max(data.length - 1, 1)) * graphWidth,
    y: padding.top + graphHeight - ((Number(item.sales) || 0) / maxSales) * graphHeight,
  }));
  const line = points.length ? `M ${points.map((point) => `${point.x},${point.y}`).join(' L ')}` : '';
  const area = points.length
    ? `${line} L ${points.at(-1).x},${padding.top + graphHeight} L ${points[0].x},${padding.top + graphHeight} Z`
    : '';
  const hoveredItem = hoveredIndex === null ? null : data[hoveredIndex];
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];

  const handlePointerMove = (event) => {
    if (!data.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * width;
    const ratio = Math.max(0, Math.min(1, (viewX - padding.left) / graphWidth));
    setHoveredIndex(Math.round(ratio * Math.max(data.length - 1, 0)));
  };

  return (
    <div className="relative w-full px-2">
      {hoveredItem && hoveredPoint && (
        <div
          className="hourly-chart-tooltip"
          style={{ left: `${Math.max(10, Math.min(90, (hoveredPoint.x / width) * 100))}%` }}
          role="status"
        >
          <strong>{hoveredItem.hour}</strong>
          <span>{formatMoney(hoveredItem.sales)}</span>
          <small>{Number(hoveredItem.amount) || 0} satış</small>
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        preserveAspectRatio="none"
        aria-label="Saatlik ciro grafiği"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="cafeMetroArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--win11-metro-accent)" stopOpacity=".35" />
            <stop offset="100%" stopColor="var(--win11-metro-accent)" stopOpacity=".03" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <line key={ratio} x1={padding.left} x2={width - padding.right} y1={padding.top + ratio * graphHeight} y2={padding.top + ratio * graphHeight} stroke="var(--win11-metro-border)" strokeDasharray="4 4" />
        ))}
        {[0, 6, 12, 18, 23].map((hour) => (
          <text key={hour} x={padding.left + (hour / 23) * graphWidth} y={height - 5} fill="var(--win11-metro-muted)" fontSize="10" textAnchor="middle">
            {String(hour).padStart(2, '0')}:00
          </text>
        ))}
        <path d={area} fill="url(#cafeMetroArea)" />
        <path d={line} fill="none" stroke="var(--win11-metro-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hoveredPoint && (
          <>
            <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={padding.top} y2={padding.top + graphHeight} stroke="var(--win11-metro-accent)" strokeWidth="1" strokeDasharray="3 3" opacity=".55" />
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="4" fill="var(--win11-metro-card-bg)" stroke="var(--win11-metro-accent)" strokeWidth="2.5" />
          </>
        )}
        <rect x={padding.left} y={padding.top} width={graphWidth} height={graphHeight} fill="transparent" />
      </svg>
    </div>
  );
}
