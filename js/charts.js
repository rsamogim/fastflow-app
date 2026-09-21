/**
 * FastFlow v2.0 — Módulo de Gráficos em HTML5 Canvas 2D Puro
 * Gráficos de jejum: barras, linha de evolução, heatmap estilo GitHub e rosca.
 * Gráficos GLP-1: evolução de peso com titulação de doses e histograma de hidratação.
 * Otimizado para telas Retina (HiDPI) e adaptável a temas Dark/Light.
 */

import { formatDuration } from './utils.js';

/**
 * Obtém as cores do tema atual a partir do CSS computado.
 */
function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    accent: styles.getPropertyValue('--accent').trim() || '#00E0A4',
    accentEating: styles.getPropertyValue('--accent-eating').trim() || '#FFB547',
    accentGold: styles.getPropertyValue('--accent-gold').trim() || '#FFD700',
    accentGlp1: styles.getPropertyValue('--accent-glp1').trim() || '#00C6FF',
    accentGlp1Deep: styles.getPropertyValue('--accent-glp1-deep').trim() || '#0072FF',
    textPrimary: styles.getPropertyValue('--text-primary').trim() || '#F5F7FA',
    textSecondary: styles.getPropertyValue('--text-secondary').trim() || '#8B92A0',
    border: styles.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.08)',
    track: styles.getPropertyValue('--ring-track').trim() || '#1C2028',
    grid: styles.getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.05)',
    axis: styles.getPropertyValue('--chart-axis').trim() || 'rgba(255,255,255,0.35)'
  };
}

/**
 * Configura o Canvas para resolução nítida em telas Retina / High-DPI.
 */
function setupHiDPI(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.resetTransform?.();
  ctx.scale(dpr, dpr);
  return ctx;
}

/**
 * 1. GRÁFICO DE BARRAS — Duração dos Últimos 7 / 14 / 30 Dias vs Linha de Meta
 */
