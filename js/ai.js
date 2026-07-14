/**
 * ai.js - AI Integration (Gemini API + Rule-based fallback)
 * App Quản Lý Chi Tiêu Thông Minh
 */

// ==================== KEYWORD MAPPINGS ====================

const CATEGORY_KEYWORDS = {
  food: ['ăn', 'uống', 'phở', 'bún', 'cơm', 'café', 'coffee', 'cà phê', 'trà', 'bia', 'nhậu',
    'bánh', 'cháo', 'mì', 'lẩu', 'nước', 'sữa', 'pizza', 'burger', 'gà', 'bò', 'heo',
    'tôm', 'cá', 'rau', 'trái cây', 'hoa quả', 'kem', 'chè', 'nấu', 'bếp', 'quán',
    'nhà hàng', 'buffet', 'gỏi', 'nem', 'chả', 'bún bò', 'bún chả', 'trà sữa', 'sinh tố',
    'thịt', 'snack', 'đồ ăn', 'delivery', 'grab food', 'shopee food', 'gofood', 'baemin'],
  transport: ['grab', 'taxi', 'xe', 'xăng', 'gửi xe', 'đi lại', 'uber', 'bus', 'xe buýt',
    'vé', 'máy bay', 'tàu', 'xe ôm', 'be', 'gojek', 'di chuyển', 'đỗ xe', 'phí đường',
    'toll', 'bến xe', 'sân bay', 'metro', 'đi làm', 'đi về', 'ship', 'giao hàng'],
  shopping: ['mua', 'quần', 'áo', 'giày', 'dép', 'túi', 'đồ', 'shop', 'siêu thị',
    'lazada', 'shopee', 'tiki', 'amazon', 'online', 'thời trang', 'phụ kiện', 'đồng hồ',
    'nước hoa', 'mỹ phẩm', 'trang sức', 'kính', 'nón', 'mũ', 'váy', 'vest'],
  entertainment: ['phim', 'game', 'nhạc', 'karaoke', 'chơi', 'du lịch', 'netflix', 'spotify',
    'youtube', 'giải trí', 'công viên', 'rạp', 'concert', 'show', 'billiard', 'bowling',
    'bar', 'club', 'vũ trường', 'hát', 'đàn', 'nhảy', 'picnic'],
  bills: ['điện', 'nước', 'wifi', 'internet', 'điện thoại', 'thuê', 'trọ', 'phí',
    'bảo hiểm', 'thuế', 'phí dịch vụ', 'quản lý', 'tiền nhà', 'tiền phòng',
    'gas', 'truyền hình', 'cáp', 'hóa đơn', 'phí gửi', 'ngân hàng', 'lãi'],
  health: ['thuốc', 'bệnh viện', 'khám', 'bác sĩ', 'gym', 'tập', 'y tế',
    'phòng khám', 'nha khoa', 'răng', 'mắt', 'vitamin', 'thực phẩm chức năng',
    'tập gym', 'yoga', 'spa', 'massage', 'sức khỏe', 'xét nghiệm'],
  education: ['học', 'sách', 'khóa', 'course', 'trường', 'học phí', 'thư viện',
    'udemy', 'coursera', 'ielts', 'toeic', 'luyện thi', 'gia sư', 'lớp học',
    'đào tạo', 'chứng chỉ', 'bằng', 'nghiên cứu', 'tài liệu'],
  income: ['lương', 'thu nhập', 'thưởng', 'tiền thưởng', 'bán', 'freelance',
    'bonus', 'cổ tức', 'đầu tư', 'lãi suất', 'hoàn tiền', 'trả lại',
    'nhận', 'được trả', 'salary', 'revenue']
};

