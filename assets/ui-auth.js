import { register, login, saveProfile, loadProfile } from './auth.js';

// Render login or register form into #auth-view
export function renderAuthScreen(onSuccess) {
  const view = document.getElementById('auth-view');
  showLoginForm(view, onSuccess);
}

function showLoginForm(container, onSuccess) {
  container.innerHTML = `
    <form id="login-form" class="auth-form">
      <h2 class="auth-form__title">Войти</h2>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="login-email" autocomplete="email" placeholder="your@email.com" required>
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" id="login-password" autocomplete="current-password" placeholder="••••••••" required>
      </div>
      <div id="auth-error" class="auth-error hidden"></div>
      <button type="submit" class="btn btn--primary btn--full" id="login-btn">Войти</button>
      <p class="auth-switch">Нет аккаунта? <a href="#" id="go-register">Зарегистрироваться</a></p>
    </form>
  `;

  container.querySelector('#go-register').addEventListener('click', e => {
    e.preventDefault();
    showRegisterForm(container, onSuccess);
  });

  container.querySelector('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = container.querySelector('#login-email').value.trim();
    const password = container.querySelector('#login-password').value;
    const btn = container.querySelector('#login-btn');
    const errEl = container.querySelector('#auth-error');

    btn.disabled = true;
    btn.textContent = 'Входим...';
    errEl.classList.add('hidden');

    try {
      const { user } = await login(email, password);
      const profile = await loadProfile(user.id);
      if (!profile || !profile.child_name) {
        showOnboarding(container, user, onSuccess);
      } else {
        onSuccess(user, profile);
      }
    } catch (err) {
      errEl.textContent = friendlyError(err.message);
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Войти';
    }
  });
}

function showRegisterForm(container, onSuccess) {
  container.innerHTML = `
    <form id="register-form" class="auth-form">
      <h2 class="auth-form__title">Регистрация</h2>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="reg-email" autocomplete="email" placeholder="your@email.com" required>
      </div>
      <div class="form-group">
        <label>Пароль</label>
        <input type="password" id="reg-password" autocomplete="new-password" placeholder="Минимум 6 символов" required minlength="6">
      </div>
      <div id="auth-error" class="auth-error hidden"></div>
      <button type="submit" class="btn btn--primary btn--full" id="reg-btn">Создать аккаунт</button>
      <p class="auth-switch">Уже есть аккаунт? <a href="#" id="go-login">Войти</a></p>
    </form>
  `;

  container.querySelector('#go-login').addEventListener('click', e => {
    e.preventDefault();
    showLoginForm(container, onSuccess);
  });

  container.querySelector('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const email = container.querySelector('#reg-email').value.trim();
    const password = container.querySelector('#reg-password').value;
    const btn = container.querySelector('#reg-btn');
    const errEl = container.querySelector('#auth-error');

    btn.disabled = true;
    btn.textContent = 'Создаём...';
    errEl.classList.add('hidden');

    try {
      const { user, session } = await register(email, password);
      if (user && session) {
        // Email confirmation disabled — has active session, go straight to onboarding
        showOnboarding(container, user, onSuccess);
      } else if (user) {
        // Email confirmation required — must confirm before session is created
        container.innerHTML = `
          <div class="auth-confirm">
            <div class="auth-confirm__icon">📧</div>
            <h2>Проверьте почту</h2>
            <p>Мы отправили письмо на <strong>${email}</strong>.<br>
            Перейдите по ссылке для подтверждения, затем вернитесь и войдите.</p>
            <button class="btn btn--primary btn--full" id="back-to-login">Войти</button>
          </div>
        `;
        container.querySelector('#back-to-login').addEventListener('click', () => {
          showLoginForm(container, onSuccess);
        });
      }
    } catch (err) {
      errEl.textContent = friendlyError(err.message);
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Создать аккаунт';
    }
  });
}

function showOnboarding(container, user, onSuccess) {
  container.innerHTML = `
    <form id="onboarding-form" class="auth-form">
      <h2 class="auth-form__title">Расскажите о себе</h2>
      <p class="auth-form__hint">Это поможет персонализировать трекер поступления</p>

      <div class="form-group">
        <label>Ваше имя (родителя)</label>
        <input type="text" id="ob-parent-name" placeholder="Например: Анна Петрова" autocomplete="name">
      </div>
      <div class="form-group">
        <label>Имя ребёнка <span class="required">*</span></label>
        <input type="text" id="ob-child-name" placeholder="Например: Иван" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Класс поступления <span class="required">*</span></label>
          <select id="ob-class" required>
            <option value="">— выбрать —</option>
            <option value="8">8 класс</option>
            <option value="9">9 класс</option>
            <option value="10">10 класс</option>
          </select>
        </div>
        <div class="form-group">
          <label>Профиль</label>
          <select id="ob-profile">
            <option value="">— выбрать —</option>
            <option value="phys_math">Физ-математический</option>
            <option value="it">IT-класс</option>
            <option value="phys_eng">Физ-инженерный</option>
            <option value="phys_chem">Физ-химический</option>
          </select>
        </div>
      </div>

      <div id="auth-error" class="auth-error hidden"></div>
      <button type="submit" class="btn btn--primary btn--full" id="ob-btn">Начать отслеживать</button>
    </form>
  `;

  container.querySelector('#onboarding-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = container.querySelector('#ob-btn');
    const errEl = container.querySelector('#auth-error');

    const childName = container.querySelector('#ob-child-name').value.trim();
    const targetClass = parseInt(container.querySelector('#ob-class').value) || null;
    const targetProfile = container.querySelector('#ob-profile').value || null;
    const parentName = container.querySelector('#ob-parent-name').value.trim();

    btn.disabled = true;
    btn.textContent = 'Сохраняем...';

    try {
      const profile = {
        parent_name: parentName || null,
        child_name: childName,
        target_class: targetClass,
        target_profile: targetProfile,
        admission_year: 2026
      };
      await saveProfile(user.id, profile);
      onSuccess(user, profile);
    } catch (err) {
      errEl.textContent = friendlyError(err.message);
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Начать отслеживать';
    }
  });
}

function friendlyError(msg) {
  if (!msg) return 'Неизвестная ошибка';
  if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) return 'Неверный email или пароль';
  if (msg.includes('Email not confirmed')) return 'Подтвердите email (проверьте почту)';
  if (msg.includes('User already registered')) return 'Этот email уже зарегистрирован. Войдите.';
  if (msg.includes('Password should be')) return 'Пароль должен быть не менее 6 символов';
  if (msg.includes('Unable to validate')) return 'Ошибка соединения. Проверьте интернет.';
  return msg;
}