export function renderBarChart(canvasId, history = [], days = 7, defaultTargetHours = 16) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const width = canvas.parentElement.clientWidth || 340;
  const height = 180;
  const ctx = setupHiDPI(canvas, width, height);
  const colors = getThemeColors();

  const dayBuckets = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const nextD = new Date(d);
    nextD.setDate(d.getDate() + 1);

    const dayFasts = history.filter((f) => {
      const fTime = f.endedAt || f.startedAt;
      return fTime >= d.getTime() && fTime < nextD.getTime();
    });

    const totalDurationHours = dayFasts.reduce(
      (sum, f) => sum + (f.durationMs || 0) / (3600 * 1000),
      0
    );

    const targetHours = dayFasts.length > 0 ? (dayFasts[0].fastHours || defaultTargetHours) : defaultTargetHours;

    dayBuckets.push({
      date: d,
      label: d.toLocaleDateString('pt-BR', { weekday: 'narrow' }),
      dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
      durationHours: totalDurationHours,
      targetHours
    });
  }

  const maxHours = Math.max(
    ...dayBuckets.map((b) => Math.max(b.durationHours, b.targetHours)),
    defaultTargetHours + 4,
    20
  );

  const padLeft = 32;
  const padRight = 16;
  const padBottom = 24;
  const padTop = 16;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  ctx.clearRect(0, 0, width, height);

  // Linhas horizontais de grade
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxHours / gridSteps) * i;
    const y = padTop + chartHeight - (val / maxHours) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = colors.textSecondary;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(val)}h`, padLeft - 6, y);
  }

  // Linha da Meta
  const metaY = padTop + chartHeight - (defaultTargetHours / maxHours) * chartHeight;
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = colors.accentEating;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, metaY);
  ctx.lineTo(width - padRight, metaY);
  ctx.stroke();
  ctx.restore();

  // Desenho das Barras
  const barWidth = Math.max(6, Math.min(24, (chartWidth / days) * 0.6));
  const slotWidth = chartWidth / days;

  dayBuckets.forEach((bucket, idx) => {
    const x = padLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
    const barHeight = (bucket.durationHours / maxHours) * chartHeight;
    const y = padTop + chartHeight - barHeight;

    ctx.fillStyle = colors.track;
    drawRoundedRect(ctx, x, padTop, barWidth, chartHeight, 4);
    ctx.fill();

    if (bucket.durationHours > 0) {
      const isGoalReached = bucket.durationHours >= bucket.targetHours * 0.95;
      ctx.fillStyle = isGoalReached ? colors.accent : colors.accentEating;
      drawRoundedRect(ctx, x, y, barWidth, barHeight, 4);
      ctx.fill();
    }

    ctx.fillStyle = colors.textSecondary;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelText = days <= 7 ? bucket.label : (idx % 5 === 0 ? bucket.dateLabel : '');
    ctx.fillText(labelText, x + barWidth / 2, height - padBottom + 6);
  });
}

/**
 * 2. GRÁFICO DE LINHA — Evolução Contínua da Duração ao Longo do Tempo
 */
export function renderLineChart(canvasId, history = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const width = canvas.parentElement.clientWidth || 340;
  const height = 180;
  const ctx = setupHiDPI(canvas, width, height);
  const colors = getThemeColors();

  const recentFasts = [...history]
    .sort((a, b) => (a.endedAt || a.startedAt) - (b.endedAt || b.startedAt))
    .slice(-15);

  ctx.clearRect(0, 0, width, height);

  if (recentFasts.length < 2) {
    ctx.fillStyle = colors.textSecondary;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Complete ao menos 2 jejuns para ver a tendência', width / 2, height / 2);
    return;
  }

  const values = recentFasts.map((f) => (f.durationMs || 0) / (3600 * 1000));
  const maxVal = Math.max(...values, 20);

  const padLeft = 32;
  const padRight = 16;
  const padBottom = 24;
  const padTop = 16;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const val = (maxVal / 3) * i;
    const y = padTop + chartHeight - (val / maxVal) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = colors.textSecondary;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(val)}h`, padLeft - 6, y);
  }

  const points = values.map((val, idx) => {
    const x = padLeft + (idx / (values.length - 1)) * chartWidth;
    const y = padTop + chartHeight - (val / maxVal) * chartHeight;
    return { x, y, val };
  });

  const gradient = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
  gradient.addColorStop(0, 'rgba(0, 224, 164, 0.25)');
  gradient.addColorStop(1, 'rgba(0, 224, 164, 0.0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.lineTo(points[points.length - 1].x, padTop + chartHeight);
  ctx.lineTo(points[0].x, padTop + chartHeight);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  points.forEach((p) => {
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.track;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

/**
 * 3. HEATMAP ESTILO GITHUB — Consistência Diária dos Últimos 90 Dias
 */
export function renderHeatmap(canvasId, history = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const width = canvas.parentElement.clientWidth || 340;
  const height = 120;
  const ctx = setupHiDPI(canvas, width, height);
  const colors = getThemeColors();

  ctx.clearRect(0, 0, width, height);

  const dayMap = new Map();
  history.forEach((f) => {
    const date = new Date(f.endedAt || f.startedAt);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    const prev = dayMap.get(key) || 0;
    dayMap.set(key, prev + (f.durationMs || 0) / (3600 * 1000));
  });

  const weeks = 13;
  const cellSize = Math.floor((width - 40) / weeks) - 3;
  const gap = 3;
  const startX = 24;
  const startY = 12;

  const now = new Date();
  const currentDayOfWeek = now.getDay();

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const daysAgo = (weeks - 1 - w) * 7 + (currentDayOfWeek - d);
      if (daysAgo < 0) continue;

      const date = new Date(now);
      date.setDate(now.getDate() - daysAgo);

      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const hours = dayMap.get(key) || 0;

      let cellColor = colors.track;
      if (hours >= 16) {
        cellColor = colors.accent;
      } else if (hours >= 12) {
        cellColor = 'rgba(0, 224, 164, 0.7)';
      } else if (hours > 0) {
        cellColor = 'rgba(0, 224, 164, 0.35)';
      }

      const x = startX + w * (cellSize + gap);
      const y = startY + d * (cellSize + gap);

      ctx.fillStyle = cellColor;
      drawRoundedRect(ctx, x, y, cellSize, cellSize, 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = colors.textSecondary;
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const labels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  [1, 3, 5].forEach((d) => {
    const y = startY + d * (cellSize + gap) + cellSize / 2;
    ctx.fillText(labels[d], startX - 6, y);
  });
}

/**
 * 4. GRÁFICO DE ROSCA (DONUT) — Distribuição dos Protocolos Utilizados
 */
export function renderDonutChart(canvasId, legendId, history = []) {
  const canvas = document.getElementById(canvasId);
  const legendContainer = document.getElementById(legendId);
  if (!canvas) return;

  const width = canvas.parentElement.clientWidth || 300;
  const height = 180;
  const ctx = setupHiDPI(canvas, width, height);
  const colors = getThemeColors();

  ctx.clearRect(0, 0, width, height);

  if (!history || history.length === 0) {
    ctx.fillStyle = colors.textSecondary;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Nenhum dado de protocolo disponível', width / 2, height / 2);
    if (legendContainer) legendContainer.innerHTML = '';
    return;
  }

  const protocolCounts = {};
  history.forEach((f) => {
    const label = f.protocolId || '16:8';
    protocolCounts[label] = (protocolCounts[label] || 0) + 1;
  });

  const palette = ['#00E0A4', '#FFB547', '#38BDF8', '#A78BFA', '#F472B6', '#FBBF24'];
  const total = history.length;
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(centerX, centerY) - 16;
  const innerRadius = outerRadius * 0.62;

  let startAngle = -Math.PI / 2;
  let colorIndex = 0;

  const legendItems = [];

  Object.entries(protocolCounts).forEach(([protocol, count]) => {
    const sliceAngle = (count / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const color = palette[colorIndex % palette.length];

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    const percent = Math.round((count / total) * 100);
    legendItems.push({ protocol, count, percent, color });

    startAngle = endAngle;
    colorIndex++;
  });

  ctx.fillStyle = colors.textPrimary;
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${total}`, centerX, centerY - 8);

  ctx.fillStyle = colors.textSecondary;
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('Jejuns', centerX, centerY + 10);

  if (legendContainer) {
    legendContainer.innerHTML = legendItems
      .map(
        (item) => `
        <div class="donut-legend-item">
          <span class="donut-legend-color" style="background-color: ${item.color}"></span>
          <span><strong>${item.protocol}</strong> (${item.percent}%)</span>
        </div>
      `
      )
      .join('');
  }
}

/**
 * 5. NOVO GRÁFICO GLP-1: Evolução de Peso Corporal x Titulação de Doses
 */
export function renderWeightDoseChart(canvasId, weightHistory = [], injectionsHistory = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const width = canvas.parentElement.clientWidth || 340;
  const height = 180;
  const ctx = setupHiDPI(canvas, width, height);
  const colors = getThemeColors();

  ctx.clearRect(0, 0, width, height);

  // Ordena cronologicamente
  const sortedWeights = [...weightHistory].sort((a, b) => a.date - b.date);

  if (sortedWeights.length === 0) {
    ctx.fillStyle = colors.textSecondary;
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Registre seu peso para acompanhar a evolução', width / 2, height / 2);
    return;
  }

  const weights = sortedWeights.map((w) => w.weight);
  const minWeight = Math.floor(Math.min(...weights) - 2);
  const maxWeight = Math.ceil(Math.max(...weights) + 2);
  const weightRange = Math.max(4, maxWeight - minWeight);

  const padLeft = 38;
  const padRight = 16;
  const padBottom = 26;
  const padTop = 16;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Grade horizontal
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  const steps = 3;
  for (let i = 0; i <= steps; i++) {
    const val = minWeight + (weightRange / steps) * i;
    const y = padTop + chartHeight - ((val - minWeight) / weightRange) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = colors.textSecondary;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${val.toFixed(1)}kg`, padLeft - 6, y + 3);
  }

  // Pontos de peso
  const points = sortedWeights.map((item, idx) => {
    const x = sortedWeights.length === 1
      ? padLeft + chartWidth / 2
      : padLeft + (idx / (sortedWeights.length - 1)) * chartWidth;
    const y = padTop + chartHeight - ((item.weight - minWeight) / weightRange) * chartHeight;
    return { x, y, weight: item.weight, date: item.date };
  });

  // Preenchimento com gradiente azul ciano GLP-1
  if (points.length > 1) {
    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    grad.addColorStop(0, 'rgba(0, 198, 255, 0.22)');
    grad.addColorStop(1, 'rgba(0, 198, 255, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(points[points.length - 1].x, padTop + chartHeight);
    ctx.lineTo(points[0].x, padTop + chartHeight);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Linha
    ctx.strokeStyle = colors.accentGlp1;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  // Desenha pontos e rótulos
  points.forEach((p, idx) => {
    ctx.fillStyle = colors.accentGlp1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.track;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // Rótulo da data
    const d = new Date(p.date);
    ctx.fillStyle = colors.textSecondary;
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    if (sortedWeights.length <= 6 || idx % 2 === 0) {
      ctx.fillText(`${d.getDate()}/${d.getMonth() + 1}`, p.x, height - padBottom + 12);
    }
  });

  // Marcadores de Injeção GLP-1 (Doses)
  if (injectionsHistory && injectionsHistory.length > 0) {
    injectionsHistory.forEach((inj) => {
      // Se a injeção estiver no período do gráfico
      const firstDate = sortedWeights[0].date;
      const lastDate = sortedWeights[sortedWeights.length - 1].date;
      if (inj.date >= firstDate && inj.date <= lastDate && sortedWeights.length > 1) {
        const timeRatio = (inj.date - firstDate) / Math.max(1, lastDate - firstDate);
        const injX = padLeft + timeRatio * chartWidth;

        ctx.save();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = colors.accentGlp1Deep;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(injX, padTop);
        ctx.lineTo(injX, padTop + chartHeight);
        ctx.stroke();

        ctx.fillStyle = colors.accentGlp1;
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(inj.dose || '💉', injX, padTop - 4);
        ctx.restore();
      }
    });
  }
}

/**
 * 6. NOVO GRÁFICO GLP-1: Histograma de Hidratação Semanal (Últimos 7 Dias)
 */
export function renderHydrationChart(canvasId, waterLog = {}, targetMl = 2500) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const width = canvas.parentElement.clientWidth || 340;
  const height = 150;
  const ctx = setupHiDPI(canvas, width, height);
  const colors = getThemeColors();

  ctx.clearRect(0, 0, width, height);

  const targetCups = Math.ceil(targetMl / 250);
  const days = 7;
  const dayBuckets = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cups = waterLog[key] || 0;
    dayBuckets.push({
      label: d.toLocaleDateString('pt-BR', { weekday: 'narrow' }),
      cups,
      reached: cups >= targetCups
    });
  }

  const maxCups = Math.max(...dayBuckets.map((b) => b.cups), targetCups + 2, 12);

  const padLeft = 28;
  const padRight = 16;
  const padBottom = 22;
  const padTop = 14;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Grade horizontal
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  [0, Math.floor(targetCups / 2), targetCups].forEach((val) => {
    const y = padTop + chartHeight - (val / maxCups) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = colors.textSecondary;
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${val * 250}ml`, padLeft - 4, y + 3);
  });

  // Linha da Meta de Água
  const metaY = padTop + chartHeight - (targetCups / maxCups) * chartHeight;
  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = colors.accentGlp1;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(padLeft, metaY);
  ctx.lineTo(width - padRight, metaY);
  ctx.stroke();
  ctx.restore();

  // Barras de Água
  const slotWidth = chartWidth / days;
  const barWidth = Math.min(20, slotWidth * 0.55);

  dayBuckets.forEach((bucket, idx) => {
    const x = padLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
    const barHeight = (bucket.cups / maxCups) * chartHeight;
    const y = padTop + chartHeight - barHeight;

    ctx.fillStyle = colors.track;
    drawRoundedRect(ctx, x, padTop, barWidth, chartHeight, 4);
    ctx.fill();

    if (bucket.cups > 0) {
      ctx.fillStyle = bucket.reached ? colors.accentGlp1 : 'rgba(0, 198, 255, 0.5)';
      drawRoundedRect(ctx, x, y, barWidth, barHeight, 4);
      ctx.fill();
    }

    ctx.fillStyle = colors.textSecondary;
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bucket.label, x + barWidth / 2, height - padBottom + 12);
  });
}

/**
 * Função utilitária para desenhar retângulos com cantos arredondados no Canvas.
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (height <= 0) return;
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Renderiza todos os gráficos da aplicação FastFlow v2.0.
 */
export function renderAllCharts(history = [], barPeriod = 7, glp1State = null) {
  renderBarChart('canvas-bar-chart', history, barPeriod);
  renderLineChart('canvas-line-chart', history);
  renderHeatmap('canvas-heatmap', history);
  renderDonutChart('canvas-donut', 'donut-legend-container', history);

  if (glp1State && glp1State.settings?.glp1?.enabled) {
    renderWeightDoseChart('canvas-weight-chart', glp1State.weightHistory || [], glp1State.glp1Injections || []);
    renderHydrationChart('canvas-water-chart', glp1State.glp1WaterLog || {}, glp1State.settings.glp1.waterTargetMl || 2500);
  }
}
