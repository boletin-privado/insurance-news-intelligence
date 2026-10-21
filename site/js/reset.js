(function resetPasswordPage() {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  let recoveryReady = false;

  function setStatus(message, type = '') {
    const status = $('#reset-status');
    status.textContent = message || '';
    status.className = `form-status ${type}`.trim();
  }

  function setFormEnabled(enabled) {
    $('#new-password').disabled = !enabled;
    $('#confirm-password').disabled = !enabled;
    $('#password-submit').disabled = !enabled;
  }

  async function detectRecoverySession() {
    const { data } = await window.sb.auth.getSession();
    if (data.session) {
      recoveryReady = true;
      setFormEnabled(true);
      setStatus('Escribe tu nueva contrasena.', 'success');
    }
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault();

    if (!recoveryReady) {
      setStatus('Abre de nuevo el enlace de recuperacion recibido por correo.', 'error');
      return;
    }

    const password = $('#new-password').value;
    const confirmation = $('#confirm-password').value;

    if (password.length < 8) {
      setStatus('La contrasena debe tener al menos 8 caracteres.', 'error');
      return;
    }

    if (password !== confirmation) {
      setStatus('Las contrasenas no coinciden.', 'error');
      return;
    }

    setFormEnabled(false);
    setStatus('Guardando...');

    try {
      const { error } = await window.sb.auth.updateUser({ password });
      if (error) throw error;
      setStatus('Contrasena actualizada. Entrando al dashboard...', 'success');
      window.setTimeout(() => {
        window.location.replace(window.appUrl('dashboard.html'));
      }, 900);
    } catch (error) {
      console.error(error);
      setStatus('No se ha podido actualizar la contrasena.', 'error');
      setFormEnabled(true);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.APP_READY) {
      $('#config-error').hidden = false;
      $('#config-error').textContent = window.APP_CONFIG_ERROR;
      $('#password-form').hidden = true;
      return;
    }

    setFormEnabled(false);
    $('#password-form').addEventListener('submit', handlePasswordUpdate);

    window.sb.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        recoveryReady = true;
        setFormEnabled(true);
        setStatus('Escribe tu nueva contrasena.', 'success');
      }
    });

    await detectRecoverySession();
  });
})();
