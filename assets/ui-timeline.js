export function renderTimeline(events) {
  const container = document.getElementById('timeline-container');
  if (!container) return;

  if (!events || events.length === 0) {
    container.innerHTML = '<p class="empty-state">События не найдены</p>';
    return;
  }

  const html = events.map(event => {
    const eventDate = new Date(event.date);
    const dateStr = eventDate.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const typeColors = {
      'deadline': '#f85149',
      'exam': '#d29922',
      'event': '#58a6ff',
      'holiday': '#56d364',
      'milestone': '#bc8cff'
    };

    const color = typeColors[event.type] || '#8b949e';

    return `
      <div class="timeline-item" data-type="${event.type}">
        <div class="timeline-marker" style="background: ${color};"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <h3>${escapeHtml(event.title)}</h3>
            <span class="timeline-date">${dateStr}</span>
          </div>
          <p class="timeline-description">${escapeHtml(event.description)}</p>
          <span class="timeline-badge" style="color: ${color};">${getTypeLabel(event.type)}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="timeline">${html}</div>`;
}

function getTypeLabel(type) {
  const labels = {
    'deadline': 'Дедлайн',
    'exam': 'Экзамен',
    'event': 'Событие',
    'holiday': 'Каникулы',
    'milestone': 'Важно'
  };
  return labels[type] || type;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
