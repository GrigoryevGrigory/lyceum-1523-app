export function renderHomeworks(homeworks) {
  const container = document.getElementById('tab-homeworks');
  if (!container) return;

  const filters = `
    <div class="hw-filters">
      <button data-filter="all" class="chip chip--active">Все</button>
      <button data-filter="active" class="chip">Активные</button>
      <button data-filter="overdue" class="chip">Просроченные</button>
      <button data-filter="completed" class="chip">Выполненные</button>
    </div>
  `;
  
  const list = `<div class="hw-list">${homeworks.map(h => renderHomeworkCard(h)).join('')}</div>`;
  
  container.innerHTML = `<h2>Домашние задания</h2>${filters}${list}`;
  
  container.querySelectorAll('.hw-filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter;
      container.querySelectorAll('.hw-filters .chip').forEach(c => c.classList.remove('chip--active'));
      chip.classList.add('chip--active');
      applyFilter(container, homeworks, filter);
    });
  });
}

function renderHomeworkCard(hw) {
  const deadline = hw.deadline ? new Date(hw.deadline).toLocaleDateString('ru-RU') : 'Не указан';
  const statusClass = hw.status === 'overdue' ? 'hw-card--overdue' : hw.status === 'completed' ? 'hw-card--completed' : 'hw-card--active';
  
  return `
    <article class="homework-card ${statusClass}" data-id="${hw.id}">
      <header class="homework-card__header">
        <span class="homework-card__subject">${hw.subject}</span>
        <span class="homework-card__status">${mapStatus(hw.status)}</span>
      </header>
      <div class="homework-card__body">
        <h3 class="homework-card__title">${escapeHtml(hw.text.slice(0, 80))}...</h3>
        <p class="homework-card__deadline">До: ${deadline}</p>
      </div>
    </article>
  `;
}

function applyFilter(container, allHomeworks, filter) {
  let filtered = allHomeworks;
  const now = new Date();
  
  if (filter === 'active') {
    filtered = allHomeworks.filter(h => h.status === 'notstarted' || h.status === 'inprogress');
  } else if (filter === 'overdue') {
    filtered = allHomeworks.filter(h => h.status === 'overdue');
  } else if (filter === 'completed') {
    filtered = allHomeworks.filter(h => h.status === 'completed');
  }
  
  container.querySelector('.hw-list').innerHTML = filtered.map(renderHomeworkCard).join('');
}

function mapStatus(status) {
  switch (status) {
    case 'notstarted': return 'Не начато';
    case 'inprogress': return 'В процессе';
    case 'completed': return 'Выполнено';
    case 'overdue': return 'Просрочено';
    default: return status;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
