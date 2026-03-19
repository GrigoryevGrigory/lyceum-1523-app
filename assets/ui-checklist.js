import { upsertChecklistItem, loadChecklistStatus, logActivity } from './auth.js';
import { state, renderCurrentTab } from './app.js';

export function renderChecklist(appState) {
  const container = document.getElementById('tab-checklist');
  if (!container) return;

  const { documents, checklistStatus, user } = appState;

  const allItems = documents.flatMap(g => g.items);
  const total = allItems.length;
  const done = checklistStatus.filter(s => s.status === 'ready').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  container.innerHTML = `
    <div class="checklist-page">
      <h2 class="page-title">Документы</h2>
      <div class="checklist-progress">
        <div class="checklist-progress__bar">
          <div class="checklist-progress__fill" style="width: ${pct}%"></div>
        </div>
        <div class="checklist-progress__label">Готово <strong>${done}</strong> из <strong>${total}</strong></div>
      </div>

      ${documents.map(group => {
        const groupItems = group.items;
        const groupDone = groupItems.filter(item => {
          const s = checklistStatus.find(cs => cs.doc_id === item.id);
          return s?.status === 'ready';
        }).length;

        return `
          <div class="checklist-group">
            <div class="checklist-group__header">
              <span class="checklist-group__icon">${esc(group.icon)}</span>
              <h3 class="checklist-group__title">${esc(group.title)}</h3>
              <span class="checklist-group__count">${groupDone}/${groupItems.length}</span>
            </div>
            <div class="checklist-items">
              ${groupItems.map(item => {
                const statusEntry = checklistStatus.find(cs => cs.doc_id === item.id);
                const status = statusEntry?.status || 'pending';
                const note = statusEntry?.note || '';

                return `
                  <div class="checklist-item checklist-item--${status}" data-id="${item.id}">
                    <div class="checklist-item__main">
                      <button class="checklist-btn checklist-btn--status" data-id="${item.id}" data-status="${status}" title="Сменить статус">
                        ${statusIcon(status)}
                      </button>
                      <div class="checklist-item__body">
                        <span class="checklist-item__text">${esc(item.text)}</span>
                        ${item.hint ? `<span class="checklist-item__hint">${esc(item.hint)}</span>` : ''}
                      </div>
                    </div>
                    <div class="checklist-item__note">
                      <input
                        type="text"
                        class="note-input"
                        data-id="${item.id}"
                        placeholder="Заметка..."
                        value="${esc(note)}"
                        maxlength="200"
                      >
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}

      <p class="checklist-footer-note">
        Данные сохраняются автоматически. Актуальный список документов — на
        <a href="https://1523.mephi.ru/admission" target="_blank">1523.mephi.ru/admission</a>
      </p>
    </div>
  `;

  // Attach status toggle listeners
  container.querySelectorAll('.checklist-btn--status').forEach(btn => {
    btn.addEventListener('click', async () => {
      const docId = btn.dataset.id;
      const current = btn.dataset.status;
      const next = nextStatus(current);
      const noteInput = container.querySelector(`.note-input[data-id="${docId}"]`);
      const note = noteInput?.value || '';
      // Find item title for history
      const itemEl = btn.closest('.checklist-item');
      const itemTitle = itemEl?.querySelector('.checklist-item__text')?.textContent || docId;

      try {
        await upsertChecklistItem(user.id, docId, next, note);
        await logActivity(user.id, 'doc_updated', { docId, docTitle: itemTitle, status: next });
        // Refresh state
        state.checklistStatus = await loadChecklistStatus(user.id);
        renderCurrentTab('checklist');
      } catch (e) {
        console.error('Checklist save failed:', e);
      }
    });
  });

  // Attach note save on blur
  container.querySelectorAll('.note-input').forEach(input => {
    input.addEventListener('blur', async () => {
      const docId = input.dataset.id;
      const statusEntry = appState.checklistStatus.find(cs => cs.doc_id === docId);
      const currentStatus = statusEntry?.status || 'pending';
      const note = input.value.trim();

      try {
        await upsertChecklistItem(user.id, docId, currentStatus, note);
        state.checklistStatus = await loadChecklistStatus(user.id);
      } catch (e) {
        console.error('Note save failed:', e);
      }
    });
  });
}

function nextStatus(current) {
  return { pending: 'ready', ready: 'clarify', clarify: 'pending' }[current] || 'pending';
}

function statusIcon(status) {
  return { pending: '⬜', ready: '✅', clarify: '⚠️' }[status] || '⬜';
}

function esc(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
