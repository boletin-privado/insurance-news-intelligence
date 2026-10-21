(function loginPage() {
  'use strict';

  const $ = (selector) => document.querySelector(selector);

  function setStatus(message, type = '') {
    const status = $('#auth-status');
    status.textContent = message || '';
    status.className = `form-status ${type}`.trim();
  }

  function setBusy(isBusy) {
    $('#login-submit').disabled = isBusy;
    $('#reset-submit').disabled = isBusy;
    document.body.classList.toggle('is-busy', isBusy);
  }

  function showConfigError() {
    const panel = $('#config-error');
    panel.textContent = window.APP_CONFIG_ERROR || 'Configuracion incompleta.';
    panel.hidden = false;
    $('#login-form').hidden = true;
    $('#reset-request-form').hidden = true;
  }

  async function redirectExistingSession() {
    const { data, error } = await window.sb.auth.getSession();
    if (error) {
      console.error(error);
      return;
    }
    if (data.session) {
      window.location.replace(window.appUrl('dashboard.html'));
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setStatus('');
    setBusy(true);

    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;

    try {
      const { error } = await window.sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.replace(window.appUrl('dashboard.html'));
    } catch (error) {
      console.error(error);
      setStatus('No se ha podido iniciar sesion. Revisa el correo y la contrasena.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleResetRequest(event) {
    event.preventDefault();
    setStatus('');
    setBusy(true);

    const email = $('#reset-email').value.trim();
    const redirectTo = window.appUrl('reset.html');

    try {
      const { error } = await window.sb.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setStatus(
        'Si existe una cuenta con ese correo, recibiras un enlace para cambiar la contrasena.',
        'success'
      );
      $('#reset-request-form').reset();
    } catch (error) {
      console.error(error);
      setStatus('No se ha podido solicitar el cambio de contrasena.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function toggleResetPanel(showReset) {
    $('#login-form').hidden = showReset;
    $('#reset-request-form').hidden = !showReset;
    setStatus('');
    if (showReset) {
      $('#reset-email').focus();
    } else {
      $('#login-email').focus();
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.APP_READY) {
      showConfigError();
      return;
    }

    $('#login-form').addEventListener('submit', handleLogin);
    $('#reset-request-form').addEventListener('submit', handleResetRequest);
    $('#show-reset').addEventListener('click', () => toggleResetPanel(true));
    $('#show-login').addEventListener('click', () => toggleResetPanel(false));
    $('#toggle-password').addEventListener('click', () => {
      const input = $('#login-password');
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      $('#toggle-password').setAttribute('aria-label', visible ? 'Mostrar contrasena' : 'Ocultar contrasena');
    });

    await redirectExistingSession();
  });
})();
