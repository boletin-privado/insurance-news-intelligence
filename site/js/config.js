/**
 * Configuracion publica del dashboard.
 *
 * La URL del proyecto y la clave publicable de Supabase pueden estar en el
 * navegador. La seguridad real depende de Row Level Security (RLS).
 *
 * Nunca pegues aqui una clave sb_secret_... ni la antigua service_role key.
 */
window.APP_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://rprkajyrvzryeqfmubix.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_5GoTFatr4gCmwdU3HwL9QA_4Vk1cdUF',
  APP_NAME: 'Insurance News Intelligence',
  DEFAULT_PERIOD_DAYS: 30,
  DEFAULT_PAGE_SIZE: 25,
  TIME_ZONE: 'Europe/Madrid',
});
