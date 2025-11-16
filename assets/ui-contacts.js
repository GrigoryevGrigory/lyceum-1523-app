export function renderContacts(contacts) {
  const container = document.getElementById('contacts-container');
  if (!container) return;
  if (!contacts || contacts.length === 0) {
    container.innerHTML = '<p>Контакты не найдены</p>';
    return;
  }
  const html = contacts.map(c => `
    <div class="contact-card">
      <h3>${esc(c.name)}</h3>
      <p>${esc(c.role)}</p>
      ${c.phone ? `<div>Тел: ${esc(c.phone)}</div>` : ''}
      ${c.email ? `<div>Email: ${esc(c.email)}</div>` : ''}
      ${c.hours ? `<div>${esc(c.hours)}</div>` : ''}
    </div>
  `).join('');
  container.innerHTML = html;
}
function esc(t) {
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
