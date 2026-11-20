// Stacked bar chart, one bar per month, segmented by category — shows both
// the total spend trend and how the mix between categories shifted, reusing
// the same category colors as DonutChart so the two charts read together.
// months: [{ label, segments: [{ label, value, color }] }]
export default function CategoryTrendChart({ months, height = 200 }) {
  const max = Math.max(1, ...months.map((m) => m.segments.reduce((s, seg) => s + seg.value, 0)));
  const barWidth = 28;
  const groupGap = 20;
  const chartBottom = height - 24;
  const chartTop = 8;
  const usable = chartBottom - chartTop;

  // Legend: every category that shows up anywhere in the window, first-seen order.
  const legend = [];
  const seen = new Set();
  months.forEach((m) =>
    m.segments.forEach((seg) => {
      if (seg.value > 0 && !seen.has(seg.label)) {
        seen.add(seg.label);
        legend.push(seg);
      }
    })
  );

  return (
    <div className="trend-chart">
      <svg
        className="trend-chart-svg"
        viewBox={`0 0 ${months.length * (barWidth + groupGap)} ${height}`}
        preserveAspectRatio="xMidYMax meet"
      >
        {months.map((m, i) => {
          const x = i * (barWidth + groupGap) + groupGap / 2;
          let yCursor = chartBottom;
          return (
            <g key={m.label}>
              {m.segments
                .filter((seg) => seg.value > 0)
                .map((seg) => {
                  const h = (seg.value / max) * usable;
                  yCursor -= h;
                  return <rect key={seg.label} x={x} y={yCursor} width={barWidth} height={h} fill={seg.color} />;
                })}
              <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" className="bar-chart-label">
                {m.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="donut-chart-legend trend-chart-legend">
        {legend.map((seg) => (
          <div className="donut-chart-legend-item" key={seg.label}>
            <span className="legend-dot" style={{ background: seg.color }} />
            <div className="donut-chart-legend-label">{seg.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
