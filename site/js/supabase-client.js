(function initializeSupabaseClient() {
  'use strict';

  const config = window.APP_CONFIG || {};
  const key = String(config.SUPABASE_PUBLISHABLE_KEY || '').trim();
  const url = String(config.SUPABASE_URL || '').trim().replace(/\/+$/, '');

  const isPlaceholder = !key || key.includes('PEGA_AQUI') || key.startsWith('sb_secret_');

  window.APP_READY = !isPlaceholder && /^https:\/\/.+\.supabase\.co$/i.test(url);
  window.APP_CONFIG_ERROR = '';

  if (!window.APP_READY) {
    window.APP_CONFIG_ERROR = isPlaceholder
      ? 'Falta configurar la clave publicable de Supabase en js/config.js.'
      : 'La URL de Supabase de js/config.js no parece valida.';
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    window.APP_READY = false;
    window.APP_CONFIG_ERROR = 'No se ha podido cargar supabase-js.';
    return;
  }

  window.sb = window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  window.appUrl = function appUrl(fileName) {
    return new URL(fileName, window.location.href).href;
  };
})();
