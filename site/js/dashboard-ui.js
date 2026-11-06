(function dashboardUiRefinement() {
  'use strict';

  function isElement(node) {
    return node && node.nodeType === Node.ELEMENT_NODE;
  }

  function simplifyCompanyBadges(root) {
    root.querySelectorAll('.news-badges, .company-chips, .company-tree').forEach((container) => {
      container.querySelectorAll('[style]').forEach((element) => {
        if (
          element.classList.contains('news-company-badge') ||
          element.classList.contains('company-chip') ||
          element.classList.contains('company-option-name')
        ) {
          element.removeAttribute('style');
        }
      });
    });
  }

  function removeSingleSourceCount(card, sourceCount) {
    const badge = card.querySelector('.source-count-badge');
    if (badge && sourceCount === 1) badge.remove();
  }

  function removeDuplicateBdsName(container) {
    const badge = container.querySelector('.news-source-badge');
    const name = container.querySelector('.news-source-name');
    if (!badge || !name) return;
    if (
      badge.textContent.trim().toUpperCase() === 'BDS' &&
      name.textContent.trim().toUpperCase() === 'BDS'
    ) {
      name.remove();
    }
  }

  function collapseSourceDetails(container) {
    container.querySelectorAll('.news-source details, .news-single-source details').forEach((details) => {
      details.removeAttribute('open');
      const summary = details.querySelector('summary');
      detailsClone.removeAttribute('open');
      if (summary) summary.textContent = 'Ver cuerpo';
    });
  }

  function simplifySingleSource(card) {
    const sources = card.querySelectorAll('.news-source');
    if (sources.length !== 1 || card.dataset.singleSourceReady === 'true') return;

    removeSingleSourceCount(card, sources.length);

    const source = sources[0];
    const section = card.querySelector('.news-sources');
    if (!section) return;

    const header = source.querySelector('.news-source-header');
    const identity = source.querySelector('.news-source-identity');
    const date = source.querySelector('.news-source-date');
    const repost = source.querySelector('.news-source-repost');
    const details = source.querySelector('details');
    const link = source.querySelector('.news-source-actions');

    const simple = document.createElement('section');
    simple.className = 'news-single-source';
    simple.setAttribute('aria-label', 'Fuente de la noticia');

    const meta = document.createElement('div');
    meta.className = 'news-single-source-meta';

    if (identity) {
      removeDuplicateBdsName(identity);
      identity.querySelectorAll('.news-source-badge, .news-source-name, .news-source-type').forEach((element) => {
        const clone = element.cloneNode(true);
        clone.removeAttribute('style');
        meta.appendChild(clone);
      });
    }

    if (date) meta.appendChild(date.cloneNode(true));
    if (repost) meta.appendChild(repost.cloneNode(true));
    simple.appendChild(meta);

    if (details) {
      const detailsClone = details.cloneNode(true);
      const summary = detailsClone.querySelector('summary');
      detailsClone.removeAttribute('open');
      if (summary) summary.textContent = 'Ver cuerpo';
      simple.appendChild(detailsClone);
    } else if (link) {
      simple.appendChild(link.cloneNode(true));
    }

    section.replaceWith(simple);
    card.dataset.singleSourceReady = 'true';
  }

  function refine(root = document) {
    simplifyCompanyBadges(root);
    root.querySelectorAll('.news-card').forEach((card) => {
      const sourceCount = card.querySelectorAll('.news-source').length;
      removeSingleSourceCount(card, sourceCount);
      card.querySelectorAll('.news-source-identity').forEach(removeDuplicateBdsName);
      simplifySingleSource(card);
      collapseSourceDetails(card);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    refine();

    const target = document.querySelector('#app-shell') || document.body;
    const observer = new MutationObserver((mutations) => {
      let needsRefine = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (isElement(node)) needsRefine = true;
        });
      });
      if (needsRefine) window.requestAnimationFrame(() => refine(target));
    });

    observer.observe(target, { childList: true, subtree: true });
  });
})();
