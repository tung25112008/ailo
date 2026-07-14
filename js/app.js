/**
 * app.js - Main Application Logic
 * App Quản Lý Chi Tiêu Thông Minh
 */

// ==================== APP STATE ====================
const APP = {
  currentPage: 'dashboard',
  historyPage: 1,
  historyPerPage: 15,
  historyFilters: {},
  editingTransactionId: null
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  // Seed demo data on first visit
  seedDemoData();

  // Initialize navigation
  initNavigation();

  // Initialize all pages
  renderDashboard();
  initAddPage();
  initHistoryPage();
  initBudgetPage();
  initChatPage();
  initSettingsPage();

  // Navigate to dashboard
  navigateTo('dashboard');

  // Mobile nav
  initMobileNav();
});

// ==================== NAVIGATION ====================

function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.page);
      // Close mobile sidebar
      closeMobileSidebar();
    });
  });
}

function navigateTo(page) {
  APP.currentPage = page;

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update pages
  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });

  // Refresh page content
  switch (page) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'history':
      renderHistory();
      break;
    case 'budget':
      renderBudgetPage();
      break;
  }
}

// ==================== MOBILE NAV ====================

function initMobileNav() {
  const toggle = document.getElementById('mobile-nav-toggle');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggle) {
    toggle.addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }
}

function closeMobileSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('active');
}

// ==================== DASHBOARD ====================

function renderDashboard() {
  const stats = getStats('month');
  const today = new Date();

  // Update greeting
  const greetingEl = document.getElementById('dashboard-greeting');
  if (greetingEl) {
    const settings = getSettings();
    const name = settings.userName || '';
    greetingEl.textContent = `${getGreeting()}${name ? ', ' + name : ''} 👋`;
  }

  // Update date
  const dateEl = document.getElementById('dashboard-date');
  if (dateEl) {
    dateEl.textContent = formatDate(today, 'long');
  }

  // Update stat cards
  updateStatCard('stat-expense', stats.totalExpense);
  updateStatCard('stat-income', stats.totalIncome);
  updateStatCard('stat-balance', stats.balance);
  updateStatCard('stat-count', stats.expenseCount, false);

  // Render charts
  renderPieChart();
  renderBarChart();
  renderTrendChart();

  // Render recent transactions
  renderRecentTransactions(stats.transactions.slice(0, 6));

  // Render budget progress
  renderBudgetProgress('dashboard-budget-progress');
}

function updateStatCard(id, value, isCurrency = true) {
  const el = document.getElementById(id);
  if (el) {
    if (isCurrency) {
      animateValue(el, 0, value, 800);
    } else {
      el.textContent = value;
    }
  }
}

