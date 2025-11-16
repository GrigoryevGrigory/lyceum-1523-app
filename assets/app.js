// Updated: 2025-11-16 15:00 MSK
function handleTabClick(tabId) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn--active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
  const btn = document.querySelector(`button[data-tab="${tabId}"]`);
  const tab = document.getElementById(`tab-${tabId}`);
  if (btn) btn.classList.add('nav-btn--active');
  if (tab) tab.classList.add('tab--active');
  renderCurrentTab();
}


// Main app.js
import { renderTimeline } from './ui-timeline.js';
import { renderContacts } from './ui-contacts.js';
import { renderHomeworks } from './ui-homeworks.js';
import { renderMarks } from './ui-marks.js';

const state = {
  homeworks: [],
  marks: [],
  events: [],
  contacts: [],
  lastSync: null
};

async function loadData() {
  try {
    const [hwRes, marksRes, eventsRes, contactsRes] = await Promise.all([
      fetch('./data/homeworks.json'),
      fetch('./data/marks.json'),
      fetch('./data/events.json'),
      fetch('./data/contacts.json')
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

    if (eventsRes.ok) {
      const eventsJson = await eventsRes.json();
      state.events = eventsJson.events;
    }

    if (contactsRes.ok) {
      const contactsJson = await contactsRes.json();
      state.contacts = contactsJson.contacts;
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
  if (state.lastSync) {
    const d = new Date(state.lastSync);
    el.textContent = `Обновлено: ${d.toLocaleString('ru-RU')}`;
  } else {
    el.textContent = 'Загрузка...';
  }
}

function renderCurrentTab() {
  const active = document.querySelector('.tab--active');
  if (!active) return;
  const tabId = active.dataset.tab;
  switch (tabId) {
    case 'dashboard':
      active.innerHTML = `<h2>${tabId}</h2><p>v1.0 – Скоро...</p>`;
      break;
    case 'homeworks':
      renderHomeworks(state.homeworks);
      break;
    case 'marks':
      renderMarks(state.marks);
      break;
    case 'timeline':
      if (state.events) renderTimeline(state.events);
      break;
    case 'contacts':
      if (state.contacts) renderContacts(state.contacts);
      break;
    default:
      active.innerHTML = `<h2>${tabId}</h2><p>v1.0 – Скоро...</p>`;
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
