// Hand-rolled SVG donut (stacked stroke-dasharray circles) — no charting
// library, same approach as BarChart. segments: [{ label, value, color }].
export default function DonutChart({ segments, centerLabel, centerValue, size = 200, thickness = 28 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="donut-chart-row">
      <div className="donut-chart" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {total <= 0 ? (
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={thickness} />
            ) : (
              segments.map((seg) => {
                const fraction = seg.value / total;
                const length = fraction * circumference;
                const dashoffset = -cumulative;
                cumulative += length;
                return (
                  <circle
                    key={seg.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={thickness}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={dashoffset}
                  />
                );
              })
            )}
          </g>
        </svg>
        <div className="donut-chart-center">
          <span className="donut-chart-center-value">{centerValue}</span>
          <span className="donut-chart-center-label">{centerLabel}</span>
        </div>
      </div>

      <div className="donut-chart-legend">
        {segments.map((seg) => (
          <div className="donut-chart-legend-item" key={seg.label}>
            <span className="legend-dot" style={{ background: seg.color }} />
            <div>
              <div className="donut-chart-legend-label">{seg.label}</div>
              <div className="donut-chart-legend-value">${seg.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
