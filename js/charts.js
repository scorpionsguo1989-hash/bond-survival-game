// js/charts.js
// 依赖全局 Chart（CDN引入）

let debtChart = null;
let cashChart = null;

export function renderDebtWaterfall(state) {
  const ctx = document.getElementById('chart-debt');
  if (!ctx) return;
  const labels = state.metrics.debtMaturity.map((_, i) => {
    const total = state.quartersPassed + i;
    const y = state.year + Math.floor((state.quarter - 1 + i) / 4);
    const q = ((state.quarter - 1 + i) % 4) + 1;
    return `Q${q}'${y.toString().slice(-2)}`;
  });
  const data = state.metrics.debtMaturity;
  const colors = data.map(v => v >= 6 ? '#ef5350' : (v >= 3 ? '#ffb74d' : '#81c784'));

  if (debtChart) debtChart.destroy();
  debtChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 2 }] },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}亿` } } },
      scales: {
        x: { ticks: { color: '#4a6080', font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { color: '#4a6080' }, grid: { color: '#1e2d47' } }
      },
      maintainAspectRatio: false,
    }
  });
}

export function renderCashTrend(state) {
  const ctx = document.getElementById('chart-cash');
  if (!ctx) return;
  const labels = state.history.map(h => `${h.year}Q${h.quarter}`);
  const data = state.history.map(h => h.cash);
  // 当前点
  labels.push(`${state.year}Q${state.quarter}`);
  data.push(state.metrics.cash);

  if (cashChart) cashChart.destroy();
  cashChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#4fc3f7',
        backgroundColor: 'rgba(79,195,247,0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#4a6080' }, grid: { display: false } },
        y: { ticks: { color: '#4a6080' }, grid: { color: '#1e2d47' } }
      },
      maintainAspectRatio: false,
    }
  });
}

export function renderRadarChart(canvasId, dimensions) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: Object.keys(dimensions),
      datasets: [{
        data: Object.values(dimensions),
        backgroundColor: 'rgba(79,195,247,0.2)',
        borderColor: '#4fc3f7',
        pointBackgroundColor: '#4fc3f7',
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: '#4a6080', backdropColor: 'transparent' },
          grid: { color: '#1e2d47' },
          angleLines: { color: '#1e2d47' },
          pointLabels: { color: '#8fa8c8', font: { size: 11 } }
        }
      },
      maintainAspectRatio: false,
    }
  });
}