function renderRecentTransactions(transactions) {
  const container = document.getElementById('recent-transactions');
  if (!container) return;

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p>Chưa có giao dịch nào</p>
        <small>Bắt đầu thêm chi tiêu ngay!</small>
      </div>`;
    return;
  }

  container.innerHTML = transactions.map(t => createTransactionHTML(t, false)).join('');
}

function createTransactionHTML(t, showActions = true) {
  const cat = CATEGORIES[t.category] || CATEGORIES.other;
  const isExpense = t.type === 'expense';

  return `
    <div class="transaction-item" data-id="${t.id}" onclick="showTransactionDetail('${t.id}')">
      <div class="transaction-icon" style="background: ${cat.color}15">
        ${cat.icon}
      </div>
      <div class="transaction-info">
        <div class="transaction-desc">${t.description}</div>
        <div class="transaction-meta">
          <span>${cat.name}</span>
          <span>•</span>
          <span>${timeAgo(t.date)}</span>
        </div>
      </div>
      <div class="transaction-amount ${t.type}">
        ${isExpense ? '-' : '+'}${formatCurrency(t.amount)}
      </div>
      ${showActions ? `
        <div class="transaction-actions">
          <button class="transaction-action-btn" onclick="event.stopPropagation(); editTransaction('${t.id}')" title="Sửa">✏️</button>
          <button class="transaction-action-btn delete" onclick="event.stopPropagation(); confirmDeleteTransaction('${t.id}')" title="Xóa">🗑️</button>
        </div>
      ` : ''}
    </div>`;
}

// ==================== ADD TRANSACTION PAGE ====================

function initAddPage() {
  // AI Input handler
  const aiInput = document.getElementById('ai-input');
  if (aiInput) {
    aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && aiInput.value.trim()) {
        handleAIInput(aiInput.value.trim());
      }
    });
  }

  // Type toggle
  document.querySelectorAll('.type-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.type-toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide category grid based on type
      const catGrid = document.getElementById('category-grid');
      if (btn.dataset.type === 'income') {
        catGrid.style.display = 'none';
      } else {
        catGrid.style.display = '';
      }
    });
  });

  // Category selection
  document.querySelectorAll('.category-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.category-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // Default select first category
  const firstCat = document.querySelector('.category-option');
  if (firstCat) firstCat.classList.add('selected');

  // Form submit
  const form = document.getElementById('add-form');
  if (form) {
    form.addEventListener('submit', handleAddFormSubmit);
  }

  // Set default date to today
  const dateInput = document.getElementById('add-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

async function handleAIInput(text) {
  const preview = document.getElementById('ai-preview');
  const previewContent = document.getElementById('ai-preview-content');

  // Show loading
  preview.classList.add('show');
  previewContent.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> Đang phân tích...';

  try {
    const parsed = await aiParseTransaction(text);

    if (parsed && parsed.amount > 0) {
      const cat = CATEGORIES[parsed.category] || CATEGORIES.other;

      previewContent.innerHTML = `
        <div class="ai-preview-content">
          <div class="ai-preview-item">
            <span class="ai-preview-item-label">Số tiền</span>
            <span class="ai-preview-item-value">${formatCurrency(parsed.amount)}</span>
          </div>
          <div class="ai-preview-item">
            <span class="ai-preview-item-label">Mô tả</span>
            <span class="ai-preview-item-value">${parsed.description}</span>
          </div>
          <div class="ai-preview-item">
            <span class="ai-preview-item-label">Danh mục</span>
            <span class="ai-preview-item-value">${cat.icon} ${cat.name}</span>
          </div>
          <div class="ai-preview-item">
            <span class="ai-preview-item-label">Loại</span>
            <span class="ai-preview-item-value">${parsed.type === 'income' ? '💰 Thu nhập' : '💸 Chi tiêu'}</span>
          </div>
        </div>
        <div class="ai-preview-actions">
          <button class="btn btn-success btn-sm" onclick="quickAddFromAI()">✓ Thêm ngay</button>
          <button class="btn btn-ghost btn-sm" onclick="fillFormFromAI()">✏️ Chỉnh sửa</button>
          <button class="btn btn-ghost btn-sm" onclick="dismissAIPreview()">✕ Hủy</button>
        </div>`;

      // Store parsed data for quick add
      preview.dataset.parsed = JSON.stringify(parsed);
    } else {
      previewContent.innerHTML = `
        <p style="color: var(--text-secondary)">⚠️ Không nhận diện được số tiền. Vui lòng thử lại, ví dụ: "ăn phở 50k"</p>
        <button class="btn btn-ghost btn-sm" onclick="dismissAIPreview()" style="margin-top:8px">Đóng</button>`;
    }
  } catch (err) {
    previewContent.innerHTML = `<p style="color: var(--color-red)">❌ Lỗi: ${err.message}</p>`;
  }
}

function quickAddFromAI() {
  const preview = document.getElementById('ai-preview');
  const parsed = JSON.parse(preview.dataset.parsed || '{}');

  if (parsed.amount) {
    addTransaction(parsed);
    showToast(`Đã thêm: ${parsed.description} - ${formatCurrency(parsed.amount)}`);
    dismissAIPreview();
    document.getElementById('ai-input').value = '';

    // Refresh data
    if (APP.currentPage === 'dashboard') renderDashboard();
    renderHistory();
  }
}

function fillFormFromAI() {
  const preview = document.getElementById('ai-preview');
  const parsed = JSON.parse(preview.dataset.parsed || '{}');

  if (parsed) {
    // Fill form fields
    const amountInput = document.getElementById('add-amount');
    const descInput = document.getElementById('add-description');
    const dateInput = document.getElementById('add-date');

    if (amountInput) amountInput.value = parsed.amount;
    if (descInput) descInput.value = parsed.description;
    if (dateInput) dateInput.value = parsed.date || new Date().toISOString().split('T')[0];

    // Set type
    document.querySelectorAll('.type-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === parsed.type);
    });

    // Set category
    document.querySelectorAll('.category-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.category === parsed.category);
    });

    dismissAIPreview();
  }
}

function dismissAIPreview() {
  const preview = document.getElementById('ai-preview');
  preview.classList.remove('show');
  preview.dataset.parsed = '';
}

function handleAddFormSubmit(e) {
  e.preventDefault();

  const amount = parseFloat(document.getElementById('add-amount').value);
  const description = document.getElementById('add-description').value.trim();
  const date = document.getElementById('add-date').value;
  const note = document.getElementById('add-note')?.value?.trim() || '';

  if (!amount || amount <= 0) {
    showToast('Vui lòng nhập số tiền hợp lệ', 'error');
    return;
  }

  if (!description) {
    showToast('Vui lòng nhập mô tả', 'error');
    return;
  }

  const type = document.querySelector('.type-toggle-btn.active')?.dataset.type || 'expense';
  const selectedCat = document.querySelector('.category-option.selected');
  const category = type === 'income' ? 'income' : (selectedCat?.dataset.category || 'other');

  // Check if editing
  if (APP.editingTransactionId) {
    updateTransaction(APP.editingTransactionId, { amount, description, date, note, type, category });
    showToast('Đã cập nhật giao dịch!');
    APP.editingTransactionId = null;
    document.getElementById('add-form-title').textContent = 'Nhập thông tin';
    document.getElementById('add-submit-btn').innerHTML = '💾 Lưu giao dịch';
  } else {
    addTransaction({ amount, description, category, type, date, note });
    showToast(`Đã thêm: ${description} - ${formatCurrency(amount)}`);
  }

  // Reset form
  e.target.reset();
  document.getElementById('add-date').value = new Date().toISOString().split('T')[0];
  document.querySelectorAll('.type-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === 'expense');
  });
  const catGrid = document.getElementById('category-grid');
  if (catGrid) catGrid.style.display = '';
  document.querySelectorAll('.category-option').forEach((o, i) => {
    o.classList.toggle('selected', i === 0);
  });

  // Refresh
  renderDashboard();
  renderHistory();
}

// ==================== HISTORY PAGE ====================

function initHistoryPage() {
  // Period filter tabs
  document.querySelectorAll('#history-period-tabs .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#history-period-tabs .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      APP.historyFilters.period = tab.dataset.period;
      APP.historyPage = 1;
      applyHistoryFilters();
    });
  });

  // Search
  const searchInput = document.getElementById('history-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      APP.historyFilters.search = searchInput.value;
      APP.historyPage = 1;
      renderHistory();
    }, 300));
  }

  // Category filter
  const catFilter = document.getElementById('history-category-filter');
  if (catFilter) {
    catFilter.addEventListener('change', () => {
      APP.historyFilters.category = catFilter.value || undefined;
      APP.historyPage = 1;
      renderHistory();
    });
  }

  // Type filter
  const typeFilter = document.getElementById('history-type-filter');
  if (typeFilter) {
    typeFilter.addEventListener('change', () => {
      APP.historyFilters.type = typeFilter.value || undefined;
      APP.historyPage = 1;
      renderHistory();
    });
  }

  renderHistory();
}

function applyHistoryFilters() {
  const period = APP.historyFilters.period || 'all';
  if (period !== 'all') {
    const range = getDateRange(period);
    APP.historyFilters.startDate = range.start.toISOString();
    APP.historyFilters.endDate = range.end.toISOString();
  } else {
    delete APP.historyFilters.startDate;
    delete APP.historyFilters.endDate;
  }
  renderHistory();
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  const allTransactions = getTransactions(APP.historyFilters);
  const totalPages = Math.ceil(allTransactions.length / APP.historyPerPage);
  const start = (APP.historyPage - 1) * APP.historyPerPage;
  const pageTransactions = allTransactions.slice(start, start + APP.historyPerPage);

  // Summary
  const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  const summaryEl = document.getElementById('history-summary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <span>📊 ${allTransactions.length} giao dịch</span>
      <span>💸 Chi: <strong style="color:var(--color-red)">${formatCurrency(totalExpense)}</strong></span>
      <span>💰 Thu: <strong style="color:var(--color-green)">${formatCurrency(totalIncome)}</strong></span>
    `;
  }

  // Transaction list
  if (pageTransactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>Không tìm thấy giao dịch</p>
        <small>Thử thay đổi bộ lọc</small>
      </div>`;
  } else {
    container.innerHTML = pageTransactions.map(t => createTransactionHTML(t, true)).join('');
  }

  // Pagination
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById('history-pagination');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = `
    <button class="pagination-btn" onclick="goToHistoryPage(${APP.historyPage - 1})" ${APP.historyPage <= 1 ? 'disabled' : ''}>‹</button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - APP.historyPage) <= 1) {
      html += `<button class="pagination-btn ${i === APP.historyPage ? 'active' : ''}" onclick="goToHistoryPage(${i})">${i}</button>`;
    } else if (Math.abs(i - APP.historyPage) === 2) {
      html += `<span class="pagination-info">...</span>`;
    }
  }

  html += `
    <button class="pagination-btn" onclick="goToHistoryPage(${APP.historyPage + 1})" ${APP.historyPage >= totalPages ? 'disabled' : ''}>›</button>
  `;

  container.innerHTML = html;
}

