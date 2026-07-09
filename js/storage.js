/**
 * storage.js - localStorage CRUD operations
 * App Quản Lý Chi Tiêu Thông Minh
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'et_transactions',
  BUDGETS: 'et_budgets',
  SETTINGS: 'et_settings',
  CHAT_HISTORY: 'et_chat_history'
};

// ==================== TRANSACTIONS ====================

/**
 * Get all transactions, optionally filtered
 */
function getTransactions(filters = {}) {
  const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  let transactions = raw ? JSON.parse(raw) : [];

  // Sort by date descending (newest first)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Apply filters
  if (filters.type) {
    transactions = transactions.filter(t => t.type === filters.type);
  }

  if (filters.category) {
    transactions = transactions.filter(t => t.category === filters.category);
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    transactions = transactions.filter(t => new Date(t.date) >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    transactions = transactions.filter(t => new Date(t.date) <= end);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    transactions = transactions.filter(t =>
      t.description.toLowerCase().includes(q) ||
      (CATEGORIES[t.category] && CATEGORIES[t.category].name.toLowerCase().includes(q))
    );
  }

  if (filters.minAmount !== undefined) {
    transactions = transactions.filter(t => t.amount >= filters.minAmount);
  }

  if (filters.maxAmount !== undefined) {
    transactions = transactions.filter(t => t.amount <= filters.maxAmount);
  }

  return transactions;
}

/**
 * Add a new transaction
 */
function addTransaction(data) {
  const transactions = getTransactions();
  const transaction = {
    id: generateId(),
    amount: parseFloat(data.amount) || 0,
    description: data.description || '',
    category: data.category || 'other',
    type: data.type || 'expense',
    date: data.date || new Date().toISOString().split('T')[0],
    note: data.note || '',
    createdAt: new Date().toISOString()
  };

  transactions.push(transaction);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  return transaction;
}

/**
 * Update an existing transaction
 */
function updateTransaction(id, data) {
  const transactions = getTransactions();
  const index = transactions.findIndex(t => t.id === id);
  if (index === -1) return null;

  transactions[index] = {
    ...transactions[index],
    ...data,
    amount: parseFloat(data.amount) || transactions[index].amount,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  return transactions[index];
}

/**
 * Delete a transaction
 */
function deleteTransaction(id) {
  let transactions = getTransactions();
  transactions = transactions.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

// ==================== STATISTICS ====================

/**
 * Get summary statistics for a period
 */
function getStats(period = 'month') {
  const range = getDateRange(period);
  const transactions = getTransactions({
    startDate: range.start.toISOString(),
    endDate: range.end.toISOString()
  });

  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');

  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

  // By category
  const byCategory = {};
  expenses.forEach(t => {
    if (!byCategory[t.category]) {
      byCategory[t.category] = { total: 0, count: 0, transactions: [] };
    }
    byCategory[t.category].total += t.amount;
    byCategory[t.category].count++;
    byCategory[t.category].transactions.push(t);
  });

  // By day
  const byDay = {};
  expenses.forEach(t => {
    const day = t.date.split('T')[0];
    if (!byDay[day]) byDay[day] = 0;
    byDay[day] += t.amount;
  });

  // Average daily expense
  const daysInPeriod = Math.max(1, Math.ceil((range.end - range.start) / 86400000));
  const avgDaily = totalExpense / daysInPeriod;

  return {
    totalExpense,
    totalIncome,
    balance: totalIncome - totalExpense,
    transactionCount: transactions.length,
    expenseCount: expenses.length,
    incomeCount: incomes.length,
    byCategory,
    byDay,
    avgDaily,
    transactions,
    expenses,
    incomes
  };
}

/**
 * Get spending trend (last N months)
 */
function getSpendingTrend(months = 6) {
  const trend = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    const transactions = getTransactions({
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });

    const expenses = transactions.filter(t => t.type === 'expense');
    const incomes = transactions.filter(t => t.type === 'income');

    trend.push({
      month: d.toLocaleDateString('vi-VN', { month: 'short' }),
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      expense: expenses.reduce((s, t) => s + t.amount, 0),
      income: incomes.reduce((s, t) => s + t.amount, 0)
    });
  }

  return trend;
}

// ==================== BUDGETS ====================

/**
 * Get budgets for a month
 */
function getBudgets(monthKey) {
  monthKey = monthKey || getCurrentMonthKey();
  const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
  const allBudgets = raw ? JSON.parse(raw) : {};
  return allBudgets[monthKey] || {};
}

/**
 * Set budget for a category in a month
 */
function setBudget(category, amount, monthKey) {
  monthKey = monthKey || getCurrentMonthKey();
  const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
  const allBudgets = raw ? JSON.parse(raw) : {};

  if (!allBudgets[monthKey]) {
    allBudgets[monthKey] = {};
  }

  if (amount <= 0) {
    delete allBudgets[monthKey][category];
  } else {
    allBudgets[monthKey][category] = amount;
  }

  localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(allBudgets));
}

/**
 * Get budget progress (spent vs budget) for current month
 */
function getBudgetProgress(monthKey) {
  monthKey = monthKey || getCurrentMonthKey();
  const budgets = getBudgets(monthKey);
  const stats = getStats('month');

  const progress = [];

  // Total budget
  if (budgets.total) {
    progress.push({
      category: 'total',
      name: 'Tổng ngân sách',
      icon: '💳',
      color: '#7c3aed',
      budget: budgets.total,
      spent: stats.totalExpense,
      percentage: Math.min(100, (stats.totalExpense / budgets.total) * 100)
    });
  }

  // Per-category budgets
  Object.keys(budgets).forEach(cat => {
    if (cat === 'total' || !CATEGORIES[cat]) return;
    const spent = stats.byCategory[cat] ? stats.byCategory[cat].total : 0;
    progress.push({
      category: cat,
      name: CATEGORIES[cat].name,
      icon: CATEGORIES[cat].icon,
      color: CATEGORIES[cat].color,
      budget: budgets[cat],
      spent,
      percentage: Math.min(100, (spent / budgets[cat]) * 100)
    });
  });

  return progress;
}

// ==================== SETTINGS ====================

function getSettings() {
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return raw ? JSON.parse(raw) : {
    apiKey: '',
    userName: '',
    currency: 'VND',
    theme: 'dark'
  };
}

function saveSettings(settings) {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  return updated;
}

// ==================== CHAT HISTORY ====================

function getChatHistory() {
  const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
  return raw ? JSON.parse(raw) : [];
}

function addChatMessage(role, content) {
  const history = getChatHistory();
  history.push({
    role,
    content,
    timestamp: new Date().toISOString()
  });
  // Keep last 50 messages
  if (history.length > 50) history.splice(0, history.length - 50);
  localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  return history;
}

function clearChatHistory() {
  localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
}

// ==================== EXPORT / IMPORT ====================

/**
 * Export all data as JSON
 */
function exportDataJSON() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    transactions: getTransactions(),
    budgets: JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS) || '{}'),
    settings: getSettings()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chi-tieu-${formatDate(new Date(), 'input')}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Đã xuất dữ liệu thành công!');
}

