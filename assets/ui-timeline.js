export function renderTimeline(events) {
  const container = document.getElementById('tab-timeline');
  if (!container) return;

  if (!events || events.length === 0) {
    container.innerHTML = '<p class="empty-state">События не найдены</p>';
    return;
  }

  const today = new Date();
  const sorted = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Mark each event: past, next (the first upcoming), or future
  let foundNext = false;
  const enriched = sorted.map(evt => {
    const isPast = new Date(evt.date) < today;
    const isNext = !isPast && !foundNext;
    if (isNext) foundNext = true;
    return { ...evt, isPast, isNext };
  });

  const steps = [
    { num: 1, label: 'Регистрация', icon: '📝' },
    { num: 2, label: 'Документы', icon: '📂' },
    { num: 3, label: 'Испытания', icon: '✏️' },
    { num: 4, label: 'Зачисление', icon: '🎓' }
  ];

  const currentStep = (() => {
    const passed = enriched.filter(e => e.isPast).map(e => e.step || 1);
    return passed.length ? Math.max(...passed) : 1;
  })();

  container.innerHTML = `
    <div class="timeline-page">
      <h2 class="page-title">Этапы поступления 2026</h2>
      <p class="page-subtitle">Лицей №1523 НИЯУ МИФИ · <a href="https://1523.mephi.ru/admission" target="_blank">1523.mephi.ru/admission</a></p>

      <div class="steps-nav">
        ${steps.map(s => `
          <div class="step-pill ${s.num < currentStep ? 'step-pill--done' : s.num === currentStep ? 'step-pill--active' : ''}">
            <span class="step-pill__icon">${s.num < currentStep ? '✓' : s.icon}</span>
            <span class="step-pill__label">${s.label}</span>
          </div>
        `).join('')}
      </div>

      <div class="timeline">
        ${enriched.map((evt, i) => {
          const isFirstOfStep = i === 0 || enriched[i - 1].step !== evt.step;
          const stepInfo = steps.find(s => s.num === (evt.step || 1));
          const stepHeader = isFirstOfStep && evt.step
            ? `<div class="timeline-step-header">${stepInfo?.icon || ''} Шаг ${evt.step}: ${stepInfo?.label || ''}</div>`
            : '';

          return `
            ${stepHeader}
            <div class="timeline-item ${evt.isPast ? 'timeline-item--past' : evt.isNext ? 'timeline-item--next' : ''}">
              <div class="timeline-marker">
                ${evt.isPast
                  ? '<span class="marker-check">✓</span>'
                  : evt.isNext
                    ? '<span class="marker-dot marker-dot--active"></span>'
                    : '<span class="marker-dot"></span>'}
              </div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <h3 class="timeline-title">${esc(evt.title)}</h3>
                  <span class="timeline-badge timeline-badge--${evt.type}">${typeLabel(evt.type)}</span>
                </div>
                <div class="timeline-date">${formatDate(evt.date)}</div>
                <p class="timeline-description">${esc(evt.description)}</p>
                ${evt.link ? `<a href="${evt.link}" target="_blank" class="timeline-link">Перейти →</a>` : ''}
                ${evt.isNext ? '<div class="timeline-next-badge">← Следующий шаг</div>' : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function typeLabel(type) {
  return { deadline: 'Дедлайн', exam: 'Испытание', event: 'Событие', milestone: 'Веха', holiday: 'Каникулы' }[type] || type;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function esc(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
