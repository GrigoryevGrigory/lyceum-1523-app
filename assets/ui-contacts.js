export function renderContacts(contacts) {
  const container = document.getElementById('tab-contacts');
  if (!container) return;

  if (!contacts || contacts.length === 0) {
    container.innerHTML = '<p class="empty-state">Контакты не найдены</p>';
    return;
  }

  const byType = {
    admission: contacts.filter(c => c.type === 'admission'),
    online: contacts.filter(c => c.type === 'online'),
    social: contacts.filter(c => c.type === 'social'),
    courses: contacts.filter(c => c.type === 'courses')
  };

  container.innerHTML = `
    <div class="contacts-page">
      <h2 class="page-title">Контакты</h2>

      ${section('Приёмная комиссия', byType.admission, renderContactCard)}
      ${section('Онлайн-ресурсы', byType.online, renderOnlineCard)}
      ${section('Мессенджеры и соцсети', byType.social, renderSocialCard)}
      ${section('Подготовительные курсы', byType.courses, renderContactCard)}
    </div>
  `;
}

function section(title, items, renderer) {
  if (!items.length) return '';
  return `
    <div class="contacts-section">
      <h3 class="contacts-section__title">${title}</h3>
      <div class="contacts-grid">
        ${items.map(renderer).join('')}
      </div>
    </div>
  `;
}

function renderContactCard(c) {
  return `
    <div class="contact-card">
      <h4 class="contact-card__name">${esc(c.name)}</h4>
      <p class="contact-card__role">${esc(c.role)}</p>
      ${c.phone ? `<a href="tel:${c.phone.replace(/[^+\d]/g, '')}" class="contact-card__row contact-card__row--phone">
        <span>📞</span> ${esc(c.phone)}
      </a>` : ''}
      ${c.phone2 ? `<a href="tel:${c.phone2.replace(/[^+\d]/g, '')}" class="contact-card__row contact-card__row--phone">
        <span>📞</span> ${esc(c.phone2)}
      </a>` : ''}
      ${c.email ? `<a href="mailto:${esc(c.email)}" class="contact-card__row contact-card__row--email">
        <span>✉️</span> ${esc(c.email)}
      </a>` : ''}
      ${c.address ? `<div class="contact-card__row"><span>📍</span> ${esc(c.address)}</div>` : ''}
      ${c.hours ? `<div class="contact-card__row"><span>🕐</span> ${esc(c.hours)}</div>` : ''}
    </div>
  `;
}

function renderOnlineCard(c) {
  return `
    <div class="contact-card contact-card--online">
      <h4 class="contact-card__name">${esc(c.name)}</h4>
      <p class="contact-card__role">${esc(c.role)}</p>
      ${c.url ? `<a href="${c.url}" target="_blank" class="contact-card__row contact-card__row--link">
        <span>🔗</span> ${esc(c.url.replace('https://', ''))}
      </a>` : ''}
      ${c.url_admission ? `<a href="${c.url_admission}" target="_blank" class="contact-card__row contact-card__row--link">
        <span>📋</span> Раздел «Поступление»
      </a>` : ''}
      ${c.description ? `<p class="contact-card__desc">${esc(c.description)}</p>` : ''}
    </div>
  `;
}

function renderSocialCard(c) {
  return `
    <div class="contact-card contact-card--social">
      <h4 class="contact-card__name">${esc(c.name)}</h4>
      <p class="contact-card__role">${esc(c.role)}</p>
      ${c.telegram ? `<a href="${c.telegram}" target="_blank" class="contact-card__row contact-card__row--tg">
        <span>✈️</span> ${esc(c.telegram_handle || c.telegram)}
      </a>` : ''}
      ${c.url ? `<a href="${c.url}" target="_blank" class="contact-card__row contact-card__row--link">
        <span>🔗</span> ВКонтакте
      </a>` : ''}
    </div>
  `;
}

function esc(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}
