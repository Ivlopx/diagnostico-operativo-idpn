import { RadarDataPoint } from '../components/RadarChart';

export interface RadarImageSeries {
  label: string;
  color: string;
  data: RadarDataPoint[];
}

/**
 * Draws a clean radar chart directly on an HTML5 canvas and returns a base64 PNG dataURL.
 * This guarantees crisp image embedding in the generated PDF report.
 */
export function renderRadarToDataURL(
  data: RadarDataPoint[],
  maxValue: number,
  title: string = '',
  size: number = 400,
  color: string = '#173B57'
): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.strokeStyle = '#D9D5CC';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  // Title
  if (title) {
    ctx.fillStyle = '#17212B';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), size / 2, 24);
  }

  const center = size / 2;
  const radius = center - 54;
  const levels = 4;
  const count = data.length;

  if (count === 0) {
    ctx.fillStyle = '#7A8490';
    ctx.font = 'italic 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sin datos registrados', center, center);
    return canvas.toDataURL('image/png');
  }

  // Concentric levels
  for (let l = 1; l <= levels; l++) {
    const levelR = (radius / levels) * l;
    const levelVal = Math.round((maxValue / levels) * l);

    ctx.beginPath();
    ctx.strokeStyle = '#E0E4DE';
    ctx.lineWidth = 1;
    if (l < levels) {
      ctx.setLineDash([3, 3]);
    } else {
      ctx.setLineDash([]);
    }

    if (count >= 3) {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
        const x = center + levelR * Math.cos(angle);
        const y = center + levelR * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.arc(center, center, levelR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Marker
    ctx.fillStyle = '#7A8490';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(String(levelVal), center + 4, center - levelR + 10);
  }

  // Axes and Labels
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / (count || 1)) * i - Math.PI / 2;
    const axisX = center + radius * Math.cos(angle);
    const axisY = center + radius * Math.sin(angle);

    ctx.beginPath();
    ctx.strokeStyle = '#D9D5CC';
    ctx.lineWidth = 1;
    ctx.moveTo(center, center);
    ctx.lineTo(axisX, axisY);
    ctx.stroke();

    // Label
    const labelR = radius + 22;
    const labelX = center + labelR * Math.cos(angle);
    const labelY = center + labelR * Math.sin(angle);

    let label = data[i].label || '';
    if (label.length > 15) label = label.substring(0, 13) + '…';

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#17212B';
    let align: CanvasTextAlign = 'center';
    if (Math.abs(Math.cos(angle)) > 0.3) {
      align = Math.cos(angle) > 0 ? 'left' : 'right';
    }
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(`${label} (${data[i].value})`, labelX, labelY);
  }

  // Data Polygon
  if (count >= 3) {
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i - Math.PI / 2;
      const clampedVal = Math.min(Math.max(data[i].value, 0), maxValue);
      const r = (clampedVal / (maxValue || 1)) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color === '#173B57' ? 'rgba(31, 111, 100, 0.28)' : 'rgba(181, 80, 42, 0.25)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (count === 2) {
    ctx.beginPath();
    const a1 = -Math.PI / 2;
    const r1 = (Math.min(Math.max(data[0].value, 0), maxValue) / (maxValue || 1)) * radius;
    const a2 = Math.PI / 2;
    const r2 = (Math.min(Math.max(data[1].value, 0), maxValue) / (maxValue || 1)) * radius;
    ctx.moveTo(center + r1 * Math.cos(a1), center + r1 * Math.sin(a1));
    ctx.lineTo(center + r2 * Math.cos(a2), center + r2 * Math.sin(a2));
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Dots
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / (count || 1)) * i - Math.PI / 2;
    const clampedVal = Math.min(Math.max(data[i].value, 0), maxValue);
    const r = (clampedVal / (maxValue || 1)) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#C85B3C';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

export function renderComparativeRadarToDataURL(
  series: RadarImageSeries[],
  title = 'Comparativa Integral por Área',
  size = 520,
): string {
  if (typeof document === 'undefined') return '';
  const axes = series[0]?.data || [];
  const count = axes.length;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#D9D5CC'; ctx.strokeRect(1, 1, size - 2, size - 2);
  ctx.fillStyle = '#17212B'; ctx.font = 'bold 14px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText(title.toUpperCase(), size / 2, 25);
  if (!count) { ctx.fillStyle = '#7A8490'; ctx.font = '12px sans-serif'; ctx.fillText('Sin datos registrados', size / 2, size / 2); return canvas.toDataURL('image/png'); }
  const centerX = size / 2, centerY = size / 2 - 8, radius = size / 2 - 82;
  const coordinate = (index: number, value: number, extra = 0) => {
    const angle = Math.PI * 2 / count * index - Math.PI / 2;
    const distance = radius * Math.min(100, Math.max(0, value)) / 100 + extra;
    return { x: centerX + distance * Math.cos(angle), y: centerY + distance * Math.sin(angle), angle };
  };
  for (let value = 20; value <= 100; value += 20) {
    ctx.beginPath();
    axes.forEach((_, index) => { const p = coordinate(index, value); index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
    ctx.closePath(); ctx.strokeStyle = '#D9D5CC'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#7A8490'; ctx.font = '9px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(String(value), centerX + 5, centerY - radius * value / 100 + 10);
  }
  axes.forEach((axis, index) => {
    const outer = coordinate(index, 100), label = coordinate(index, 100, 25);
    ctx.beginPath(); ctx.moveTo(centerX, centerY); ctx.lineTo(outer.x, outer.y); ctx.strokeStyle = '#D9D5CC'; ctx.stroke();
    ctx.fillStyle = '#17212B'; ctx.font = '600 10px sans-serif';
    ctx.textAlign = Math.cos(label.angle) > .25 ? 'left' : Math.cos(label.angle) < -.25 ? 'right' : 'center';
    const text = axis.label.length > 18 ? `${axis.label.slice(0, 16)}…` : axis.label;
    ctx.fillText(text, label.x, label.y);
  });
  series.forEach((item) => {
    const points = item.data.map((datum, index) => coordinate(index, datum.value));
    ctx.beginPath(); points.forEach((p, index) => index ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    ctx.globalAlpha = .14; ctx.fillStyle = item.color; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = item.color; ctx.lineWidth = 2.5; ctx.stroke();
    points.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fillStyle = item.color; ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.stroke(); });
  });
  const legendWidth = series.length * 125;
  series.forEach((item, index) => {
    const x = centerX - legendWidth / 2 + index * 125;
    ctx.beginPath(); ctx.arc(x, size - 22, 5, 0, Math.PI * 2); ctx.fillStyle = item.color; ctx.fill();
    ctx.fillStyle = '#17212B'; ctx.font = '600 10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(item.label, x + 10, size - 18);
  });
  return canvas.toDataURL('image/png');
}
