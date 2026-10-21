# Scope funcional

## Acceso

- Tres usuarios creados manualmente en Supabase Auth.
- Correo y contraseña.
- Registro público desactivado.
- Recuperación de contraseña.
- Sesión recordada en el navegador.
- Todo usuario autenticado puede leer todo el histórico.

## Preferencias

Cada usuario puede guardar:

- grupos o entidades predeterminadas;
- periodo inicial, por defecto 30 días;
- si se muestran patrocinadas;
- tamaño de página.

Los filtros usados durante una sesión son temporales. Al abrir de nuevo el navegador se aplican las preferencias guardadas.

## Noticias

Vista principal:

- fecha original del correo BDS;
- compañías implicadas;
- título;
- patrocinada sí/no;
- cuerpo plegado;
- metadatos en “Más información”.

## Bandera compartida

- Atributo global de la noticia.
- Visible para todos los usuarios.
- Cualquier usuario autenticado puede ponerla o quitarla.
- Filtro “Solo con bandera”.
- Indicador agregado en la cabecera.
- Cambio propagado mediante Realtime.

## Compañías

- Dos niveles: grupo y entidad.
- Seleccionar un grupo incluye sus entidades.
- Una noticia multicompañía aparece al filtrar por cualquiera de las compañías implicadas.

## Hosting

- Repositorio público de GitHub.
- GitHub Actions despliega únicamente la carpeta `site`.
- GitHub Pages sirve el frontend.
- Supabase Auth y RLS protegen los datos.
