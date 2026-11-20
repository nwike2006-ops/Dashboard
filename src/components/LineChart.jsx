// Hand-rolled SVG line chart, no external library, same approach as
// BarChart/DonutChart. viewBox is a flat 0-100 width with
// preserveAspectRatio="none" so the line stretches to fill the card;
// vectorEffect keeps the stroke/dot size constant regardless of that
// stretch. data: [{ label, value }].
export default function LineChart({ data, height = 160 }) {
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const chartTop = 10;
  const chartBottom = height - 24;
  const usable = chartBottom - chartTop;
  const stepX = data.length > 1 ? 100 / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: chartBottom - ((d.value - min) / range) * usable,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="line-chart-svg">
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="var(--accent)" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="line-chart-labels">
        {data.map((d) => (
          <span key={d.label} className="bar-chart-label">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
