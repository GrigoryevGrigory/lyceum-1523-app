import { getSession, loadProfile, loadActivityLog, logActivity, logout, loadChecklistItems, loadChecklistStatus } from './auth.js';
import { renderAuthScreen } from './ui-auth.js';
import { renderDashboard } from './ui-dashboard.js';
import { renderTimeline } from './ui-timeline.js';
import { renderChecklist } from './ui-checklist.js';
import { renderHistory } from './ui-history.js';
import { renderContacts } from './ui-contacts.js';

export const state = {
  user: null,
  profile: null,
  events: [],
  contacts: [],
  checklistItems: [],   // from DB (checklist_items table)
  documents: [],        // legacy alias, kept for compatibility
  faq: [],
  checklistStatus: [],
  activityLog: [],
  dataLoaded: false
};

async function loadStaticData() {
  try {
    const [eventsRes, contactsRes, faqRes] = await Promise.all([
      fetch('./data/events.json'),
      fetch('./data/contacts.json'),
      fetch('./data/faq.json')
    ]);
    if (eventsRes.ok) state.events = (await eventsRes.json()).events || [];
    if (contactsRes.ok) state.contacts = (await contactsRes.json()).contacts || [];
    if (faqRes.ok) state.faq = (await faqRes.json()).faq || [];
    state.dataLoaded = true;
    updateSyncBadge();
  } catch (e) {
    console.error('Failed to load static data:', e);
  }
}

// Convert DB checklist_items (flat list) into grouped structure for UI
function groupChecklistItems(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.category]) {
      groups[item.category] = { title: item.category, icon: categoryIcon(item.category), items: [] };
    }
    groups[item.category].items.push({ id: String(item.id), text: item.title, hint: item.description });
  }
  return Object.values(groups);
}

function categoryIcon(cat) {
  const map = {
    'Подготовка': '📚', 'Документы': '📄', 'Регистрация': '🖊️',
    'Вступительные испытания': '✏️', 'Результаты': '📊', 'Зачисление': '🎓'
  };
  return map[cat] || '📌';
}

function updateSyncBadge() {
  const el = document.getElementById('sync-badge');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function handleTabClick(tabId) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn--active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
  const btn = document.querySelector(`button[data-tab="${tabId}"]`);
  const tab = document.getElementById(`tab-${tabId}`);
  if (btn) btn.classList.add('nav-btn--active');
  if (tab) tab.classList.add('tab--active');
  renderCurrentTab(tabId);
}

export function renderCurrentTab(tabId) {
  if (!tabId) {
    const active = document.querySelector('.tab--active');
    if (!active) return;
    tabId = active.id.replace('tab-', '');
  }
  switch (tabId) {
    case 'dashboard': renderDashboard(state); break;
    case 'timeline': renderTimeline(state.events); break;
    case 'checklist': renderChecklist(state); break;
    case 'history': renderHistory(state.activityLog); break;
    case 'contacts': renderContacts(state.contacts); break;
  }
}

async function showApp(user, profile) {
  state.user = user;
  state.profile = profile;

  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');

  // Header: child name
  const childEl = document.getElementById('header-child-name');
  if (childEl && profile?.child_name) {
    childEl.textContent = profile.child_name + (profile.target_class ? `, ${profile.target_class} класс` : '');
  }

  // Parallel: load static data + user data from DB
  const [activityLog, checklistItems, checklistStatus] = await Promise.all([
    loadActivityLog(user.id),
    loadChecklistItems(),
    loadChecklistStatus(user.id),
    state.dataLoaded ? Promise.resolve() : loadStaticData()
  ]);
  state.activityLog = activityLog;
  state.checklistItems = checklistItems;
  state.checklistStatus = checklistStatus;
  state.documents = groupChecklistItems(checklistItems);

  // Log this visit (with previous last-visit timestamp)
  const lastVisit = activityLog.find(a => a.action === 'login')?.created_at || null;
  await logActivity(user.id, 'login', { lastVisit });

  // Refresh log with new entry
  state.activityLog = await loadActivityLog(user.id);

  renderCurrentTab('dashboard');
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  renderAuthScreen(showApp);
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTabClick(btn.dataset.tab));
  });

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await logout().catch(() => {});
    state.user = null;
    state.profile = null;
    showAuthScreen();
  });

  // Start loading static data immediately
  loadStaticData();

  // Check existing auth session
  const session = await getSession();
  if (session?.user) {
    try {
      const profile = await loadProfile(session.user.id);
      if (profile?.child_name) {
        await showApp(session.user, profile);
        return;
      }
    } catch (e) {
      console.warn('Session restore failed:', e);
    }
  }

  showAuthScreen();
});
