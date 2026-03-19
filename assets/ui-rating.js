import { supabase } from './auth.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function esc(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = String(t);
  return d.innerHTML;
}

async function loadAdmissionStats() {
  const { data, error } = await supabase
    .from('admission_stats')
    .select('*')
    .order('year', { ascending: false })
    .order('target_class')
    .order('profile');
  if (error) throw error;
  return data || [];
}

async function lookupCaseNumber(caseNumber, year) {
  const { data, error } = await supabase
    .from('rating_snapshot')
    .select('*')
    .eq('year', year)
    .eq('case_number', caseNumber.trim())
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadRatingForProfile(year, targetClass, profile) {
  const { data, error } = await supabase
    .from('rating_snapshot')
    .select('case_number, position, score, status')
    .eq('year', year)
    .eq('target_class', targetClass)
    .eq('profile', profile)
    .order('position');
  if (error) throw error;
  return data || [];
}

// ── probability calc ──────────────────────────────────────────────────────────

function calcProbability(position, seats, totalInRating) {
  if (!position || !seats) return null;
  if (position <= seats) {
    // In the green zone — how safely?
    const buffer = seats - position;
    const safetyPct = Math.min(100, Math.round((buffer / seats) * 100 + 50));
    return { pct: Math.min(safetyPct, 97), zone: 'green', buffer };
  } else {
    // Outside seats — chance depends on how many above
    const overflow = position - seats;
    const pct = Math.max(3, Math.round((1 - overflow / Math.max(totalInRating - seats, 1)) * 40));
    return { pct, zone: 'red', overflow };
  }
}

function calcProbabilityByScore(score, stats) {
  if (score == null || !stats) return null;
  const { passing_score, max_score } = stats;
  if (!passing_score) return { pct: null, zone: 'yellow', label: 'Нет данных' };
  const gap = score - passing_score;

  if (gap >= 15) return { pct: 93, zone: 'green', label: 'Высокий' };
  if (gap >= 5)  return { pct: 80, zone: 'green', label: 'Хороший' };
  if (gap >= 0)  return { pct: 62, zone: 'yellow', label: 'Пограничный' };
  if (gap >= -10) return { pct: 28, zone: 'yellow', label: 'Рискованный' };
  if (gap >= -20) return { pct: 10, zone: 'red', label: 'Низкий' };
  return { pct: 2, zone: 'red', label: 'Очень низкий' };
}

// ── main render ───────────────────────────────────────────────────────────────

export async function renderRating(appState) {
  const container = document.getElementById('tab-rating');
  if (!container) return;

  container.innerHTML = `<div class="rating-page"><div class="loading-spinner">Загружаем данные…</div></div>`;

  let stats = [];
  try {
    stats = await loadAdmissionStats();
  } catch (e) {
    container.innerHTML = `<div class="rating-page"><p class="empty-state">Ошибка загрузки данных</p></div>`;
    return;
  }

  const currentYear = 2026;
  const lastYear = 2025;
  const lastStats = stats.filter(s => s.year === lastYear);
  const currentStats = stats.filter(s => s.year === currentYear);

  // Profile options from stats
  const profileOptions = [...new Set(lastStats.map(s => s.profile))];
  const classOptions = [...new Set(lastStats.map(s => s.target_class))].sort();

  const profileLabels = {
    phys_math: 'Физико-математический',
    it: 'IT-класс',
    phys_eng: 'Физико-инженерный',
    phys_chem: 'Физико-химический'
  };

  container.innerHTML = `
    <div class="rating-page">
      <h2 class="page-title">Шансы на поступление</h2>
      <p class="page-subtitle">Аналитика на основе данных прошлых лет · Лицей 1523 МИФИ</p>

      <div class="rating-tabs">
        <button class="rating-tab rating-tab--active" data-mode="case">По номеру дела</button>
        <button class="rating-tab" data-mode="score">По баллу</button>
        <button class="rating-tab" data-mode="history">История баллов</button>
      </div>

      <div id="rating-mode-case" class="rating-mode">
        <div class="rating-notice" style="margin-bottom:.75rem">
          <span class="rating-notice__icon">📋</span>
          <span>Данные рейтинга на <strong>18.03.2026</strong> (первый этап). Доступно: 8 класс ФИЗ-МАТ (141 участник). Другие классы и профили — после публикации на <a href="https://org.mephi.ru/pupil-rating" target="_blank">org.mephi.ru</a>.</span>
        </div>

        <div class="rating-card">
          <h3 class="rating-card__title">Найти позицию в рейтинге</h3>
          <p class="rating-card__hint">Введите номер личного дела из портала <a href="https://org.mephi.ru" target="_blank">org.mephi.ru</a>. Класс и профиль определятся автоматически.</p>

          <div class="form-group">
            <label>Номер личного дела</label>
            <input type="text" id="r-case-number" placeholder="Например: 2033" class="case-input" inputmode="numeric">
          </div>
          <button class="btn btn--primary" id="r-search-btn">Найти в рейтинге</button>
          <div id="r-case-result" class="rating-result hidden"></div>
        </div>
      </div>

      <div id="rating-mode-score" class="rating-mode hidden">
        <div class="rating-card">
          <h3 class="rating-card__title">Оценить шансы по баллу</h3>
          <p class="rating-card__hint">Введите ожидаемый или полученный суммарный балл (сумма по всем испытаниям, макс. 200). Расчёт на основе проходных баллов ${lastYear} года.</p>

          <div class="form-row">
            <div class="form-group">
              <label>Класс</label>
              <select id="s-class">
                ${classOptions.map(c => `<option value="${c}">${c} класс</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Профиль</label>
              <select id="s-profile">
                ${profileOptions.map(p => `<option value="${p}">${profileLabels[p] || p}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Суммарный балл <span id="s-score-label" class="text-muted">(из 200)</span></label>
            <div style="display:flex;align-items:center;gap:1rem">
              <input type="range" id="s-score-range" min="60" max="200" value="170" style="flex:1">
              <input type="number" id="s-score-num" min="60" max="200" value="170" style="width:70px" class="score-num-input">
            </div>
            <p id="s-score-hint" class="rating-card__hint" style="margin-top:.5rem;margin-bottom:0"></p>
          </div>
          <button class="btn btn--primary" id="s-calc-btn">Рассчитать шансы</button>
          <div id="s-score-result" class="rating-result hidden"></div>
        </div>
      </div>

      <div id="rating-mode-history" class="rating-mode hidden">
        <div class="rating-card">
          <h3 class="rating-card__title">Проходные баллы по годам</h3>
          <p class="rating-card__hint">Исторические данные помогают понять динамику конкурса и правильно оценить шансы.</p>

          <div class="form-group">
            <label>Класс</label>
            <div class="class-pills">
              ${classOptions.map((c, i) => `
                <button class="class-pill ${i === 0 ? 'class-pill--active' : ''}" data-class="${c}">${c} кл.</button>
              `).join('')}
            </div>
          </div>
          <div id="history-table-wrap"></div>
        </div>
      </div>
    </div>
  `;

  // ── tab switcher ───────────────────────────────────────────────────────────
  container.querySelectorAll('.rating-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.rating-tab').forEach(t => t.classList.remove('rating-tab--active'));
      container.querySelectorAll('.rating-mode').forEach(m => m.classList.add('hidden'));
      tab.classList.add('rating-tab--active');
      container.querySelector(`#rating-mode-${tab.dataset.mode}`).classList.remove('hidden');
    });
  });

  // ── score range sync + dynamic max ────────────────────────────────────────
  const rangeEl   = container.querySelector('#s-score-range');
  const numEl     = container.querySelector('#s-score-num');
  const labelEl   = container.querySelector('#s-score-label');
  const hintEl    = container.querySelector('#s-score-hint');

  function updateScaleForProfile() {
    const cls  = parseInt(container.querySelector('#s-class').value);
    const prof = container.querySelector('#s-profile').value;
    const st   = stats.find(s => s.year === lastYear && s.target_class === cls && s.profile === prof)
              || stats.find(s => s.target_class === cls && s.profile === prof);
    const maxScore = st?.max_score || 200;
    const minScore = maxScore === 300 ? 100 : 60;
    rangeEl.max = maxScore;
    rangeEl.min = minScore;
    numEl.max   = maxScore;
    numEl.min   = minScore;
    if (parseInt(numEl.value) > maxScore) { numEl.value = maxScore; rangeEl.value = maxScore; }
    if (parseInt(numEl.value) < minScore) { numEl.value = minScore; rangeEl.value = minScore; }
    labelEl.textContent = `(из ${maxScore})`;
    hintEl.textContent = maxScore === 300
      ? 'IT-класс: Математика (100) + Информатика теория (100) + Информатика практика (100). Минимальный порог: 260.'
      : 'Математика (100) + Физика (100). Минимальный порог: 160.';
  }

  container.querySelector('#s-class')?.addEventListener('change', updateScaleForProfile);
  container.querySelector('#s-profile')?.addEventListener('change', updateScaleForProfile);
  updateScaleForProfile();

  rangeEl?.addEventListener('input', () => { numEl.value = rangeEl.value; });
  numEl?.addEventListener('input',   () => { rangeEl.value = numEl.value; });

  // ── case number search ─────────────────────────────────────────────────────
  container.querySelector('#r-search-btn')?.addEventListener('click', async () => {
    const caseNum  = container.querySelector('#r-case-number').value.trim();
    const resultEl = container.querySelector('#r-case-result');

    if (!caseNum) { resultEl.innerHTML = '<p class="rating-error">Введите номер личного дела</p>'; resultEl.classList.remove('hidden'); return; }

    resultEl.innerHTML = '<p class="text-muted">Ищем…</p>';
    resultEl.classList.remove('hidden');

    try {
      const entry = await lookupCaseNumber(caseNum, currentYear);
      if (!entry) {
        resultEl.innerHTML = `
          <div class="rating-not-found">
            <p>Номер <strong>${esc(caseNum)}</strong> не найден в рейтинге ${currentYear} года.</p>
            <p class="text-muted">Сейчас доступны данные только по 8 классу ФИЗ-МАТ. Остальные профили будут добавлены после публикации на <a href="https://org.mephi.ru/pupil-rating" target="_blank">org.mephi.ru</a>.</p>
          </div>
        `;
        return;
      }

      const cls  = entry.target_class;
      const prof = entry.profile;
      const fullList = await loadRatingForProfile(currentYear, cls, prof);
      const stat = stats.find(s => s.year === currentYear && s.target_class === cls && s.profile === prof)
                || stats.find(s => s.year === lastYear    && s.target_class === cls && s.profile === prof);
      const seats = stat?.seats || 25;
      const prob = calcProbability(entry.position, seats, fullList.length);

      resultEl.innerHTML = renderCaseResult(entry, seats, fullList.length, prob, profileLabels[prof] || prof);
    } catch (e) {
      resultEl.innerHTML = `<p class="rating-error">Ошибка: ${esc(e.message)}</p>`;
    }
  });

  // ── score calc ─────────────────────────────────────────────────────────────
  container.querySelector('#s-calc-btn')?.addEventListener('click', () => {
    const score    = parseInt(container.querySelector('#s-score-num').value);
    const cls      = parseInt(container.querySelector('#s-class').value);
    const prof     = container.querySelector('#s-profile').value;
    const resultEl = container.querySelector('#s-score-result');

    const stat2026 = currentStats.find(s => s.target_class === cls && s.profile === prof);
    const stat     = stats.find(s => s.year === lastYear && s.target_class === cls && s.profile === prof);
    if (!stat && !stat2026) { resultEl.innerHTML = '<p class="text-muted">Нет данных для этого профиля</p>'; resultEl.classList.remove('hidden'); return; }

    const maxScore = stat?.max_score || stat2026?.max_score || 200;
    const minThreshold = maxScore === 300 ? 260 : 160;
    const belowThreshold = score < minThreshold;

    const prob = stat ? calcProbabilityByScore(score, stat) : { pct: null, zone: 'yellow', label: 'Нет данных' };
    const allYearStats = stats.filter(s => s.target_class === cls && s.profile === prof && s.passing_score != null);
    resultEl.innerHTML = renderScoreResult(score, stat || stat2026, prob, profileLabels[prof] || prof, allYearStats, stat2026, belowThreshold, minThreshold);
    resultEl.classList.remove('hidden');
  });

  // ── history table ──────────────────────────────────────────────────────────
  function renderHistoryTable(cls) {
    const wrap = container.querySelector('#history-table-wrap');
    const rows = stats.filter(s => s.target_class === cls);
    const profiles = [...new Set(rows.map(r => r.profile))];
    const years = [...new Set(rows.map(r => r.year))].sort((a,b) => b-a);

    if (!rows.length) { wrap.innerHTML = '<p class="text-muted">Нет данных</p>'; return; }

    wrap.innerHTML = `
      <table class="history-table">
        <thead>
          <tr>
            <th>Профиль</th>
            ${years.map(y => `<th>${y}<br><small>Проходной</small></th>`).join('')}
            <th>Мест</th>
            <th>Подало</th>
          </tr>
        </thead>
        <tbody>
          ${profiles.map(prof => {
            const latestRow = rows.find(r => r.year === years[0] && r.profile === prof);
            return `<tr>
              <td><strong>${esc(profileLabels[prof] || prof)}</strong></td>
              ${years.map(y => {
                const r = rows.find(row => row.year === y && row.profile === prof);
                return r ? `<td class="score-cell">${r.passing_score}<span class="score-max">/${r.max_score}</span></td>` : '<td class="text-muted">—</td>';
              }).join('')}
              <td>${latestRow?.seats || '—'}</td>
              <td>${latestRow?.applied || '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <p class="table-note">* Данные за ${lastYear} год. Источник: официальные материалы приёмной кампании.</p>
    `;
  }

  renderHistoryTable(classOptions[0]);
  container.querySelectorAll('.class-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.class-pill').forEach(p => p.classList.remove('class-pill--active'));
      pill.classList.add('class-pill--active');
      renderHistoryTable(parseInt(pill.dataset.class));
    });
  });
}

// ── result renderers ──────────────────────────────────────────────────────────

function renderCaseResult(entry, seats, total, prob, profileLabel) {
  const zoneClass = prob ? `zone--${prob.zone}` : '';
  const inSeats = entry.position <= seats;
  const isBvi = entry.enrollment_type === 'БВИ';
  const scoreDisplay = isBvi ? 'БВИ' : (entry.score != null ? entry.score : '—');
  const scoreLabel = isBvi ? 'Тип зачисления' : 'Суммарный балл';
  const isRecommended = entry.status === 'recommended';

  return `
    <div class="result-block">
      <div class="result-header">
        <span class="result-label">Дело №${esc(entry.case_number)}</span>
        <span class="result-badge result-badge--${entry.status}">${statusLabel(entry.status)}</span>
        ${entry.enrollment_type ? `<span class="enrollment-type-badge">${esc(entry.enrollment_type)}</span>` : ''}
      </div>

      <div class="result-stats">
        <div class="result-stat">
          <div class="result-stat__value">${entry.position}</div>
          <div class="result-stat__label">Место в рейтинге</div>
        </div>
        <div class="result-stat">
          <div class="result-stat__value">${scoreDisplay}</div>
          <div class="result-stat__label">${scoreLabel}</div>
        </div>
        <div class="result-stat">
          <div class="result-stat__value">${seats}</div>
          <div class="result-stat__label">Бюджетных мест</div>
        </div>
        <div class="result-stat">
          <div class="result-stat__value">${total}</div>
          <div class="result-stat__label">В рейтинге</div>
        </div>
      </div>

      ${isRecommended ? `
        <div class="prob-bar-wrap zone--green">
          <div class="prob-bar"><div class="prob-bar__fill" style="width:95%"></div></div>
          <div class="prob-label">
            <strong>Рекомендован к зачислению</strong> (список от 18.03.2026)
            <span class="prob-note prob-note--good">✅ ${isBvi ? 'Зачислен без вступительных испытаний' : `В зоне зачисления (место ${entry.position} из ${seats})`}</span>
          </div>
        </div>
      ` : prob ? `
        <div class="prob-bar-wrap ${zoneClass}">
          <div class="prob-bar">
            <div class="prob-bar__fill" style="width:${prob.pct}%"></div>
          </div>
          <div class="prob-label">
            <strong>${prob.pct}%</strong> вероятность поступления
            ${inSeats
              ? `<span class="prob-note prob-note--good">✅ В пределах плана набора (место ${entry.position} из ${seats})</span>`
              : `<span class="prob-note prob-note--warn">⚠️ За чертой плана набора на ${prob.overflow} позиций</span>`}
          </div>
        </div>
        <p class="text-muted" style="margin:.5rem 0;font-size:.8rem">Данные на 18.03.2026. Список может обновляться по мере подтверждения зачисления.</p>
      ` : ''}
    </div>
  `;
}

function renderScoreResult(score, stat, prob, profileLabel, allYearStats, stat2026, belowThreshold, minThreshold) {
  const seats2026 = stat2026?.seats ?? stat?.seats;
  const hasPassing = stat?.passing_score != null;
  const gap = hasPassing ? score - stat.passing_score : null;
  const gapSign = gap !== null && gap >= 0 ? '+' : '';

  return `
    <div class="result-block">
      <div class="result-header">
        <span class="result-label">${esc(profileLabel)}, ${stat.target_class} класс</span>
      </div>

      ${belowThreshold ? `<div class="advice advice--red" style="margin-bottom:.75rem">
        ❗ Балл <strong>${score}</strong> ниже минимального порога допуска (<strong>${minThreshold}</strong>). Для участия в конкурсе необходимо набрать не менее ${minThreshold} баллов суммарно.
      </div>` : ''}

      ${stat2026 ? `<div class="rating-notice" style="margin-bottom:.75rem">
        <span class="rating-notice__icon">📋</span>
        <span>Проходной балл 2026 года станет известен после испытаний (июнь 2026). Сравнение идёт с данными ${stat?.year || 2025} года. <strong>Мест в 2026: ${seats2026}</strong></span>
      </div>` : ''}

      <div class="result-stats">
        <div class="result-stat">
          <div class="result-stat__value">${score}</div>
          <div class="result-stat__label">Ваш балл</div>
        </div>
        <div class="result-stat">
          <div class="result-stat__value">${hasPassing ? stat.passing_score : '?'}</div>
          <div class="result-stat__label">Проходной ${stat?.year ?? '2025'}</div>
        </div>
        <div class="result-stat">
          <div class="result-stat__value">${hasPassing ? `${gapSign}${gap}` : '—'}</div>
          <div class="result-stat__label">Разница</div>
        </div>
        <div class="result-stat">
          <div class="result-stat__value">${seats2026 ?? stat?.seats ?? '—'}</div>
          <div class="result-stat__label">Мест 2026</div>
        </div>
      </div>

      ${hasPassing && prob.pct ? `
        <div class="prob-bar-wrap zone--${prob.zone}">
          <div class="prob-bar">
            <div class="prob-bar__fill" style="width:${prob.pct}%"></div>
          </div>
          <div class="prob-label">
            <strong>${prob.pct}%</strong> — ${prob.label || ''} шанс (по данным ${stat.year})
          </div>
        </div>
      ` : `<p class="text-muted" style="margin:.5rem 0">Вероятность будет рассчитана после публикации проходных баллов 2026.</p>`}

      <div class="score-advice">
        ${hasPassing ? scoreAdvice(gap, stat) : `<p class="advice advice--yellow">ℹ️ Ваш балл (${score}) выше минимального порога допуска. Точная оценка шансов — после публикации результатов испытаний.</p>`}
      </div>

      ${allYearStats.length > 1 ? `
        <div class="mini-trend">
          <div class="mini-trend__title">Динамика проходного балла</div>
          <div class="mini-trend__bars">
            ${allYearStats.sort((a,b) => a.year - b.year).map(s => `
              <div class="trend-bar-wrap">
                <div class="trend-bar" style="height:${Math.round((s.passing_score / s.max_score) * 80)}px" title="${s.year}: ${s.passing_score}/${s.max_score}">
                  <span class="trend-bar__val">${s.passing_score}</span>
                </div>
                <div class="trend-bar__year">${s.year}</div>
              </div>
            `).join('')}
            <div class="trend-bar-wrap trend-bar-wrap--yours">
              <div class="trend-bar trend-bar--yours" style="height:${Math.round((score / 200) * 80)}px">
                <span class="trend-bar__val">${score}</span>
              </div>
              <div class="trend-bar__year">Ваш</div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function scoreAdvice(gap, stat) {
  if (gap >= 20) return `<p class="advice advice--green">🎯 Отличные шансы. Балл значительно выше проходного — можно не беспокоиться.</p>`;
  if (gap >= 8)  return `<p class="advice advice--green">👍 Хорошая позиция. Небольшой запас над проходным баллом даёт уверенность.</p>`;
  if (gap >= 0)  return `<p class="advice advice--yellow">⚠️ Пограничная зона. Балл у черты — следите за рейтингом после публикации списков.</p>`;
  if (gap >= -10) return `<p class="advice advice--yellow">📈 Риск. До проходного балла ${Math.abs(gap)} пунктов. Проверьте дополнительные достижения (МЦКО, олимпиады).</p>`;
  return `<p class="advice advice--red">❗Баллов может не хватить. Рассмотрите другие профили или подготовку на следующий год.</p>`;
}

function statusLabel(s) {
  return { recommended: 'Рекомендован', enrolled: 'Зачислен', pending: 'В рейтинге', not_recommended: 'В рейтинге' }[s] || s;
}