const AMOUNT_PATTERNS = [
  { regex: /(\d+(?:[.,]\d+)?)\s*tr(?:iệu)?/i, multiplier: 1000000 },
  { regex: /(\d+(?:[.,]\d+)?)\s*k\b/i, multiplier: 1000 },
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:nghìn|ngàn|ngan|nghin)/i, multiplier: 1000 },
  { regex: /(\d+(?:[.,]\d{3})+)(?!\d)/, multiplier: 1 },  // 50.000 or 50,000
  { regex: /(\d{4,})/, multiplier: 1 },  // 50000 (4+ digits = exact amount)
  { regex: /(\d+)/, multiplier: 1000 }    // small number assumed as thousands
];

// ==================== NATURAL LANGUAGE PARSER ====================

/**
 * Parse Vietnamese natural language input into transaction data
 * Examples: "ăn phở 50k", "grab đi làm 25 nghìn", "lương tháng 7 15tr"
 */
function parseNaturalInput(text) {
  if (!text || !text.trim()) return null;

  text = text.trim();
  const lowerText = text.toLowerCase();

  // 1. Extract amount
  let amount = 0;
  let amountMatch = null;

  for (const pattern of AMOUNT_PATTERNS) {
    const match = lowerText.match(pattern.regex);
    if (match) {
      amountMatch = match;
      let numStr = match[1].replace(/[.,]/g, '');
      // Handle decimal for triệu (e.g., 1.5tr = 1500000)
      if (pattern.multiplier === 1000000 && match[1].includes('.')) {
        numStr = match[1].replace(',', '.');
        amount = parseFloat(numStr) * pattern.multiplier;
      } else if (pattern.multiplier === 1 && /[.,]/.test(match[1])) {
        // Format like 50.000 → 50000
        amount = parseInt(numStr);
      } else {
        amount = parseInt(numStr) * pattern.multiplier;
      }
      break;
    }
  }

  // 2. Extract description (remove amount part)
  let description = text;
  if (amountMatch) {
    description = text.replace(amountMatch[0], '').trim();
  }
  // Clean up common filler words
  description = description
    .replace(/^(đã|vừa|mới|hôm nay|hôm qua|sáng nay|chiều nay|tối nay)\s+/i, '')
    .replace(/\s+(đồng|vnđ|vnd|đ)$/i, '')
    .trim();

  // Capitalize first letter
  if (description) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  // 3. Detect type (income or expense)
  let type = 'expense';
  const incomeKeywords = CATEGORY_KEYWORDS.income;
  if (incomeKeywords.some(kw => lowerText.includes(kw))) {
    type = 'income';
  }

  // 4. Categorize
  const category = type === 'income' ? 'income' : categorizeByKeywords(lowerText);

  return {
    amount: Math.round(amount),
    description: description || text,
    category,
    type,
    date: new Date().toISOString().split('T')[0],
    confidence: amount > 0 ? 'high' : 'low'
  };
}

/**
 * Categorize description by keyword matching
 */
function categorizeByKeywords(text) {
  const lowerText = text.toLowerCase();
  let bestCategory = 'other';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'income') continue;

    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        // Longer keywords get higher score
        score += keyword.length;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

// ==================== GEMINI API INTEGRATION ====================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Call Gemini API
 */
async function callGeminiAPI(prompt, apiKey) {
  if (!apiKey) throw new Error('Chưa cấu hình API key');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * AI-powered transaction parsing via Gemini
 */
async function aiParseTransaction(text) {
  const settings = getSettings();
  if (!settings.apiKey) {
    return parseNaturalInput(text); // Fallback to rule-based
  }

  const prompt = `Bạn là trợ lý phân tích chi tiêu. Phân tích câu sau và trả về JSON:
"${text}"

Trả về CHÍNH XÁC JSON format (không markdown, không giải thích):
{"amount": <số tiền VNĐ>, "description": "<mô tả ngắn>", "category": "<danh mục>", "type": "<expense hoặc income>"}

Danh mục hợp lệ: food, transport, shopping, entertainment, bills, health, education, income, other
- "k" = nghìn (50k = 50000)
- "tr" = triệu (1tr = 1000000)
- Nếu không rõ số tiền, đặt amount = 0`;

  try {
    const result = await callGeminiAPI(prompt, settings.apiKey);
    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        amount: Math.round(parsed.amount || 0),
        description: parsed.description || text,
        category: parsed.category || 'other',
        type: parsed.type || 'expense',
        date: new Date().toISOString().split('T')[0],
        confidence: 'ai'
      };
    }
  } catch (err) {
    console.warn('AI parsing failed, using fallback:', err);
  }

  return parseNaturalInput(text);
}

