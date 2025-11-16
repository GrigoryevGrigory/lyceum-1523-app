// Main app.js
import { renderTimeline } from './ui-timeline.js';
import { renderContacts } from './ui-contacts.js';
  events: [],
  contacts: [],
          fetch('./data/events.json'),
      fetch('./data/contacts.json')
import { renderHomeworks } from './ui-homeworks.js';
import { renderMarks } from './ui-marks.js';

const state = {
  homeworks: [],
  marks: [],
  lastSync: null
};

async function loadData() {
  try {
    const [hwRes, marksRes] = await Promise.all([
      fetch('./data/homeworks.json'),
      fetch('./data/marks.json')
    ]);
    
    if (hwRes.ok) {
      const hwJson = await hwRes.json();
      state.homeworks = hwJson.homeworks;
      state.lastSync = hwJson.syncedat || state.lastSync;
    }
    
    if (marksRes.ok) {
      const marksJson = await marksRes.json();
      state.marks = marksJson.marks;
      state.lastSync = marksJson.syncedat || state.lastSync;
    }
    
    updateSyncStatus();
    renderCurrentTab();
  } catch (e) {
    console.error('Failed to load JSON:', e);
  }
}

function updateSyncStatus() {
  const el = document.getElementById('sync-last');
  if (!el) return;
  el.textContent = state.lastSync
    ? new Date(state.lastSync).toLocaleString('ru-RU')
    : 'Загрузка...';
}

function handleTabClick(tabId) {
  document.querySelectorAll('.tab').forEach(sec => {
    sec.classList.toggle('tab--active', sec.id === `tab-${tabId}`);
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('nav-btn--active', btn.dataset.tab === tabId);
  });
  renderCurrentTab();
}

function renderCurrentTab() {
  const active = document.querySelector('.tab--active');
  if (!active) return;
  
  const id = active.id.replace('tab-', '');
  switch (id) {
    case 'dashboard':
      active.innerHTML = `
        <h2>Дашборд</h2>
        <p>Добро пожаловать в приложение Лицея 1523!</p>
        <p>Всего заданий: ${state.homeworks.length}</p>
        <p>Всего оценок: ${state.marks.length}</p>
      `;
      break;
    case 'homeworks':
      renderHomeworks(state.homeworks);
      break;
    case 'marks':
      renderMarks(state.marks);
      break;
    default:
      active.innerHTML = `<h2>${id}</h2><p>v1.0 - Скоро...</p>`;
      break;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTabClick(btn.dataset.tab));
  });
  
  document.getElementById('btn-sync-now')?.addEventListener('click', () => {
    alert('Это GitHub-only приложение. Данные обновляются через GitHub Actions.');
  });
  
  loadData();
});

export { state, loadData };

    case 'timeline':
      if (state.events) renderTimeline(state.events);
      break;
    case 'contacts':
      if (state.contacts) renderContacts(state.contacts);
      break;
