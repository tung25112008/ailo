/**
 * utils.js - Helper functions & category definitions
 * App Quản Lý Chi Tiêu Thông Minh
 */

// ==================== CATEGORIES ====================
const CATEGORIES = {
  food:          { name: 'Ăn uống',   icon: '🍜', color: '#f97316' },
  transport:     { name: 'Di chuyển',  icon: '🚗', color: '#3b82f6' },
  shopping:      { name: 'Mua sắm',   icon: '🛍️', color: '#ec4899' },
  entertainment: { name: 'Giải trí',   icon: '🎮', color: '#8b5cf6' },
  bills:         { name: 'Hóa đơn',   icon: '📄', color: '#eab308' },
  health:        { name: 'Sức khỏe',  icon: '💊', color: '#22c55e' },
  education:     { name: 'Giáo dục',  icon: '📚', color: '#06b6d4' },
  income:        { name: 'Thu nhập',   icon: '💰', color: '#10b981' },
  other:         { name: 'Khác',       icon: '📦', color: '#94a3b8' }
};

// Expense-only categories (exclude income)
const EXPENSE_CATEGORIES = Object.keys(CATEGORIES).filter(k => k !== 'income');

// ==================== FORMAT HELPERS ====================

/**
 * Format amount to VND currency string
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(amount) + ' ₫';
}

/**
 * Format short number (e.g., 1.5M, 500K)
 */
function formatShortCurrency(amount) {
  if (amount >= 1000000000) return (amount / 1000000000).toFixed(1).replace('.0', '') + 'B';
  if (amount >= 1000000) return (amount / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K';
  return amount.toString();
}

/**
 * Format date to Vietnamese locale
 */
function formatDate(dateStr, format = 'short') {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  if (format === 'short') {
    return date.toLocaleDateString('vi-VN');
  }
  if (format === 'input') {
    // For input[type=date] value
    return date.toISOString().split('T')[0];
  }
  if (format === 'month') {
    return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  }
  if (format === 'day') {
    return date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
  }
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Get relative time string
 */
function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return formatDate(dateStr, 'short');
}

// ==================== DATE HELPERS ====================

/**
 * Get date range for a period
 */
function getDateRange(period) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start.setDate(now.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'all':
      start.setFullYear(2000, 0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
}

/**
 * Get current month key (YYYY-MM)
 */
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get list of last N months
 */
function getLastMonths(n = 6) {
  const months = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    });
  }
  return months;
}

/**
 * Get days in current month
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// ==================== ID GENERATION ====================

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== MODAL HELPERS ====================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ==================== MISC HELPERS ====================

/**
 * Debounce function
 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Get greeting based on time of day
 */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/**
 * Animate counter from 0 to target
 */
function animateValue(element, start, end, duration = 800) {
  const range = end - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + range * ease);
    element.textContent = formatCurrency(current);
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}