/**
 * AI spending analysis
 */
async function aiAnalyzeSpending() {
  const settings = getSettings();
  const stats = getStats('month');
  const trend = getSpendingTrend(3);

  // Build context
  const categoryBreakdown = Object.entries(stats.byCategory)
    .map(([cat, data]) => `${CATEGORIES[cat]?.name || cat}: ${formatCurrency(data.total)} (${data.count} giao dịch)`)
    .join('\n');

  const trendText = trend
    .map(t => `${t.month}: Chi ${formatCurrency(t.expense)}, Thu ${formatCurrency(t.income)}`)
    .join('\n');

  const context = `
Tổng chi tháng này: ${formatCurrency(stats.totalExpense)}
Tổng thu tháng này: ${formatCurrency(stats.totalIncome)}
Số dư: ${formatCurrency(stats.balance)}
Chi tiêu trung bình/ngày: ${formatCurrency(stats.avgDaily)}

Chi tiết theo danh mục:
${categoryBreakdown}

Xu hướng 3 tháng gần nhất:
${trendText}
`;

  if (!settings.apiKey) {
    // Rule-based analysis
    return generateRuleBasedAnalysis(stats, trend);
  }

  const prompt = `Bạn là chuyên gia tài chính cá nhân Việt Nam. Phân tích chi tiêu sau và đưa ra nhận xét, lời khuyên bằng tiếng Việt. Trả lời ngắn gọn, thân thiện, dùng emoji:

${context}

Hãy đưa ra:
1. Nhận xét tổng quan (1-2 câu)
2. Điểm cần chú ý (max 3 điểm)
3. Gợi ý tiết kiệm (max 2 gợi ý)`;

  try {
    return await callGeminiAPI(prompt, settings.apiKey);
  } catch (err) {
    console.warn('AI analysis failed:', err);
    return generateRuleBasedAnalysis(stats, trend);
  }
}

/**
 * Rule-based spending analysis (fallback)
 */
