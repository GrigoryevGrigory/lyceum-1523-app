import { logActivity } from './auth.js';

export function renderDashboard(state) {
  const container = document.getElementById('tab-dashboard');
  if (!container) return;

  const { profile, events, documents, checklistStatus, activityLog } = state;
  const today = new Date();

  // Sort events by date
  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Find next upcoming event
  const nextEvent = sorted.find(e => new Date(e.date) >= today);

  // Find current phase (last event whose date has passed)
  const pastEvents = sorted.filter(e => new Date(e.date) < today);
  const currentPhase = pastEvents[pastEvents.length - 1] || null;

  // Checklist progress
  const allItems = documents.flatMap(g => g.items);
  const total = allItems.length;
  const done = checklistStatus.filter(s => s.status === 'ready').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Days until next event
  const daysUntil = nextEvent
    ? Math.ceil((new Date(nextEvent.date) - today) / (1000 * 60 * 60 * 24))
    : null;

  // Recent activity (last 3 meaningful entries)
  const recentActivity = activityLog
    .filter(a => a.action !== 'login')
    .slice(0, 3);

  // Last visit info
  const loginEntries = activityLog.filter(a => a.action === 'login');
  const lastVisit = loginEntries.length > 1 ? loginEntries[1]?.created_at : null;

  const profileLabel = profile
    ? `${profile.child_name}${profile.target_class ? `, ${profile.target_class} класс` : ''}${formatProfile(profile.target_profile)}`
    : '';

  container.innerHTML = `
    <div class="dashboard">
      ${lastVisit ? `<div class="last-visit-bar">Последний визит: ${formatRelDate(lastVisit)}</div>` : ''}

      <div class="dashboard-hero">
        <div class="dashboard-hero__label">Поступление в Лицей 1523 МИФИ</div>
        <div class="dashboard-hero__name">${esc(profile?.child_name || 'Абитуриент')}</div>
        ${profileLabel ? `<div class="dashboard-hero__meta">${esc(profileLabel)}</div>` : ''}
      </div>

      <div class="dashboard-cards">
        ${nextEvent ? `
          <div class="dash-card dash-card--countdown">
            <div class="dash-card__label">Ближайшее событие</div>
            <div class="dash-card__value">${daysUntil === 0 ? 'Сегодня!' : daysUntil === 1 ? 'Завтра' : `${daysUntil} дн.`}</div>
            <div class="dash-card__sub">${esc(nextEvent.title)}</div>
            <div class="dash-card__date">${formatDate(nextEvent.date)}</div>
            ${nextEvent.link ? `<a href="${nextEvent.link}" target="_blank" class="dash-card__link">Перейти →</a>` : ''}
          </div>
        ` : `
          <div class="dash-card dash-card--done">
            <div class="dash-card__value">🎉</div>
            <div class="dash-card__sub">Все этапы пройдены</div>
          </div>
        `}

        <div class="dash-card dash-card--docs">
          <div class="dash-card__label">Документы</div>
          <div class="dash-card__value">${done} / ${total}</div>
          <div class="dash-card__sub">готово</div>
          <div class="progress-bar">
            <div class="progress-bar__fill" style="width: ${pct}%"></div>
          </div>
          <div class="dash-card__pct">${pct}%</div>
        </div>

        ${currentPhase ? `
          <div class="dash-card dash-card--phase">
            <div class="dash-card__label">Текущий этап</div>
            <div class="dash-card__sub">${esc(currentPhase.title)}</div>
            <div class="dash-card__date">${formatDate(currentPhase.date)}</div>
          </div>
        ` : `
          <div class="dash-card dash-card--phase">
            <div class="dash-card__label">Этап</div>
            <div class="dash-card__sub">Приём заявлений открыт</div>
          </div>
        `}
      </div>

      <div class="dashboard-section">
        <h3 class="section-title">Ближайшие события</h3>
        <div class="upcoming-events">
          ${sorted.filter(e => new Date(e.date) >= today).slice(0, 4).map(e => `
            <div class="event-row event-row--${e.type}">
              <div class="event-row__dot"></div>
              <div class="event-row__content">
                <span class="event-row__title">${esc(e.title)}</span>
                <span class="event-row__date">${formatDate(e.date)}</span>
              </div>
              ${e.link ? `<a href="${e.link}" target="_blank" class="event-row__link">↗</a>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      ${recentActivity.length > 0 ? `
        <div class="dashboard-section">
          <h3 class="section-title">Последние действия</h3>
          <div class="recent-activity">
            ${recentActivity.map(a => `
              <div class="activity-row">
                <span class="activity-row__icon">${activityIcon(a.action)}</span>
                <span class="activity-row__text">${activityLabel(a)}</span>
                <span class="activity-row__time">${formatRelDate(a.created_at)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="dashboard-section">
        <h3 class="section-title">Быстрые ссылки</h3>
        <div class="quick-links">
          <a href="https://org.mephi.ru" target="_blank" class="quick-link">
            <span>🖥️</span>
            <span>Портал абитуриента<br><small>org.mephi.ru</small></span>
          </a>
          <a href="https://1523.mephi.ru/admission" target="_blank" class="quick-link">
            <span>📋</span>
            <span>Приём в лицей<br><small>1523.mephi.ru</small></span>
          </a>
          <a href="https://t.me/mephi_1523" target="_blank" class="quick-link">
            <span>✈️</span>
            <span>Telegram лицея<br><small>@mephi_1523</small></span>
          </a>
        </div>
      </div>
    </div>
  `;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
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

function formatProfile(profile) {
  const map = {
    phys_math: ' · Физ-мат',
    it: ' · IT-класс',
    phys_eng: ' · Физ-инж',
    phys_chem: ' · Физ-хим'
  };
  return map[profile] || '';
}

function activityIcon(action) {
  const icons = { doc_updated: '📄', login: '🔑', profile_created: '👤' };
  return icons[action] || '•';
}

function activityLabel(entry) {
  if (entry.action === 'doc_updated') {
    const status = entry.payload?.status;
    const title = entry.payload?.docTitle || entry.payload?.docId || '';
    const label = status === 'ready' ? '✅ готово' : status === 'clarify' ? '⚠️ уточнить' : '⬜ сброшен';
    return `«${esc(title)}» — ${label}`;
  }
  if (entry.action === 'profile_created') return 'Профиль создан';
  return esc(entry.action);
}

function esc(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