/**
 * Export transactions as CSV
 */
function exportDataCSV() {
  const transactions = getTransactions();
  const headers = ['Ngày', 'Mô tả', 'Danh mục', 'Loại', 'Số tiền'];
  const rows = transactions.map(t => [
    t.date,
    `"${t.description}"`,
    CATEGORIES[t.category] ? CATEGORIES[t.category].name : t.category,
    t.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
    t.amount
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  // BOM for Excel UTF-8 support
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chi-tieu-${formatDate(new Date(), 'input')}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Đã xuất CSV thành công!');
}

/**
 * Import data from JSON file
 */
function importDataJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (data.transactions && Array.isArray(data.transactions)) {
          // Merge with existing
          const existing = getTransactions();
          const existingIds = new Set(existing.map(t => t.id));
          const newTransactions = data.transactions.filter(t => !existingIds.has(t.id));
          const merged = [...existing, ...newTransactions];
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(merged));
        }

        if (data.budgets) {
          const existingBudgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS) || '{}');
          const mergedBudgets = { ...existingBudgets, ...data.budgets };
          localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(mergedBudgets));
        }

        showToast(`Đã nhập thành công!`);
        resolve(data);
      } catch (err) {
        showToast('Lỗi: File không hợp lệ', 'error');
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Clear all data
 */
function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  showToast('Đã xóa toàn bộ dữ liệu', 'warning');
}