function generateRuleBasedAnalysis(stats, trend) {
  const lines = [];

  // Overview
  if (stats.totalExpense === 0) {
    return '📊 Chưa có dữ liệu chi tiêu tháng này. Hãy thêm giao dịch để xem phân tích!';
  }

  lines.push(`📊 **Tổng quan tháng này:**`);
  lines.push(`Bạn đã chi ${formatCurrency(stats.totalExpense)} cho ${stats.expenseCount} giao dịch.`);

  if (stats.totalIncome > 0) {
    const saveRate = ((stats.totalIncome - stats.totalExpense) / stats.totalIncome * 100).toFixed(0);
    if (saveRate > 0) {
      lines.push(`💰 Tỷ lệ tiết kiệm: ${saveRate}% - ${saveRate >= 20 ? 'Tốt lắm! 🎉' : 'Cần cố gắng thêm 💪'}`);
    } else {
      lines.push(`⚠️ Chi tiêu đã vượt thu nhập ${formatCurrency(Math.abs(stats.balance))}!`);
    }
  }

  // Top spending categories
  const sortedCats = Object.entries(stats.byCategory)
    .sort((a, b) => b[1].total - a[1].total);

  if (sortedCats.length > 0) {
    lines.push('');
    lines.push('🔍 **Danh mục chi nhiều nhất:**');
    sortedCats.slice(0, 3).forEach(([cat, data], i) => {
      const pct = ((data.total / stats.totalExpense) * 100).toFixed(0);
      lines.push(`${i + 1}. ${CATEGORIES[cat]?.icon || '📦'} ${CATEGORIES[cat]?.name || cat}: ${formatCurrency(data.total)} (${pct}%)`);
    });
  }

  // Suggestions
  lines.push('');
  lines.push('💡 **Gợi ý:**');

  if (stats.avgDaily > 0) {
    const daysLeft = getDaysInMonth(new Date().getFullYear(), new Date().getMonth()) - new Date().getDate();
    const projected = stats.totalExpense + (stats.avgDaily * daysLeft);
    lines.push(`- Dự kiến chi tiêu cuối tháng: ~${formatCurrency(projected)}`);
  }

  if (sortedCats.length > 0) {
    const topCat = sortedCats[0];
    const topPct = ((topCat[1].total / stats.totalExpense) * 100).toFixed(0);
    if (topPct > 40) {
      lines.push(`- ${CATEGORIES[topCat[0]]?.icon} ${CATEGORIES[topCat[0]]?.name} chiếm ${topPct}% chi tiêu. Cân nhắc giảm bớt nhé!`);
    }
  }

  // Trend comparison
  if (trend.length >= 2) {
    const lastMonth = trend[trend.length - 2];
    const thisMonth = trend[trend.length - 1];
    if (lastMonth.expense > 0) {
      const change = ((thisMonth.expense - lastMonth.expense) / lastMonth.expense * 100).toFixed(0);
      if (change > 10) {
        lines.push(`- 📈 Chi tiêu tăng ${change}% so với tháng trước`);
      } else if (change < -10) {
        lines.push(`- 📉 Chi tiêu giảm ${Math.abs(change)}% so với tháng trước. Tuyệt vời! 🎉`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * AI Chat - Respond to user questions about finances
 */
async function aiChat(message) {
  const settings = getSettings();
  const stats = getStats('month');
  const history = getChatHistory();

  // Build spending context
  const context = `
THÔNG TIN CHI TIÊU CỦA NGƯỜI DÙNG:
- Tổng chi tháng này: ${formatCurrency(stats.totalExpense)}
- Tổng thu tháng này: ${formatCurrency(stats.totalIncome)}
- Danh mục: ${Object.entries(stats.byCategory).map(([c, d]) => `${CATEGORIES[c]?.name}: ${formatCurrency(d.total)}`).join(', ')}
- 5 giao dịch gần nhất: ${stats.transactions.slice(0, 5).map(t => `${t.description} ${formatCurrency(t.amount)}`).join(', ')}
`;

  // Build history text to give AI memory
  const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'Người dùng' : 'SpendAI'}: ${m.content}`).join('\n');

  if (!settings.apiKey) {
    return answerWithRules(message, stats);
  }

  const prompt = `Bạn là AI "SpendAI". Hãy trả lời tự nhiên, thân thiện và đi THẲNG VÀO CÂU HỎI của người dùng. KHÔNG trả lời vòng vo.

Nguyên tắc:
1. Nếu câu hỏi về chi tiêu, dùng dữ liệu dưới đây để trả lời.
2. Nếu câu hỏi về chủ đề khác (trò chuyện bình thường, code, v.v.), cứ trả lời nhiệt tình, đừng từ chối.
3. Đọc kỹ lịch sử chat để hiểu ngữ cảnh (ví dụ nếu người dùng hỏi "tại sao?", hãy xem câu trước đó).

${context}

LỊCH SỬ CHAT GẦN ĐÂY:
${historyText}

Người dùng hỏi: ${message}
Trả lời:`;

  try {
    return await callGeminiAPI(prompt, settings.apiKey);
  } catch (err) {
    console.warn('AI chat failed:', err);
    return answerWithRules(message, stats);
  }
}

/**
 * Rule-based chat responses (fallback)
 */
function answerWithRules(message, stats) {
  const lower = message.toLowerCase();

  if (lower.includes('tổng') || lower.includes('bao nhiêu') || lower.includes('chi tiêu')) {
    if (lower.includes('ăn') || lower.includes('food')) {
      const foodTotal = stats.byCategory.food?.total || 0;
      return `🍜 Tháng này bạn chi ${formatCurrency(foodTotal)} cho ăn uống (${stats.byCategory.food?.count || 0} lần).`;
    }
    if (lower.includes('di chuyển') || lower.includes('xe') || lower.includes('grab')) {
      const transportTotal = stats.byCategory.transport?.total || 0;
      return `🚗 Tháng này bạn chi ${formatCurrency(transportTotal)} cho di chuyển.`;
    }
    return `📊 Tổng chi tiêu tháng này: ${formatCurrency(stats.totalExpense)} (${stats.expenseCount} giao dịch).\nThu nhập: ${formatCurrency(stats.totalIncome)}.\nSố dư: ${formatCurrency(stats.balance)}.`;
  }

  if (lower.includes('tiết kiệm') || lower.includes('save')) {
    if (stats.totalIncome > 0) {
      const saveRate = ((stats.totalIncome - stats.totalExpense) / stats.totalIncome * 100).toFixed(0);
      return `💰 Tỷ lệ tiết kiệm tháng này: ${saveRate}%. ${saveRate >= 20 ? 'Rất tốt! 🎉' : 'Cố gắng tiết kiệm ít nhất 20% thu nhập nhé! 💪'}`;
    }
    return '💰 Hãy thêm thu nhập để mình tính tỷ lệ tiết kiệm cho bạn nhé!';
  }

  if (lower.includes('nhiều nhất') || lower.includes('top') || lower.includes('lớn nhất')) {
    const sorted = Object.entries(stats.byCategory).sort((a, b) => b[1].total - a[1].total);
    if (sorted.length > 0) {
      return `🏆 Danh mục chi nhiều nhất: ${CATEGORIES[sorted[0][0]]?.icon} ${CATEGORIES[sorted[0][0]]?.name} - ${formatCurrency(sorted[0][1].total)}`;
    }
    return '📊 Chưa có đủ dữ liệu để phân tích.';
  }

  if (lower.includes('gần đây') || lower.includes('mới nhất')) {
    const recent = stats.transactions.slice(0, 5);
    if (recent.length === 0) return '📋 Chưa có giao dịch nào.';
    const list = recent.map(t =>
      `${CATEGORIES[t.category]?.icon || '📦'} ${t.description}: ${formatCurrency(t.amount)}`
    ).join('\n');
    return `📋 **5 giao dịch gần nhất:**\n${list}`;
  }

  if (lower.includes('xin chào') || lower.includes('hello') || lower.includes('hi')) {
    return `👋 Xin chào! Mình là SpendAI - trợ lý tài chính của bạn. Bạn có thể hỏi mình về:\n- Tổng chi tiêu tháng này\n- Danh mục chi nhiều nhất\n- Gợi ý tiết kiệm\n- Giao dịch gần đây\n\n💡 *Để dùng AI thông minh hơn, thêm Gemini API key trong Cài đặt!*`;
  }

  return `🤖 Mình hiểu bạn đang hỏi về "${message}". Thử hỏi cụ thể hơn nhé, ví dụ:\n- "Tháng này chi bao nhiêu?"\n- "Ăn uống tốn bao nhiêu?"\n- "Tiết kiệm được bao nhiêu?"\n- "5 giao dịch gần đây"\n\n💡 *Thêm Gemini API key trong Cài đặt để mình trả lời thông minh hơn!*`;
}

/**
 * AI suggest category for a description
 */
async function aiSuggestCategory(description) {
  const settings = getSettings();

  if (!settings.apiKey) {
    return categorizeByKeywords(description);
  }

  const prompt = `Phân loại chi tiêu sau vào MỘT trong các danh mục: food, transport, shopping, entertainment, bills, health, education, other.
Chỉ trả lời tên danh mục, không giải thích.

Chi tiêu: "${description}"`;

  try {
    const result = await callGeminiAPI(prompt, settings.apiKey);
    const category = result.trim().toLowerCase();
    return CATEGORIES[category] ? category : categorizeByKeywords(description);
  } catch {
    return categorizeByKeywords(description);
  }
}
