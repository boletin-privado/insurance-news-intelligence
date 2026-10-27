
(function dashboardPage() {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    user: null,
    preferences: null,
    catalog: [],
    catalogById: new Map(),
    savedDefaultIds: new Set(),
    selectedIds: new Set(),
    settingsSelectedIds: new Set(),
    filterDraftIds: new Set(),
    showAllCompanies: false,
    periodDays: Number(window.APP_CONFIG?.DEFAULT_PERIOD_DAYS || 30),
    sponsoredFilter: 'all',
    search: '',
    flaggedOnly: false,
    sort: 'desc',
    page: 1,
    pageSize: Number(window.APP_CONFIG?.DEFAULT_PAGE_SIZE || 25),
    total: 0,
    news: [],
    sponsorCount: 0,
    flaggedCount: 0,
    lastImportedAt: null,
    requestId: 0,
    realtimeChannel: null,
    reloadTimer: null,
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /*
   * HIPERVINCULOS:
   * Aceptamos solo URLs HTTP/HTTPS validas.
   * Nunca insertamos HTML original de los boletines.
   */
  function safeHttpUrl(value) {
    const raw = String(value || '').trim();
    if (!raw || !/^https?:\/\//i.test(raw)) return '';

    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) return '';
      if (!parsed.hostname) return '';
      if (parsed.username || parsed.password) return '';
      return parsed.href;
    } catch (_) {
      return '';
    }
  }

  function renderTitleHtml(title, titleUrl) {
    const text = escapeHtml(title || 'Sin título');
    const url = safeHttpUrl(titleUrl);

    if (!url) return text;

    return `<a class="news-title-link"
      href="${escapeHtml(url)}"
      target="_blank"
      rel="noopener noreferrer">${text}</a>`;
  }

  /*
   * Reconstruye el cuerpo a partir de fragmentos estructurados.
   *
   * Ejemplo:
   * [
   *   {text: "Más información en "},
   *   {text: "la web de AXA", url: "https://axa.com"},
   *   {text: "."}
   * ]
   *
   * Si no existen segmentos, muestra el cuerpo histórico
   * como texto plano, sin modificarlo.
   */
  function renderBodyHtml(segments, fallbackBody) {
    if (!Array.isArray(segments) || segments.length === 0) {
      return escapeHtml(fallbackBody || 'Sin cuerpo disponible.')
        .replace(/\n/g, '<br>');
    }

    const validSegments = segments.filter((segment) =>
      segment && typeof segment.text === 'string'
    );

    if (!validSegments.length) {
      return escapeHtml(fallbackBody || 'Sin cuerpo disponible.')
        .replace(/\n/g, '<br>');
    }

    // Comprobación de integridad: si los segmentos no representan
    // el cuerpo guardado, preferimos el texto original.
    const reconstructed = validSegments
      .map((segment) => segment.text)
      .join('');

    if (
      fallbackBody &&
      reconstructed.trim() !== String(fallbackBody).trim()
    ) {
      return escapeHtml(fallbackBody).replace(/\n/g, '<br>');
    }

    return validSegments.map((segment) => {
      const text = escapeHtml(segment.text).replace(/\n/g, '<br>');
      const url = safeHttpUrl(segment.url);

      if (!url) return text;

      return `<a class="news-inline-link"
        href="${escapeHtml(url)}"
        target="_blank"
        rel="noopener noreferrer">${text}</a>`;
    }).join('');
  }

  function normalizeSearch(value) {
    return String(value || '')
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140);
  }

  function formatDate(value, includeTime = false) {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha';

    const options = includeTime
      ? {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: window.APP_CONFIG.TIME_ZONE,
        }
      : {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: window.APP_CONFIG.TIME_ZONE,
        };

    return new Intl.DateTimeFormat('es-ES', options).format(date);
  }

  function formatDateParts(value) {
    const date = value ? new Date(value) : null;

    if (!date || Number.isNaN(date.getTime())) {
      return { day: '--', month: '---', year: '' };
    }

    const parts = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: window.APP_CONFIG.TIME_ZONE,
    }).formatToParts(date);

    const get = (type) =>
      parts.find((part) => part.type === type)?.value || '';

    return {
      day: get('day'),
      month: get('month').replace('.', '').toUpperCase(),
      year: get('year'),
    };
  }

  function notify(message, type = 'success') {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = `toast ${type} is-visible`;

    window.clearTimeout(toast._hideTimer);

    toast._hideTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3600);
  }

  function setLoading(isLoading, message = 'Cargando...') {
    const overlay = $('#loading-overlay');
    $('#loading-message').textContent = message;
    overlay.hidden = !isLoading;
    document.body.classList.toggle('is-busy', isLoading);
  }

  function showFatalError(message) {
    $('#fatal-error-message').textContent = message;
    $('#fatal-error').hidden = false;
    $('#app-shell').hidden = true;
  }

  async function requireSession() {
    const { data, error } = await window.sb.auth.getSession();
    if (error) throw error;

    if (!data.session) {
      window.location.replace(window.appUrl('index.html'));
      return false;
    }

    state.user = data.session.user;

    $$('.current-user-email').forEach((element) => {
      element.textContent = state.user.email || 'Usuario';
    });

    const initials = (state.user.email || 'U')
      .slice(0, 2)
      .toUpperCase();

    $$('.user-initials').forEach((element) => {
      element.textContent = initials;
    });

    return true;
  }

  async function loadCatalog() {
    const { data, error } = await window.sb
      .from('company_catalog')
      .select('id,name,slug,kind,parent_id,match_names,active,sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    state.catalog = data || [];
    state.catalogById = new Map(
      state.catalog.map((company) => [company.id, company])
    );
  }

  async function loadPreferences() {
    let { data: preference, error } = await window.sb
      .from('user_preferences')
      .select('*')
      .eq('user_id', state.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!preference) {
      const defaults = {
        user_id: state.user.id,
        default_period_days: Number(
          window.APP_CONFIG.DEFAULT_PERIOD_DAYS || 30
        ),
        show_sponsored: true,
        page_size: Number(
          window.APP_CONFIG.DEFAULT_PAGE_SIZE || 25
        ),
        onboarding_complete: false,
      };

      const result = await window.sb
        .from('user_preferences')
        .upsert(defaults)
        .select()
        .single();

      if (result.error) throw result.error;
      preference = result.data;
    }

    const linksResult = await window.sb
      .from('user_default_companies')
      .select('company_id')
      .eq('user_id', state.user.id);

    if (linksResult.error) throw linksResult.error;

    state.preferences = preference;
    state.savedDefaultIds = new Set(
      (linksResult.data || []).map((row) => row.company_id)
    );

    state.selectedIds = new Set(state.savedDefaultIds);
    state.settingsSelectedIds = new Set(state.savedDefaultIds);
    state.periodDays = Number(preference.default_period_days || 30);
    state.pageSize = Number(preference.page_size || 25);
    state.sponsoredFilter = preference.show_sponsored ? 'all' : 'no';
    state.showAllCompanies = false;
  }

  function descendantsOf(companyId) {
    const result = [];

    const visit = (parentId) => {
      state.catalog
        .filter((company) => company.parent_id === parentId)
        .forEach((company) => {
          result.push(company);
          visit(company.id);
        });
    };

    visit(companyId);
    return result;
  }

  function ancestorsOf(companyId) {
    const result = [];
    let current = state.catalogById.get(companyId);

    while (current?.parent_id) {
      const parent = state.catalogById.get(current.parent_id);
      if (!parent) break;

      result.push(parent);
      current = parent;
    }

    return result;
  }

  function updateSelection(targetSet, companyId, checked) {
    const company = state.catalogById.get(companyId);
    if (!company) return;

    if (!checked) {
      targetSet.delete(companyId);
      return;
    }

    if (company.kind === 'group') {
      descendantsOf(companyId).forEach((child) =>
        targetSet.delete(child.id)
      );
    } else {
      ancestorsOf(companyId).forEach((parent) =>
        targetSet.delete(parent.id)
      );
    }

    targetSet.add(companyId);
  }

  function selectedMatchNames(selectedIds) {
    const names = new Set();

    selectedIds.forEach((id) => {
      const company = state.catalogById.get(id);
      if (!company) return;

      const expanded = company.kind === 'group'
        ? [company, ...descendantsOf(id)]
        : [company];

      expanded.forEach((item) => {
        const aliases =
          Array.isArray(item.match_names) && item.match_names.length
            ? item.match_names
            : [item.name];

        aliases.forEach((alias) => {
          const clean = String(alias || '').trim();
          if (clean) names.add(clean);
        });
      });
    });

    return Array.from(names);
  }

  function renderCompanyTree(container, selectedIds, searchText = '') {
    const query = String(searchText || '')
      .trim()
      .toLocaleLowerCase('es');

    const groups = state.catalog.filter(
      (company) => company.kind === 'group'
    );

    const ungrouped = state.catalog.filter(
      (company) =>
        company.kind !== 'group' && !company.parent_id
    );

    const visible = (company) =>
      company.name.toLocaleLowerCase('es').includes(query);

    const groupHtml = groups.map((group) => {
      const children = state.catalog.filter(
        (company) => company.parent_id === group.id
      );

      const filteredChildren = query
        ? children.filter(visible)
        : children;

      if (
        query &&
        !visible(group) &&
        filteredChildren.length === 0
      ) {
        return '';
      }

      return `
        <section class="company-group">
          <label class="company-option company-option-group">
            <input type="checkbox"
              data-company-id="${escapeHtml(group.id)}"
              ${selectedIds.has(group.id) ? 'checked' : ''}>
            <span class="company-option-name">
              ${escapeHtml(group.name)}
            </span>
            <span class="company-kind">Grupo</span>
          </label>
          <div class="company-children">
            ${filteredChildren.map((child) => `
              <label class="company-option company-option-child">
                <input type="checkbox"
                  data-company-id="${escapeHtml(child.id)}"
                  ${selectedIds.has(child.id) ? 'checked' : ''}>
                <span class="company-option-name">
                  ${escapeHtml(child.name)}
                </span>
                <span class="company-kind">Entidad</span>
              </label>
            `).join('') ||
              '<p class="company-empty">Sin entidades configuradas.</p>'}
          </div>
        </section>
      `;
    }).join('');

    const ungroupedFiltered = query
      ? ungrouped.filter(visible)
      : ungrouped;

    const ungroupedHtml = ungroupedFiltered.length ? `
      <section class="company-group">
        <div class="company-section-label">Otras compañías</div>
        ${ungroupedFiltered.map((company) => `
          <label class="company-option">
            <input type="checkbox"
              data-company-id="${escapeHtml(company.id)}"
              ${selectedIds.has(company.id) ? 'checked' : ''}>
            <span class="company-option-name">
              ${escapeHtml(company.name)}
            </span>
            <span class="company-kind">Entidad</span>
          </label>
        `).join('')}
      </section>
    ` : '';

    container.innerHTML =
      groupHtml + ungroupedHtml ||
      '<p class="empty-inline">No se han encontrado compañías.</p>';
  }

  function renderSelectedCompanyChips() {
    const container = $('#selected-company-chips');

    if (state.showAllCompanies) {
      container.innerHTML =
        '<span class="company-chip company-chip-all">Todas las compañías</span>';
      return;
    }

    if (state.selectedIds.size === 0) {
      container.innerHTML =
        '<span class="filter-placeholder">Ninguna compañía seleccionada</span>';
      return;
    }

    container.innerHTML = Array.from(state.selectedIds)
      .map((id) => {
        const company = state.catalogById.get(id);
        if (!company) return '';

        return `
          <button type="button"
            class="company-chip"
            data-remove-company="${escapeHtml(id)}">
            ${escapeHtml(company.name)}
            <span aria-hidden="true">×</span>
          </button>
        `;
      })
      .join('');
  }

  function renderSettingsPreview() {
    const companies = Array.from(state.settingsSelectedIds)
      .map((id) => state.catalogById.get(id)?.name)
      .filter(Boolean);

    $('#settings-preview-companies').innerHTML = companies.length
      ? companies.map((name) =>
          `<span class="company-chip static">${escapeHtml(name)}</span>`
        ).join('')
      : '<span class="muted">Ninguna compañía. El dashboard no mostrará noticias al entrar.</span>';

    const periodValue = Number($('#settings-period').value || 30);

    $('#settings-preview-period').textContent =
      periodValue === 0
        ? 'Todo el histórico'
        : `Últimos ${periodValue} días`;

    $('#settings-preview-sponsored').textContent =
      $('#settings-sponsored').checked
        ? 'Mostrar todas'
        : 'Ocultar patrocinadas';

    $('#settings-preview-page-size').textContent =
      `${$('#settings-page-size').value} noticias`;
  }

  function syncSettingsControls() {
    $('#settings-period').value = String(
      state.preferences?.default_period_days || 30
    );

    $('#settings-sponsored').checked =
      Boolean(state.preferences?.show_sponsored);

    $('#settings-page-size').value = String(
      state.preferences?.page_size || 25
    );

    renderCompanyTree(
      $('#settings-company-tree'),
      state.settingsSelectedIds,
      $('#settings-company-search').value
    );

    renderSettingsPreview();
  }

  function setView(viewName) {
    const dashboardView = $('#dashboard-view');
    const settingsView = $('#settings-view');
    const dashboardActive = viewName === 'dashboard';

    dashboardView.hidden = !dashboardActive;
    settingsView.hidden = dashboardActive;

    $('#nav-dashboard').classList.toggle(
      'is-active',
      dashboardActive
    );

    $('#nav-settings').classList.toggle(
      'is-active',
      !dashboardActive
    );

    if (!dashboardActive) {
      state.settingsSelectedIds = new Set(state.savedDefaultIds);
      syncSettingsControls();
    }
  }

  function applyCommonFilters(query, options = {}) {
    const {
      applySponsoredFilter = true,
      applyFlagFilter = true,
      forceSponsored = null,
      forceFlagged = null,
    } = options;

    if (!state.showAllCompanies) {
      const matchNames = selectedMatchNames(state.selectedIds);

      if (matchNames.length) {
        query = query.overlaps('companies', matchNames);
      }
    }

    if (state.periodDays > 0) {
      const start = new Date();
      start.setDate(start.getDate() - state.periodDays);
      query = query.gte('email_date', start.toISOString());
    }

    const search = normalizeSearch(state.search);

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,body.ilike.%${search}%`
      );
    }

    if (forceSponsored !== null) {
      query = query.eq('sponsored', forceSponsored);
    } else if (
      applySponsoredFilter &&
      state.sponsoredFilter !== 'all'
    ) {
      query = query.eq(
        'sponsored',
        state.sponsoredFilter === 'yes'
      );
    }

    if (forceFlagged !== null) {
      query = query.eq('is_flagged', forceFlagged);
    } else if (applyFlagFilter && state.flaggedOnly) {
      query = query.eq('is_flagged', true);
    }

    return query;
  }

  async function countNews(options = {}) {
    let query = window.sb
      .from('news')
      .select('id', { count: 'exact', head: true });

    query = applyCommonFilters(query, options);

    const { count, error } = await query;
    if (error) throw error;

    return count || 0;
  }

  async function loadLastImportedAt() {
    const { data, error } = await window.sb
      .from('news')
      .select('imported_at')
      .order('imported_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error) {
      state.lastImportedAt = data?.imported_at || null;
    }
  }

  function renderMetrics() {
    $('#metric-total').textContent = String(state.total);

    $('#metric-companies').textContent =
      state.showAllCompanies
        ? 'Todas'
        : String(state.selectedIds.size);

    $('#metric-sponsored').textContent =
      String(state.sponsorCount);

    $('#metric-flagged').textContent =
      String(state.flaggedCount);

    $('#last-update').textContent = state.lastImportedAt
      ? `Última actualización: ${formatDate(state.lastImportedAt, true)}`
      : 'Sin datos de actualización';
  }

  function flagIconSvg(isFlagged) {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6 3v18M7 4h10l-2.2 4L17 12H7z"
          ${isFlagged ? 'fill="currentColor"' : 'fill="none"'}
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linejoin="round"
          stroke-linecap="round">
        </path>
      </svg>
    `;
  }

  function renderNews() {
    const list = $('#news-list');
    const empty = $('#news-empty');
    const pagination = $('#pagination');

    if (
      !state.showAllCompanies &&
      state.selectedIds.size === 0
    ) {
      list.innerHTML = '';
      empty.hidden = false;

      $('#empty-title').textContent =
        'Selecciona al menos una compañía';

      $('#empty-message').textContent =
        'Puedes elegir compañías temporalmente o guardarlas como predeterminadas en Mi configuración.';

      $('#empty-action').textContent =
        'Seleccionar compañías';

      $('#empty-action').dataset.emptyAction = 'select';
      pagination.hidden = true;
      return;
    }

    if (state.news.length === 0) {
      list.innerHTML = '';
      empty.hidden = false;

      $('#empty-title').textContent =
        'No hay noticias para estos filtros';

      $('#empty-message').textContent =
        'Prueba a ampliar el periodo, mostrar todas las compañías o quitar algún filtro.';

      $('#empty-action').textContent =
        'Restablecer mis filtros';

      $('#empty-action').dataset.emptyAction = 'reset';
      pagination.hidden = true;
      return;
    }

    empty.hidden = true;

    list.innerHTML = state.news.map((item) => {
      const dateParts = formatDateParts(item.email_date);
      const companies = Array.isArray(item.companies)
        ? item.companies
        : [];

      const flagged = Boolean(item.is_flagged);
      const body = String(item.body || '').trim() ||
        'Sin cuerpo disponible.';

      // NUEVO: titulo y cuerpo con enlaces.
      const titleUrl = safeHttpUrl(item.title_url);
      const titleHtml = renderTitleHtml(item.title, titleUrl);

      const bodyHtml = renderBodyHtml(
        item.body_segments,
        body
      );

      const originalLinkHtml = titleUrl
        ? `<div>
            <dt>Enlace</dt>
            <dd>
              <a href="${escapeHtml(titleUrl)}"
                 target="_blank"
                 rel="noopener noreferrer">
                Abrir noticia original
              </a>
            </dd>
          </div>`
        : '';

      return `
        <article
          class="news-card ${flagged ? 'is-flagged' : ''}"
          data-news-id="${escapeHtml(item.id)}">

          <div class="news-date"
               aria-label="Fecha ${escapeHtml(formatDate(item.email_date))}">
            <strong>${escapeHtml(dateParts.day)}</strong>
            <span>${escapeHtml(dateParts.month)}</span>
            <small>${escapeHtml(dateParts.year)}</small>
          </div>

          <div class="news-content">
            <div class="news-badges">
              ${companies.map((company) =>
                `<span class="news-company-badge">${escapeHtml(company)}</span>`
              ).join('')}
            </div>

            <h2>${titleHtml}</h2>

            <div class="news-disclosures">
              <details class="news-body-details">
                <summary>Ver cuerpo</summary>
                <div class="news-body-text">${bodyHtml}</div>
              </details>

              <details class="news-meta-details">
                <summary>Más información</summary>
                <dl>
                  <div>
                    <dt>Fuente</dt>
                    <dd>${escapeHtml(item.source || 'BDS')}</dd>
                  </div>

                  <div>
                    <dt>Número de noticia</dt>
                    <dd>${escapeHtml(item.news_number ?? '—')}</dd>
                  </div>

                  <div>
                    <dt>Fecha del boletín</dt>
                    <dd>${escapeHtml(formatDate(item.email_date, true))}</dd>
                  </div>

                  <div>
                    <dt>Importada</dt>
                    <dd>${escapeHtml(formatDate(item.imported_at, true))}</dd>
                  </div>

                  ${flagged && item.flagged_at ? `
                    <div>
                      <dt>Marcada</dt>
                      <dd>${escapeHtml(formatDate(item.flagged_at, true))}</dd>
                    </div>
                  ` : ''}

                  ${originalLinkHtml}
                </dl>
              </details>
            </div>
          </div>

          <div class="news-actions">
            <span class="sponsored-badge ${item.sponsored ? 'yes' : 'no'}">
              ${item.sponsored ? 'Patrocinada' : 'No patrocinada'}
            </span>

            <button
              type="button"
              class="flag-button ${flagged ? 'is-active' : ''}"
              data-action="toggle-flag"
              data-news-id="${escapeHtml(item.id)}"
              aria-pressed="${flagged}"
              aria-label="${flagged ? 'Quitar bandera' : 'Marcar con bandera'}"
              title="${flagged ? 'Quitar bandera compartida' : 'Marcar como importante para todos'}">
              ${flagIconSvg(flagged)}
            </button>
          </div>
        </article>
      `;
    }).join('');

    const totalPages = Math.max(
      1,
      Math.ceil(state.total / state.pageSize)
    );

    $('#page-label').textContent =
      `Página ${state.page} de ${totalPages}`;

    $('#prev-page').disabled = state.page <= 1;
    $('#next-page').disabled = state.page >= totalPages;
    pagination.hidden = totalPages <= 1;
  }

  async function loadNews() {
    const requestId = ++state.requestId;
    state.page = Math.max(1, state.page);

    renderSelectedCompanyChips();

    if (
      !state.showAllCompanies &&
      state.selectedIds.size === 0
    ) {
      state.total = 0;
      state.news = [];
      state.sponsorCount = 0;
      state.flaggedCount = 0;

      renderMetrics();
      renderNews();
      return;
    }

    setLoading(true, 'Consultando noticias...');

    try {
      const from = (state.page - 1) * state.pageSize;
      const to = from + state.pageSize - 1;

      let query = window.sb
        .from('news')
        .select(
          'id,email_date,news_number,companies,title,title_url,sponsored,body,body_segments,source,imported_at,is_flagged,flagged_at,flagged_by',
          { count: 'exact' }
        );

      query = applyCommonFilters(query);

      query = query
        .order('email_date', {
          ascending: state.sort === 'asc',
          nullsFirst: false,
        })
        .order('news_number', {
          ascending: true,
          nullsFirst: false,
        })
        .range(from, to);

      const [
        newsResult,
        sponsorCount,
        flaggedCount,
      ] = await Promise.all([
        query,
        countNews({
          applySponsoredFilter: false,
          applyFlagFilter: false,
          forceSponsored: true,
        }),
        countNews({
          applySponsoredFilter: false,
          applyFlagFilter: false,
          forceFlagged: true,
        }),
      ]);

      if (newsResult.error) throw newsResult.error;
      if (requestId !== state.requestId) return;

      state.news = newsResult.data || [];
      state.total = newsResult.count || 0;
      state.sponsorCount = sponsorCount;
      state.flaggedCount = flaggedCount;

      const totalPages = Math.max(
        1,
        Math.ceil(state.total / state.pageSize)
      );

      if (state.page > totalPages) {
        state.page = totalPages;
        await loadNews();
        return;
      }

      renderMetrics();
      renderNews();

      $('#results-heading').textContent =
        `${state.total} noticia${state.total === 1 ? '' : 's'}`;
    } catch (error) {
      console.error(error);

      notify(
        `No se han podido cargar las noticias: ${error.message || error}`,
        'error'
      );
    } finally {
      if (requestId === state.requestId) {
        setLoading(false);
      }
    }
  }

  function scheduleReload() {
    window.clearTimeout(state.reloadTimer);

    state.reloadTimer = window.setTimeout(
      () => loadNews(),
      450
    );
  }

  async function toggleFlag(newsId, button) {
    const item = state.news.find(
      (news) => news.id === newsId
    );

    if (!item) return;

    button.disabled = true;
    const nextValue = !item.is_flagged;

    try {
      const { data, error } = await window.sb.rpc(
        'set_news_flag',
        {
          p_news_id: newsId,
          p_is_flagged: nextValue,
        }
      );

      if (error) throw error;

      const updated = Array.isArray(data)
        ? data[0]
        : data;

      item.is_flagged =
        updated?.is_flagged ?? nextValue;

      item.flagged_at =
        updated?.flagged_at ??
        (nextValue ? new Date().toISOString() : null);

      item.flagged_by =
        updated?.flagged_by ??
        (nextValue ? state.user.id : null);

      notify(
        nextValue
          ? 'Noticia marcada para todos los usuarios.'
          : 'Bandera eliminada para todos los usuarios.'
      );

      if (state.flaggedOnly && !nextValue) {
        await loadNews();
      } else {
        renderNews();

        state.flaggedCount = Math.max(
          0,
          state.flaggedCount + (nextValue ? 1 : -1)
        );

        renderMetrics();
      }
    } catch (error) {
      console.error(error);

      notify(
        `No se ha podido cambiar la bandera: ${error.message || error}`,
        'error'
      );
    } finally {
      button.disabled = false;
    }
  }

  function subscribeToFlagChanges() {
    state.realtimeChannel = window.sb
      .channel('shared-news-flags')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'news',
        },
        (payload) => {
          if (
            !payload.new ||
            !Object.prototype.hasOwnProperty.call(
              payload.new,
              'is_flagged'
            )
          ) {
            return;
          }

          const item = state.news.find(
            (news) => news.id === payload.new.id
          );

          if (item) {
            item.is_flagged = payload.new.is_flagged;
            item.flagged_at = payload.new.flagged_at;
            item.flagged_by = payload.new.flagged_by;
            renderNews();
          }

          scheduleReload();
        }
      )
      .subscribe((status) => {
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT'
        ) {
          console.warn('Realtime flags:', status);
        }
      });
  }

  function openCompanyFilterDialog() {
    state.filterDraftIds = new Set(
      state.showAllCompanies ? [] : state.selectedIds
    );

    $('#filter-company-search').value = '';

    renderCompanyTree(
      $('#filter-company-tree'),
      state.filterDraftIds
    );

    $('#company-filter-dialog').showModal();
  }

  function closeCompanyFilterDialog() {
    $('#company-filter-dialog').close();
  }

  async function savePreferences() {
    const periodDays = Number(
      $('#settings-period').value || 30
    );

    const pageSize = Number(
      $('#settings-page-size').value || 25
    );

    const showSponsored =
      $('#settings-sponsored').checked;

    const selectedIds =
      Array.from(state.settingsSelectedIds);

    setLoading(true, 'Guardando configuración...');

    try {
      const prefResult = await window.sb
        .from('user_preferences')
        .upsert({
          user_id: state.user.id,
          default_period_days: periodDays,
          show_sponsored: showSponsored,
          page_size: pageSize,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (prefResult.error) throw prefResult.error;

      const deleteResult = await window.sb
        .from('user_default_companies')
        .delete()
        .eq('user_id', state.user.id);

      if (deleteResult.error) throw deleteResult.error;

      if (selectedIds.length) {
        const insertResult = await window.sb
          .from('user_default_companies')
          .insert(
            selectedIds.map((companyId) => ({
              user_id: state.user.id,
              company_id: companyId,
            }))
          );

        if (insertResult.error) throw insertResult.error;
      }

      state.preferences = prefResult.data;
      state.savedDefaultIds = new Set(selectedIds);
      state.selectedIds = new Set(selectedIds);
      state.showAllCompanies = false;
      state.periodDays = periodDays;
      state.pageSize = pageSize;
      state.sponsoredFilter =
        showSponsored ? 'all' : 'no';
      state.page = 1;

      $('#period-filter').value =
        String(state.periodDays);

      $('#sponsored-filter').value =
        state.sponsoredFilter;

      notify('Configuración guardada.');
      setView('dashboard');

      await loadNews();
    } catch (error) {
      console.error(error);

      notify(
        `No se ha podido guardar la configuración: ${error.message || error}`,
        'error'
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true, 'Cerrando sesión...');

    try {
      if (state.realtimeChannel) {
        await window.sb.removeChannel(
          state.realtimeChannel
        );
      }

      await window.sb.auth.signOut();
    } finally {
      window.location.replace(
        window.appUrl('index.html')
      );
    }
  }

  function resetTemporaryFilters() {
    state.selectedIds = new Set(state.savedDefaultIds);
    state.showAllCompanies = false;

    state.periodDays = Number(
      state.preferences?.default_period_days || 30
    );

    state.sponsoredFilter =
      state.preferences?.show_sponsored ? 'all' : 'no';

    state.pageSize = Number(
      state.preferences?.page_size || 25
    );

    state.search = '';
    state.flaggedOnly = false;
    state.sort = 'desc';
    state.page = 1;

    $('#period-filter').value =
      String(state.periodDays);

    $('#sponsored-filter').value =
      state.sponsoredFilter;

    $('#search-filter').value = '';
    $('#sort-filter').value = 'desc';

    $('#flagged-filter').classList.remove('is-active');
    $('#flagged-filter').setAttribute(
      'aria-pressed',
      'false'
    );

    renderSelectedCompanyChips();
    loadNews();
  }

  function attachEventHandlers() {
    $('#nav-dashboard').addEventListener(
      'click',
      () => setView('dashboard')
    );

    $('#nav-settings').addEventListener(
      'click',
      () => setView('settings')
    );

    $$('.logout-button').forEach((button) =>
      button.addEventListener('click', logout)
    );

    $('#add-company-filter').addEventListener(
      'click',
      openCompanyFilterDialog
    );

    $('#close-company-dialog').addEventListener(
      'click',
      closeCompanyFilterDialog
    );

    $('#cancel-company-filter').addEventListener(
      'click',
      closeCompanyFilterDialog
    );

    $('#apply-company-filter').addEventListener(
      'click',
      () => {
        state.selectedIds = new Set(
          state.filterDraftIds
        );

        state.showAllCompanies = false;
        state.page = 1;

        closeCompanyFilterDialog();
        renderSelectedCompanyChips();
        loadNews();
      }
    );

    $('#selected-company-chips').addEventListener(
      'click',
      (event) => {
        const button = event.target.closest(
          '[data-remove-company]'
        );

        if (!button) return;

        state.selectedIds.delete(
          button.dataset.removeCompany
        );

        state.showAllCompanies = false;
        state.page = 1;

        renderSelectedCompanyChips();
        loadNews();
      }
    );

    $('#filter-company-search').addEventListener(
      'input',
      (event) => {
        renderCompanyTree(
          $('#filter-company-tree'),
          state.filterDraftIds,
          event.target.value
        );
      }
    );

    $('#filter-company-tree').addEventListener(
      'change',
      (event) => {
        const input = event.target.closest(
          'input[data-company-id]'
        );

        if (!input) return;

        updateSelection(
          state.filterDraftIds,
          input.dataset.companyId,
          input.checked
        );

        renderCompanyTree(
          $('#filter-company-tree'),
          state.filterDraftIds,
          $('#filter-company-search').value
        );
      }
    );

    $('#settings-company-search').addEventListener(
      'input',
      (event) => {
        renderCompanyTree(
          $('#settings-company-tree'),
          state.settingsSelectedIds,
          event.target.value
        );
      }
    );

    $('#settings-company-tree').addEventListener(
      'change',
      (event) => {
        const input = event.target.closest(
          'input[data-company-id]'
        );

        if (!input) return;

        updateSelection(
          state.settingsSelectedIds,
          input.dataset.companyId,
          input.checked
        );

        renderCompanyTree(
          $('#settings-company-tree'),
          state.settingsSelectedIds,
          $('#settings-company-search').value
        );

        renderSettingsPreview();
      }
    );

    [
      'settings-period',
      'settings-sponsored',
      'settings-page-size',
    ].forEach((id) => {
      $(`#${id}`).addEventListener(
        'change',
        renderSettingsPreview
      );
    });

    $('#save-settings').addEventListener(
      'click',
      savePreferences
    );

    $('#period-filter').addEventListener(
      'change',
      (event) => {
        state.periodDays = Number(
          event.target.value || 30
        );

        state.page = 1;
        loadNews();
      }
    );

    $('#sponsored-filter').addEventListener(
      'change',
      (event) => {
        state.sponsoredFilter = event.target.value;
        state.page = 1;
        loadNews();
      }
    );

    let searchTimer;

    $('#search-filter').addEventListener(
      'input',
      (event) => {
        window.clearTimeout(searchTimer);

        searchTimer = window.setTimeout(() => {
          state.search = event.target.value;
          state.page = 1;
          loadNews();
        }, 350);
      }
    );

    $('#sort-filter').addEventListener(
      'change',
      (event) => {
        state.sort = event.target.value;
        state.page = 1;
        loadNews();
      }
    );

    $('#flagged-filter').addEventListener(
      'click',
      () => {
        state.flaggedOnly = !state.flaggedOnly;

        $('#flagged-filter').classList.toggle(
          'is-active',
          state.flaggedOnly
        );

        $('#flagged-filter').setAttribute(
          'aria-pressed',
          String(state.flaggedOnly)
        );

        state.page = 1;
        loadNews();
      }
    );

    $('#reset-filters').addEventListener(
      'click',
      resetTemporaryFilters
    );

    $('#show-all-companies').addEventListener(
      'click',
      () => {
        state.showAllCompanies = true;
        state.selectedIds.clear();
        state.page = 1;

        renderSelectedCompanyChips();
        loadNews();
      }
    );

    $('#news-list').addEventListener(
      'click',
      (event) => {
        const button = event.target.closest(
          '[data-action="toggle-flag"]'
        );

        if (!button) return;

        toggleFlag(
          button.dataset.newsId,
          button
        );
      }
    );

    $('#empty-action').addEventListener(
      'click',
      () => {
        if (
          $('#empty-action').dataset.emptyAction === 'select'
        ) {
          openCompanyFilterDialog();
        } else {
          resetTemporaryFilters();
        }
      }
    );

    $('#prev-page').addEventListener(
      'click',
      () => {
        if (state.page > 1) {
          state.page -= 1;
          loadNews();

          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }
      }
    );

    $('#next-page').addEventListener(
      'click',
      () => {
        const totalPages = Math.ceil(
          state.total / state.pageSize
        );

        if (state.page < totalPages) {
          state.page += 1;
          loadNews();

          window.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }
      }
    );

    window.sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.location.replace(
          window.appUrl('index.html')
        );
      }
    });
  }

  function populateFilterControls() {
    $('#period-filter').value =
      String(state.periodDays);

    $('#sponsored-filter').value =
      state.sponsoredFilter;

    $('#sort-filter').value =
      state.sort;

    renderSelectedCompanyChips();
  }

  async function initialize() {
    if (!window.APP_READY) {
      showFatalError(
        window.APP_CONFIG_ERROR ||
        'Configuración incompleta.'
      );

      return;
    }

    setLoading(true, 'Preparando el dashboard...');

    try {
      const hasSession = await requireSession();
      if (!hasSession) return;

      $('#app-shell').hidden = false;

      attachEventHandlers();

      await Promise.all([
        loadCatalog(),
        loadPreferences(),
        loadLastImportedAt(),
      ]);

      populateFilterControls();
      renderMetrics();
      subscribeToFlagChanges();

      if (!state.preferences.onboarding_complete) {
        setView('settings');

        notify(
          'Selecciona las compañías que quieres ver por defecto.',
          'info'
        );
      } else {
        setView('dashboard');
        await loadNews();
      }
    } catch (error) {
      console.error(error);

      showFatalError(
        `No se ha podido iniciar el dashboard. Comprueba que has ejecutado los SQL y configurado RLS. Detalle: ${error.message || error}`
      );
    } finally {
      setLoading(false);
    }
  }

  document.addEventListener(
    'DOMContentLoaded',
    initialize
  );
})();
