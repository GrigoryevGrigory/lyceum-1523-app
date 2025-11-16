export function renderMarks(marks) {
  const container = document.getElementById('tab-marks');
  if (!container) return;

  container.innerHTML = `
    <h2>Оценки</h2>
    <div class="marks-list">
      ${marks.length ? marks.map(renderMarkRow).join('') : '<p>Оценок пока нет</p>'}
    </div>
  `;
}

function renderMarkRow(mark) {
  const date = mark.date ? new Date(mark.date).toLocaleDateString('ru-RU') : '-';
  const gradeClass = mark.grade >= 4 ? 'grade-good' : mark.grade >= 3 ? 'grade-ok' : 'grade-bad';
  
  return `
    <div class="mark-row">
      <div class="mark-info">
        <strong>${mark.subject || 'Неизвестно'}</strong>
        <span>${mark.worktype || 'Работа'}</span>
        <span>${date}</span>
      </div>
      <div class="mark-grade ${gradeClass}">${mark.grade || '-'}</div>
    </div>
  `;
}