function goToHistoryPage(page) {
  APP.historyPage = page;
  renderHistory();
}

// ==================== TRANSACTION DETAIL/EDIT/DELETE ====================

function showTransactionDetail(id) {
  const transactions = getTransactions();
  const t = transactions.find(tr => tr.id === id);
  if (!t) return;

  const cat = CATEGORIES[t.category] || CATEGORIES.other;
  const modalBody = document.querySelector('#modal-detail .modal-body');

  modalBody.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="font-size:48px; margin-bottom:8px;">${cat.icon}</div>
      <div style="font-size:28px; font-weight:800; color:${t.type === 'expense' ? 'var(--color-red)' : 'var(--color-green)'}">
        ${t.type === 'expense' ? '-' : '+'}${formatCurrency(t.amount)}
      </div>
    </div>
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Mô tả</div>
          <div class="settings-item-desc" style="color:var(--text-primary)">${t.description}</div>
        </div>
      </div>
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Danh mục</div>
          <div class="settings-item-desc" style="color:var(--text-primary)">${cat.icon} ${cat.name}</div>
        </div>
      </div>
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Ngày</div>
          <div class="settings-item-desc" style="color:var(--text-primary)">${formatDate(t.date, 'long')}</div>
        </div>
      </div>
      ${t.note ? `
      <div class="settings-item">
        <div class="settings-item-info">
          <div class="settings-item-label">Ghi chú</div>
          <div class="settings-item-desc" style="color:var(--text-primary)">${t.note}</div>
        </div>
      </div>` : ''}
    </div>
    <div style="display:flex; gap:8px; margin-top:20px; justify-content:center;">
      <button class="btn btn-ghost" onclick="editTransaction('${t.id}'); closeModal('modal-detail');">✏️ Sửa</button>
      <button class="btn btn-danger" onclick="confirmDeleteTransaction('${t.id}'); closeModal('modal-detail');">🗑️ Xóa</button>
    </div>
  `;

  openModal('modal-detail');
}

function editTransaction(id) {
  const transactions = getTransactions();
  const t = transactions.find(tr => tr.id === id);
  if (!t) return;

  APP.editingTransactionId = id;

  // Navigate to add page
  navigateTo('add');

  // Fill form
  setTimeout(() => {
    document.getElementById('add-amount').value = t.amount;
    document.getElementById('add-description').value = t.description;
    document.getElementById('add-date').value = t.date;
    const noteEl = document.getElementById('add-note');
    if (noteEl) noteEl.value = t.note || '';

    // Set type
    document.querySelectorAll('.type-toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === t.type);
    });

    // Category grid visibility
    const catGrid = document.getElementById('category-grid');
    if (t.type === 'income') {
      catGrid.style.display = 'none';
    } else {
      catGrid.style.display = '';
    }

    // Set category
    document.querySelectorAll('.category-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.category === t.category);
    });

    // Update title and button
    document.getElementById('add-form-title').textContent = 'Chỉnh sửa giao dịch';
    document.getElementById('add-submit-btn').innerHTML = '✏️ Cập nhật';
  }, 100);
}

function confirmDeleteTransaction(id) {
  const transactions = getTransactions();
  const t = transactions.find(tr => tr.id === id);
  if (!t) return;

  if (confirm(`Xóa giao dịch "${t.description}" - ${formatCurrency(t.amount)}?`)) {
    deleteTransaction(id);
    showToast('Đã xóa giao dịch');
    renderDashboard();
    renderHistory();
  }
}

// ==================== BUDGET PAGE ====================

function initBudgetPage() {
  const form = document.getElementById('budget-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveBudgets();
    });
  }
}

function renderBudgetPage() {
  const budgets = getBudgets();

  // Fill form values
  const totalInput = document.getElementById('budget-total');
  if (totalInput) totalInput.value = budgets.total || '';

  EXPENSE_CATEGORIES.forEach(cat => {
    const input = document.getElementById(`budget-${cat}`);
    if (input) input.value = budgets[cat] || '';
  });

  // Render progress
  renderBudgetProgress('budget-progress-section');
}

function saveBudgets() {
  const totalInput = document.getElementById('budget-total');
  if (totalInput) {
    const val = parseFloat(totalInput.value) || 0;
    setBudget('total', val);
  }

  EXPENSE_CATEGORIES.forEach(cat => {
    const input = document.getElementById(`budget-${cat}`);
    if (input) {
      const val = parseFloat(input.value) || 0;
      setBudget(cat, val);
    }
  });

  showToast('Đã lưu ngân sách!');
  renderBudgetProgress('budget-progress-section');
  renderDashboard();
}

// ==================== CHAT PAGE ====================

function initChatPage() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  if (input && sendBtn) {
    sendBtn.addEventListener('click', () => sendChatMessage());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // Suggestion chips
  document.querySelectorAll('.chat-suggestion').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      input.value = chip.textContent;
      sendChatMessage();
    });
  });

  // Load chat history
  renderChatHistory();
}

function renderChatHistory() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const history = getChatHistory();

  if (history.length === 0) {
    // Show welcome message
    container.innerHTML = `
      <div class="chat-message ai">
        <div class="chat-avatar">🤖</div>
        <div>
          <div class="chat-bubble">
            Xin chào! 👋 Mình là <strong>SpendAI</strong> - trợ lý tài chính thông minh của bạn.<br><br>
            Bạn có thể hỏi mình về:<br>
            • Tổng chi tiêu tháng này<br>
            • Danh mục chi nhiều nhất<br>
            • Gợi ý tiết kiệm<br>
            • Phân tích thói quen chi tiêu<br><br>
            💡 <em>Thêm Gemini API key trong Cài đặt để mình thông minh hơn!</em>
          </div>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = history.map(msg => `
    <div class="chat-message ${msg.role}">
      <div class="chat-avatar">${msg.role === 'ai' ? '🤖' : '👤'}</div>
      <div>
        <div class="chat-bubble">${formatChatMessage(msg.content)}</div>
        <div class="chat-time">${timeAgo(msg.timestamp)}</div>
      </div>
    </div>
  `).join('');

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function formatChatMessage(text) {
  // Convert markdown-style formatting to HTML
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  // Clear input
  input.value = '';

  // Add user message
  addChatMessage('user', message);
  renderChatHistory();

  // Show loading
  const container = document.getElementById('chat-messages');
  const loadingEl = document.createElement('div');
  loadingEl.className = 'chat-message ai';
  loadingEl.id = 'chat-loading';
  loadingEl.innerHTML = `
    <div class="chat-avatar">🤖</div>
    <div>
      <div class="chat-bubble">
        <div class="loading-dots"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  container.appendChild(loadingEl);
  container.scrollTop = container.scrollHeight;

  // Disable send button
  const sendBtn = document.getElementById('chat-send-btn');
  sendBtn.disabled = true;

  try {
    // Check if user wants analysis
    const lower = message.toLowerCase();
    let response;

    if (lower.includes('phân tích') || lower.includes('nhận xét') || lower.includes('đánh giá')) {
      response = await aiAnalyzeSpending();
    } else {
      response = await aiChat(message);
    }

    // Remove loading
    document.getElementById('chat-loading')?.remove();

    // Add AI response
    addChatMessage('ai', response);
    renderChatHistory();
  } catch (err) {
    document.getElementById('chat-loading')?.remove();
    addChatMessage('ai', `❌ Lỗi: ${err.message}. Vui lòng thử lại.`);
    renderChatHistory();
  }

  sendBtn.disabled = false;
}

function clearChat() {
  if (confirm('Xóa toàn bộ lịch sử chat?')) {
    clearChatHistory();
    renderChatHistory();
    showToast('Đã xóa lịch sử chat');
  }
}

// ==================== SETTINGS PAGE ====================

function initSettingsPage() {
  const settings = getSettings();

  // API Key
  const apiKeyInput = document.getElementById('settings-api-key');
  if (apiKeyInput) {
    apiKeyInput.value = settings.apiKey || '';
    
    // Toggle visibility
    const toggleBtn = document.getElementById('btn-toggle-apikey');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
          apiKeyInput.type = 'text';
          toggleBtn.textContent = '🙈';
        } else {
          apiKeyInput.type = 'password';
          toggleBtn.textContent = '👁️';
        }
      });
    }

    // Save button
    const saveKeyBtn = document.getElementById('btn-save-apikey');
    if (saveKeyBtn) {
      saveKeyBtn.addEventListener('click', () => {
        saveSettings({ apiKey: apiKeyInput.value.trim() });
        showToast('Đã lưu API Key');
      });
    }
  }

  // User name
  const nameInput = document.getElementById('settings-name');
  if (nameInput) {
    nameInput.value = settings.userName || '';
    
    // Save button
    const saveNameBtn = document.getElementById('btn-save-name');
    if (saveNameBtn) {
      saveNameBtn.addEventListener('click', () => {
        saveSettings({ userName: nameInput.value.trim() });
        showToast('Đã lưu tên');
        // Update greeting on dashboard immediately
        document.getElementById('dashboard-greeting').textContent = getGreeting();
      });
    }
  }

  // Export buttons
  document.getElementById('btn-export-json')?.addEventListener('click', exportDataJSON);
  document.getElementById('btn-export-csv')?.addEventListener('click', exportDataCSV);

  // Import
  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });

  document.getElementById('import-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await importDataJSON(file);
      renderDashboard();
      renderHistory();
      e.target.value = '';
    }
  });

  // Clear data
  document.getElementById('btn-clear-data')?.addEventListener('click', () => {
    if (confirm('⚠️ Bạn có chắc muốn xóa TOÀN BỘ dữ liệu? Hành động này không thể hoàn tác!')) {
      clearAllData();
      location.reload();
    }
  });

  // Reset demo
  document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
    if (confirm('Xóa dữ liệu hiện tại và thêm dữ liệu mẫu?')) {
      clearAllData();
      seedDemoData();
      renderDashboard();
      renderHistory();
      showToast('Đã tải lại dữ liệu mẫu');
    }
  });
}
