/**
 * charts.js - Chart.js visualization
 * App Quản Lý Chi Tiêu Thông Minh
 */

// Chart instances storage
const chartInstances = {};

// Common Chart.js defaults for dark theme
const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { family: 'Inter', size: 12 },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 15, 35, 0.95)',
      titleColor: '#f1f5f9',
      bodyColor: '#cbd5e1',
      borderColor: 'rgba(124, 58, 237, 0.3)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: 'Inter', weight: '600' },
      bodyFont: { family: 'Inter' },
      displayColors: true,
      callbacks: {
        label: function (context) {
          return ` ${context.label}: ${formatCurrency(context.parsed || context.raw)}`;
        }
      }
    }
  }
};

// ==================== PIE CHART (Spending by Category) ====================

function renderPieChart(canvasId = 'chart-pie') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Destroy existing
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const stats = getStats('month');
  const entries = Object.entries(stats.byCategory)
    .filter(([cat]) => cat !== 'income')
    .sort((a, b) => b[1].total - a[1].total);

  if (entries.length === 0) {
    canvas.parentElement.innerHTML = `
      <div class="chart-empty">
        <span class="chart-empty-icon">📊</span>
        <p>Chưa có dữ liệu chi tiêu</p>
      </div>`;
    return;
  }

  const labels = entries.map(([cat]) => `${CATEGORIES[cat]?.icon || ''} ${CATEGORIES[cat]?.name || cat}`);
  const data = entries.map(([, d]) => d.total);
  const colors = entries.map(([cat]) => CATEGORIES[cat]?.color || '#94a3b8');

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      cutout: '65%',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: {
          ...CHART_DEFAULTS.plugins.legend,
          position: 'bottom',
          labels: {
            ...CHART_DEFAULTS.plugins.legend.labels,
            padding: 12
          }
        },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((context.raw / total) * 100).toFixed(1);
              return ` ${context.label}: ${formatCurrency(context.raw)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ==================== BAR CHART (Daily Spending) ====================

function renderBarChart(canvasId = 'chart-bar') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  // Get last 7 days
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().split('T')[0],
      label: i === 0 ? 'Hôm nay' : i === 1 ? 'Hôm qua' : d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' })
    });
  }

  const stats = getStats('week');
  const data = days.map(d => stats.byDay[d.key] || 0);
  const maxVal = Math.max(...data, 1);

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: days.map(d => d.label),
      datasets: [{
        label: 'Chi tiêu',
        data,
        backgroundColor: data.map(v =>
          v > maxVal * 0.8 ? 'rgba(239, 68, 68, 0.7)' :
            v > maxVal * 0.5 ? 'rgba(249, 115, 22, 0.7)' :
              'rgba(124, 58, 237, 0.7)'
        ),
        borderColor: data.map(v =>
          v > maxVal * 0.8 ? '#ef4444' :
            v > maxVal * 0.5 ? '#f97316' :
              '#7c3aed'
        ),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 48
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: (ctx) => ` Chi tiêu: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#64748b',
            font: { family: 'Inter', size: 11 }
          }
        },
        y: {
          grid: {
            color: 'rgba(148, 163, 184, 0.08)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { family: 'Inter', size: 11 },
            callback: (v) => formatShortCurrency(v)
          },
          beginAtZero: true
        }
      }
    }
  });
}

// ==================== LINE CHART (Spending Trend) ====================

function renderTrendChart(canvasId = 'chart-trend') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const trend = getSpendingTrend(6);

  chartInstances[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels: trend.map(t => t.month),
      datasets: [
        {
          label: 'Chi tiêu',
          data: trend.map(t => t.expense),
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#7c3aed',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        },
        {
          label: 'Thu nhập',
          data: trend.map(t => t.income),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: {
          ...CHART_DEFAULTS.plugins.legend,
          position: 'top'
        },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.08)', drawBorder: false },
          ticks: {
            color: '#64748b',
            font: { family: 'Inter', size: 11 },
            callback: (v) => formatShortCurrency(v)
          },
          beginAtZero: true
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
}

// ==================== BUDGET PROGRESS ====================

function renderBudgetProgress(containerId = 'budget-progress') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const progress = getBudgetProgress();

  if (progress.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🎯</span>
        <p>Chưa đặt ngân sách</p>
        <small>Vào mục Ngân sách để thiết lập</small>
      </div>`;
    return;
  }

  container.innerHTML = progress.map(p => {
    const isOver = p.percentage >= 100;
    const isWarning = p.percentage >= 80;
    const statusClass = isOver ? 'over' : isWarning ? 'warning' : 'normal';

    return `
      <div class="budget-item ${statusClass}">
        <div class="budget-item-header">
          <div class="budget-item-label">
            <span class="budget-icon">${p.icon}</span>
            <span>${p.name}</span>
          </div>
          <span class="budget-item-amount">${formatCurrency(p.spent)} / ${formatCurrency(p.budget)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(p.percentage, 100)}%; background: ${isOver ? 'var(--gradient-danger)' : isWarning ? 'var(--gradient-warning)' : `linear-gradient(90deg, ${p.color}, ${p.color}dd)`}"></div>
        </div>
        <div class="budget-item-footer">
          <span>${p.percentage.toFixed(0)}% đã dùng</span>
          <span>${isOver ? `Vượt ${formatCurrency(p.spent - p.budget)}` : `Còn ${formatCurrency(p.budget - p.spent)}`}</span>
        </div>
      </div>`;
  }).join('');
}

// ==================== UPDATE ALL CHARTS ====================

function updateAllCharts() {
  renderPieChart();
  renderBarChart();
  renderTrendChart();
  renderBudgetProgress();
}
