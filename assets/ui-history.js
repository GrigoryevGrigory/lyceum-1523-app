export function renderHistory(activityLog) {
  const container = document.getElementById('tab-history');
  if (!container) return;

  if (!activityLog || activityLog.length === 0) {
    container.innerHTML = `
      <div class="history-page">
        <h2 class="page-title">История</h2>
        <p class="empty-state">История действий пока пуста.</p>
      </div>
    `;
    return;
  }

  // Group by date
  const groups = {};
  for (const entry of activityLog) {
    const dateKey = new Date(entry.created_at).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(entry);
  }

  // Find last login before current to show "since last visit" banner
  const loginEntries = activityLog.filter(a => a.action === 'login');
  const prevVisit = loginEntries.length > 1 ? loginEntries[1] : null;

  container.innerHTML = `
    <div class="history-page">
      <h2 class="page-title">История действий</h2>

      ${prevVisit ? `
        <div class="history-banner">
          С вашего прошлого визита
          <strong>${formatRelDate(prevVisit.created_at)}</strong>
          прошло время. Проверьте, не появились ли новые события в разделе «Этапы».
        </div>
      ` : ''}

      ${Object.entries(groups).map(([date, entries]) => `
        <div class="history-group">
          <div class="history-group__date">${date}</div>
          <div class="history-entries">
            ${entries.map(entry => `
              <div class="history-entry history-entry--${entry.action}">
                <span class="history-entry__icon">${entryIcon(entry.action)}</span>
                <div class="history-entry__body">
                  <span class="history-entry__text">${entryLabel(entry)}</span>
                  <span class="history-entry__time">${formatTime(entry.created_at)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function entryIcon(action) {
  const icons = {
    login: '🔑',
    doc_updated: '📄',
    profile_created: '👤',
    profile_updated: '✏️'
  };
  return icons[action] || '•';
}

function entryLabel(entry) {
  switch (entry.action) {
    case 'login': {
      const lv = entry.payload?.lastVisit;
      return lv ? `Вход в систему (прошлый визит: ${formatRelDate(lv)})` : 'Вход в систему';
    }
    case 'doc_updated': {
      const title = entry.payload?.docTitle || entry.payload?.docId || '';
      const status = entry.payload?.status;
      const labels = { ready: 'отмечен готовым ✅', clarify: 'требует уточнения ⚠️', pending: 'сброшен ⬜' };
      return `«${esc(title)}» ${labels[status] || status}`;
    }
    case 'profile_created': return 'Профиль создан';
    case 'profile_updated': return 'Профиль обновлён';
    default: return esc(entry.action);
  }
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatRelDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'вчера';
  if (diff < 7) return `${diff} дн. назад`;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function esc(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
