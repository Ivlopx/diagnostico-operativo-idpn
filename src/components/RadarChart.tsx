import React, { useId } from 'react';

export interface RadarDataPoint {
  label: string;
  value: number;
}

export interface RadarSeries {
  label: string;
  color: string;
  data: RadarDataPoint[];
}

interface RadarChartProps {
  data: RadarDataPoint[];
  maxValue: number;
  title?: string;
  size?: number;
  color?: string;
  fillOpacity?: number;
  chartId?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  maxValue,
  title,
  size = 320,
  color = '#173B57',
  fillOpacity = 0.25,
  chartId,
}) => {
  const generatedId = useId();
  const id = chartId || generatedId.replace(/:/g, '_');

  const center = size / 2;
  const radius = center - 50; // padding for labels
  const levels = 4; // concentric grid rings

  // If no data or empty
  if (!data || data.length === 0) {
    return (
      <div
        id={id}
        className="flex flex-col items-center justify-center border border-dashed border-[#D9D5CC] bg-white/60 p-6 text-center text-xs text-[#17212B]/60"
        style={{ width: size, height: size }}
      >
        <p className="font-serif italic text-sm text-[#17212B]/70">{title || 'Gráfica de Radar'}</p>
        <p className="mt-2">Sin datos suficientes para graficar</p>
      </div>
    );
  }

  // If fewer than 3 data points, we can mirror or pad or render gracefully
  const displayPoints = [...data];
  const count = displayPoints.length;

  // Calculate coordinates
  const getCoordinates = (index: number, val: number, total: number) => {
    // start from top (-PI/2)
    const angle = (Math.PI * 2 / total) * index - Math.PI / 2;
    const clampedVal = Math.min(Math.max(val, 0), maxValue);
    const r = (clampedVal / (maxValue || 1)) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  // Polygon path for values
  let polygonPoints = '';
  if (count === 1) {
    // circle or single bar
    const p1 = getCoordinates(0, displayPoints[0].value, 1);
    polygonPoints = `${p1.x},${p1.y}`;
  } else if (count === 2) {
    const p1 = getCoordinates(0, displayPoints[0].value, 2);
    const p2 = getCoordinates(1, displayPoints[1].value, 2);
    polygonPoints = `${p1.x},${p1.y} ${p2.x},${p2.y}`;
  } else {
    polygonPoints = displayPoints
      .map((d, i) => {
        const { x, y } = getCoordinates(i, d.value, count);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  return (
    <div className="flex flex-col items-center">
      {title && (
        <h4 className="mb-2 font-serif text-sm font-semibold tracking-wide text-[#17212B] uppercase text-center">
          {title}
        </h4>
      )}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          id={id}
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          className="overflow-visible bg-white border border-[#D9D5CC] p-2 shadow-sm"
        >
          {/* Background concentric rings */}
          {Array.from({ length: levels }).map((_, lIndex) => {
            const levelRadius = (radius / levels) * (lIndex + 1);
            const levelVal = Math.round((maxValue / levels) * (lIndex + 1));
            return (
              <g key={lIndex}>
                {count >= 3 ? (
                  <polygon
                    points={Array.from({ length: count })
                      .map((_, i) => {
                        const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
                        const x = center + levelRadius * Math.cos(angle);
                        const y = center + levelRadius * Math.sin(angle);
                        return `${x.toFixed(1)},${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="#D9D5CC"
                    strokeWidth="1"
                    strokeDasharray={lIndex === levels - 1 ? 'none' : '2 2'}
                  />
                ) : (
                  <circle
                    cx={center}
                    cy={center}
                    r={levelRadius}
                    fill="none"
                    stroke="#D9D5CC"
                    strokeWidth="1"
                    strokeDasharray={lIndex === levels - 1 ? 'none' : '2 2'}
                  />
                )}
                {/* Level number marker along top axis */}
                <text
                  x={center + 4}
                  y={center - levelRadius + 10}
                  fontSize="9"
                  fontFamily="'IBM Plex Mono', monospace"
                  fill="#7A8490"
                >
                  {levelVal}
                </text>
              </g>
            );
          })}

          {/* Axes lines & Labels */}
          {displayPoints.map((item, i) => {
            const angle = (Math.PI * 2 / (count || 1)) * i - Math.PI / 2;
            const axisX = center + radius * Math.cos(angle);
            const axisY = center + radius * Math.sin(angle);

            // Label coordinate slightly outside
            const labelR = radius + 22;
            const labelX = center + labelR * Math.cos(angle);
            const labelY = center + labelR * Math.sin(angle);

            // Text anchor calculation
            let textAnchor: 'middle' | 'start' | 'end' = 'middle';
            if (Math.abs(Math.cos(angle)) > 0.3) {
              textAnchor = Math.cos(angle) > 0 ? 'start' : 'end';
            }

            const truncatedLabel =
              item.label.length > 16 ? item.label.substring(0, 14) + '…' : item.label;

            return (
              <g key={i}>
                <line
                  x1={center}
                  y1={center}
                  x2={axisX}
                  y2={axisY}
                  stroke="#D9D5CC"
                  strokeWidth="1"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  fontSize="10"
                  fontWeight="500"
                  fontFamily="'IBM Plex Sans', sans-serif"
                  fill="#17212B"
                  className="select-none"
                >
                  {truncatedLabel}
                  <tspan
                    dx="4"
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight="600"
                    fill={color}
                  >
                    ({item.value})
                  </tspan>
                </text>
              </g>
            );
          })}

          {/* Data Polygon */}
          {count >= 3 && (
            <polygon
              points={polygonPoints}
              fill={color}
              fillOpacity={fillOpacity}
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}

          {count === 2 && (
            <line
              x1={getCoordinates(0, displayPoints[0].value, 2).x}
              y1={getCoordinates(0, displayPoints[0].value, 2).y}
              x2={getCoordinates(1, displayPoints[1].value, 2).x}
              y2={getCoordinates(1, displayPoints[1].value, 2).y}
              stroke={color}
              strokeWidth="3"
            />
          )}

          {/* Data Points / dots */}
          {displayPoints.map((item, i) => {
            const { x, y } = getCoordinates(i, item.value, count || 1);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4.5"
                fill="#C85B3C"
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const ComparativeRadarChart: React.FC<{ series: RadarSeries[]; title?: string; size?: number }> = ({
  series, title, size = 560,
}) => {
  const axes = series[0]?.data || [];
  const count = axes.length;
  const center = size / 2;
  const radius = center - 82;
  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 / count) * index - Math.PI / 2;
    const distance = (Math.min(100, Math.max(0, value)) / 100) * radius;
    return { x: center + distance * Math.cos(angle), y: center - 12 + distance * Math.sin(angle) };
  };

  if (!count) return <div className="grid min-h-72 place-items-center text-sm text-[#7A8490]">Sin datos suficientes para graficar</div>;

  return <div className="flex flex-col items-center">
    {title && <h4 className="mb-2 font-serif text-sm font-semibold uppercase tracking-wide text-[#17212B]">{title}</h4>}
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[620px] rounded-xl border border-[#D9D5CC] bg-white shadow-sm">
      {Array.from({ length: 5 }).map((_, levelIndex) => {
        const value = (levelIndex + 1) * 20;
        return <g key={value}>
          <polygon points={axes.map((_, index) => { const p = point(index, value); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="#D9D5CC" strokeWidth="1" />
          <text x={center + 5} y={center - 12 - radius * value / 100 + 12} fontSize="9" fill="#7A8490">{value}</text>
        </g>;
      })}
      {axes.map((axis, index) => {
        const outer = point(index, 100);
        const angle = (Math.PI * 2 / count) * index - Math.PI / 2;
        const labelX = center + (radius + 28) * Math.cos(angle);
        const labelY = center - 12 + (radius + 28) * Math.sin(angle);
        return <g key={axis.label}>
          <line x1={center} y1={center - 12} x2={outer.x} y2={outer.y} stroke="#D9D5CC" />
          <text x={labelX} y={labelY} textAnchor={Math.cos(angle) > .25 ? 'start' : Math.cos(angle) < -.25 ? 'end' : 'middle'} dominantBaseline="middle" fontSize="11" fontWeight="600" fill="#17212B">{axis.label.length > 18 ? `${axis.label.slice(0, 16)}…` : axis.label}</text>
        </g>;
      })}
      {series.map((item) => {
        const points = item.data.map((datum, index) => point(index, datum.value));
        return <g key={item.label}>
          {count >= 3 && <polygon points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill={item.color} fillOpacity="0.12" stroke={item.color} strokeWidth="2.5" strokeLinejoin="round" />}
          {points.map((p, index) => <circle key={index} cx={p.x} cy={p.y} r="4.5" fill={item.color} stroke="#FFFFFF" strokeWidth="1.5" />)}
        </g>;
      })}
      {series.map((item, index) => {
        const totalWidth = series.length * 120;
        const x = center - totalWidth / 2 + index * 120;
        return <g key={`legend-${item.label}`}><circle cx={x} cy={size - 24} r="5" fill={item.color}/><text x={x + 10} y={size - 20} fontSize="10" fontWeight="600" fill="#17212B">{item.label}</text></g>;
      })}
    </svg>
  </div>;
};
