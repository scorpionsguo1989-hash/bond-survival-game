// js/charts.js
// 依赖全局 Chart（CDN引入）

let debtChart = null;
let cashChart = null;
let navChart = null;
let holdingsChart = null;

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

// IM 净值曲线：从 state.history 提取 nav
export function renderNavChart(state) {
  const ctx = document.getElementById('chart-nav');
  if (!ctx) return;
  const labels = state.history.map(h => `${h.year}Q${h.quarter}`);
  const data = state.history.map(h => h.nav).filter(v => v != null);
  // 当前点
  labels.push(`${state.year}Q${state.quarter}`);
  data.push(state.metrics.nav);
  // 死亡线
  const deathLine = labels.map(() => 0.85);

  if (navChart) navChart.destroy();
  navChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'NAV',
          data,
          borderColor: '#4fc3f7',
          backgroundColor: 'rgba(79,195,247,0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
        },
        {
          label: '预警线 0.85',
          data: deathLine,
          borderColor: '#ef5350',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#4a6080' }, grid: { display: false } },
        y: { ticks: { color: '#4a6080' }, grid: { color: '#1e2d47' }, suggestedMin: 0.8, suggestedMax: 1.1 },
      },
      maintainAspectRatio: false,
    },
  });
}

// IM 持仓评级结构饼图：基于 creditExposure（AA 及以下占比）
export function renderHoldingsChart(state) {
  const ctx = document.getElementById('chart-holdings');
  if (!ctx) return;
  const m = state.metrics;
  const ce = m.creditExposure || 0;
  const aaPlus = Math.max(0, 100 - ce);
  const aa = ce * 0.6;
  const aaMinus = ce * 0.4;

  if (holdingsChart) holdingsChart.destroy();
  holdingsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['AAA / AA+', 'AA', 'AA- 及以下'],
      datasets: [{
        data: [aaPlus, aa, aaMinus],
        backgroundColor: ['#81c784', '#ffb74d', '#ef5350'],
        borderColor: '#0f1623',
        borderWidth: 2,
      }],
    },
    options: {
      plugins: {
        legend: {
          display: true, position: 'bottom',
          labels: { color: '#8fa8c8', font: { size: 10 }, padding: 6, boxWidth: 10 },
        },
      },
      maintainAspectRatio: false,
    },
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
