# Checklist de despliegue

## Supabase

- [ ] Ejecutado `001_dashboard_schema.sql`.
- [ ] Ejecutado `002_seed_company_catalog.sql`.
- [ ] Verificado `003_verify_installation.sql`.
- [ ] Email/password activo.
- [ ] Registro público desactivado.
- [ ] Tres usuarios creados manualmente.
- [ ] Site URL configurada.
- [ ] Redirect URL de `reset.html` configurada.
- [ ] Clave publicable copiada; ninguna clave secreta en el repositorio.

## Repositorio

- [ ] `site/js/config.js` contiene `sb_publishable_...`.
- [ ] Rama principal llamada `main`.
- [ ] GitHub Pages configurado con GitHub Actions.
- [ ] Workflow completado correctamente.

## Prueba funcional

- [ ] Login correcto.
- [ ] Usuario no autenticado no puede leer `news`.
- [ ] Primer acceso abre configuración.
- [ ] Preferencias se conservan tras cerrar y abrir el navegador.
- [ ] Sin compañías aparece el estado vacío.
- [ ] “Mostrar todas” consulta todo el histórico.
- [ ] Cuerpo plegado por defecto.
- [ ] Búsqueda encuentra términos en título y cuerpo.
- [ ] Filtro de patrocinadas funciona.
- [ ] Bandera se ve para los demás usuarios.
- [ ] “Solo con bandera” funciona.
- [ ] Usuario autenticado no puede modificar título o cuerpo.
