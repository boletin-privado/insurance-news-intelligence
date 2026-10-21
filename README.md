# Insurance News Intelligence

Dashboard estático para GitHub Pages, autenticado con Supabase y conectado al histórico de noticias BDS.

## Qué incluye

- Acceso mediante Supabase Auth con correo y contraseña.
- Registro público desactivable; los usuarios se crean manualmente.
- Sesión persistente en el navegador y recuperación de contraseña.
- Lectura del histórico `public.news` únicamente para usuarios autenticados.
- Preferencias por usuario:
  - compañías predeterminadas;
  - periodo inicial;
  - inclusión de noticias patrocinadas;
  - resultados por página.
- Grupos y entidades diferenciados, por ejemplo AXA y AXA XL.
- Filtros temporales que no sobrescriben las preferencias guardadas.
- Cuerpo de la noticia plegado por defecto.
- Fuente y número de noticia dentro de “Más información”.
- Bandera discreta y compartida:
  - cualquier usuario autenticado puede marcar o desmarcar una noticia;
  - el estado es global para los tres usuarios;
  - existe un filtro “Solo con bandera”;
  - los cambios se propagan a sesiones abiertas mediante Supabase Realtime.
- Despliegue automático en GitHub Pages mediante GitHub Actions.

## Estructura

```text
.github/workflows/pages.yml        Despliegue de GitHub Pages
site/                              Web pública que GitHub Pages publica
  index.html                       Login sin branding interno
  dashboard.html                   Dashboard autenticado
  reset.html                       Cambio de contraseña
  assets/                          CSS e imágenes
  js/config.js                     URL y clave publicable de Supabase
  js/dashboard.js                  Lógica del dashboard
sql/001_dashboard_schema.sql       Tablas, RLS, preferencias y bandera
sql/002_seed_company_catalog.sql   Catálogo inicial y nombres históricos
sql/003_verify_installation.sql    Comprobaciones
```

## 1. Preparar Supabase

### 1.1 Ejecutar el esquema

En **Supabase → SQL Editor**, ejecuta los archivos en este orden:

1. `sql/001_dashboard_schema.sql`
2. `sql/002_seed_company_catalog.sql`
3. Opcional: `sql/003_verify_installation.sql`

El primer script:

- añade `is_flagged`, `flagged_at` y `flagged_by` a `news`;
- crea el catálogo jerárquico de compañías;
- crea las preferencias personales;
- habilita RLS;
- permite leer todas las noticias a cualquier usuario autenticado;
- impide que el navegador inserte, modifique o borre noticias;
- expone una función segura que solo puede cambiar la bandera;
- habilita Realtime para `public.news`.

### 1.2 Configurar Auth

En **Authentication**:

1. Mantén activo el proveedor Email/Password.
2. Desactiva el registro público o la creación abierta de usuarios.
3. Crea manualmente los tres usuarios autorizados.
4. Cuando conozcas la URL final de GitHub Pages, configura:

```text
Site URL:
https://TU_USUARIO.github.io/TU_REPOSITORIO/

Additional Redirect URL:
https://TU_USUARIO.github.io/TU_REPOSITORIO/reset.html
```

Para pruebas, el servicio de correo incluido de Supabase puede ser suficiente. Para un uso estable de recuperación de contraseña conviene configurar un SMTP propio.

## 2. Añadir la clave publicable

En **Supabase → Settings → API Keys**, copia una clave que empiece por:

```text
sb_publishable_
```

Edita:

```text
site/js/config.js
```

Y sustituye:

```javascript
SUPABASE_PUBLISHABLE_KEY: 'PEGA_AQUI_TU_CLAVE_SB_PUBLISHABLE'
```

La URL de tu proyecto ya está incorporada:

```text
https://rprkajyrvzryeqfmubix.supabase.co
```

### Nunca publiques

- una clave `sb_secret_...`;
- una clave `service_role`;
- credenciales de Gmail;
- tokens OAuth.

La URL y la clave publicable pueden estar en el navegador. La protección real está en RLS.

## 3. Subir a GitHub

1. Crea un repositorio público nuevo, por ejemplo:

```text
insurance-news-intelligence
```

2. Sube **el contenido de esta carpeta**, conservando `.github`, `site`, `sql` y `docs`.
3. Usa `main` como rama principal.
4. En **Settings → Pages**, selecciona **GitHub Actions** como fuente.
5. Haz un commit o push a `main`.
6. Abre la pestaña **Actions** y espera a que termine `Deploy static dashboard to GitHub Pages`.
7. GitHub mostrará la URL publicada.
8. Vuelve a Supabase Auth y añade esa URL y `reset.html` a las URLs permitidas.

## 4. Primera prueba

1. Abre la URL pública.
2. La pantalla de login no mostrará el nombre ni el logotipo de Accenture.
3. Accede con uno de los usuarios creados manualmente.
4. En el primer acceso se abrirá **Mi configuración**.
5. Selecciona uno o varios grupos o entidades.
6. Guarda la configuración.
7. El dashboard cargará 30 días por defecto.

Si el usuario no selecciona ninguna compañía, el dashboard no mostrará noticias y le pedirá que seleccione al menos una. El botón **Mostrar todas las compañías** permite una consulta temporal de todo el histórico.

## 5. Funcionamiento de la bandera compartida

La bandera es un atributo global de cada noticia:

```text
news.is_flagged
news.flagged_at
news.flagged_by
```

El frontend no tiene permiso de actualización directa sobre `news`. Llama a:

```text
public.set_news_flag(news_id, estado)
```

La función solo cambia esos tres campos y registra el usuario que marcó la noticia. Si otro usuario quita la bandera, desaparece para todos. Realtime actualiza las sesiones abiertas; si Realtime no estuviera disponible, el estado seguirá siendo compartido al recargar.

## 6. Mantener grupos y entidades

El dashboard filtra el array existente `news.companies` utilizando `company_catalog.match_names`.

Ejemplo:

```text
AXA (group)
├── AXA España (entity)
├── AXA XL (entity)
└── AXA Vida (entity)
```

Seleccionar el grupo expande el filtro a todos sus descendientes. Seleccionar AXA XL filtra solo por sus nombres asociados.

`002_seed_company_catalog.sql` también añade como entidades sin clasificar todos los nombres históricos que no estén todavía en el catálogo. Puedes organizarlos después desde Supabase modificando `kind` y `parent_id`.

## 7. Seguridad resumida

| Recurso | Usuario no autenticado | Usuario autenticado | Apps Script / clave secreta |
|---|---:|---:|---:|
| Leer noticias | No | Sí | Sí |
| Insertar noticias | No | No | Sí |
| Cambiar cuerpo/título | No | No | Sí |
| Cambiar bandera | No | Sí, mediante RPC | Sí |
| Ver preferencias ajenas | No | No | Sí |
| Editar preferencias propias | No | Sí | Sí |

## 8. Diseño

Los mockups de referencia están en:

```text
docs/mockups/
```

La pantalla pública de login utiliza colores morados, pero no contiene logotipo ni referencias corporativas. El branding interno aparece solo después de validar la sesión.