// ==================== SEED DATA (Demo) ====================

function seedDemoData() {
  const existing = getTransactions();
  if (existing.length > 0) return; // Don't seed if data exists

  const now = new Date();
  const demoTransactions = [
    { description: 'Phở bò', category: 'food', type: 'expense', amount: 55000, daysAgo: 0 },
    { description: 'Grab đi làm', category: 'transport', type: 'expense', amount: 32000, daysAgo: 0 },
    { description: 'Cà phê sáng', category: 'food', type: 'expense', amount: 35000, daysAgo: 1 },
    { description: 'Tiền điện tháng 7', category: 'bills', type: 'expense', amount: 450000, daysAgo: 1 },
    { description: 'Mua áo mới', category: 'shopping', type: 'expense', amount: 350000, daysAgo: 2 },
    { description: 'Xem phim Deadpool', category: 'entertainment', type: 'expense', amount: 120000, daysAgo: 2 },
    { description: 'Thuốc cảm cúm', category: 'health', type: 'expense', amount: 85000, daysAgo: 3 },
    { description: 'Cơm trưa', category: 'food', type: 'expense', amount: 45000, daysAgo: 3 },
    { description: 'Lương tháng 7', category: 'income', type: 'income', amount: 15000000, daysAgo: 4 },
    { description: 'Xăng xe', category: 'transport', type: 'expense', amount: 150000, daysAgo: 4 },
    { description: 'Mua sách lập trình', category: 'education', type: 'expense', amount: 199000, daysAgo: 5 },
    { description: 'Ăn nhậu cuối tuần', category: 'food', type: 'expense', amount: 280000, daysAgo: 5 },
    { description: 'Tiền wifi', category: 'bills', type: 'expense', amount: 220000, daysAgo: 6 },
    { description: 'Mua giày thể thao', category: 'shopping', type: 'expense', amount: 890000, daysAgo: 7 },
    { description: 'Bún chả', category: 'food', type: 'expense', amount: 50000, daysAgo: 8 },
    { description: 'Grab về nhà', category: 'transport', type: 'expense', amount: 45000, daysAgo: 8 },
    { description: 'Khóa học online', category: 'education', type: 'expense', amount: 499000, daysAgo: 10 },
    { description: 'Karaoke với bạn', category: 'entertainment', type: 'expense', amount: 200000, daysAgo: 12 },
    { description: 'Khám bác sĩ', category: 'health', type: 'expense', amount: 300000, daysAgo: 14 },
    { description: 'Tiền thưởng dự án', category: 'income', type: 'income', amount: 5000000, daysAgo: 15 },
    { description: 'Cơm tối gia đình', category: 'food', type: 'expense', amount: 180000, daysAgo: 16 },
    { description: 'Tiền trọ tháng 6', category: 'bills', type: 'expense', amount: 3500000, daysAgo: 20 },
    { description: 'Gym tháng 6', category: 'health', type: 'expense', amount: 500000, daysAgo: 22 },
    { description: 'Netflix', category: 'entertainment', type: 'expense', amount: 180000, daysAgo: 25 },
    { description: 'Lương tháng 6', category: 'income', type: 'income', amount: 15000000, daysAgo: 30 },
  ];

  demoTransactions.forEach(t => {
    const date = new Date(now);
    date.setDate(date.getDate() - t.daysAgo);
    addTransaction({
      description: t.description,
      category: t.category,
      type: t.type,
      amount: t.amount,
      date: date.toISOString().split('T')[0]
    });
  });

  // Set demo budgets
  setBudget('total', 10000000);
  setBudget('food', 3000000);
  setBudget('transport', 1000000);
  setBudget('entertainment', 1000000);
  setBudget('shopping', 2000000);

  console.log('✅ Demo data seeded');
}
