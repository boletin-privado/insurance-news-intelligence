
/*
 * RADAR BDS - COLORES CORPORATIVOS
 *
 * Fuente: Supabase_companias_colores_rellenado.xlsx
 *
 * Columna G: fondo de la etiqueta
 * Columna H: borde de la etiqueta
 *
 * No modifica datos de Supabase.
 * No afecta a los filtros ni a los hipervinculos.
 */

(function companyColorsModule() {
  'use strict';

  // [Nombre de la compañía, color primario, color secundario]
  const COMPANY_PALETTES = [
    ['A.M.A.', '#005092', '#FFCC00'],
    ['Aegon', '#0069B4', '#1F355E'],
    ['Agroseguro', '#599AD7', '#EBB773'],
    ['AIG', '#0057B8', '#002254'],
    ['Allianz', '#003781', '#00A2E1'],
    ['Allianz Commercial', '#003781', '#00A2E1'],
    ['Amundi', '#009FE3', '#001C4B'],
    ['Aon', '#EB0217', '#252836'],
    ['ARAG', '#FFD500', '#000000'],
    ['Asisa', '#FF5400', '#0E2B55'],
    ['ATL', '#0B2D4D', '#E3A74F'],
    ['Atradius', '#CA8A4D', '#89031B'],
    ['Aviva', '#FFD902', '#191D64'],
    ['AXA', '#00008F', '#F07662'],
    ['AXA España', '#00008F', '#F07662'],
    ['AXA Vida', '#00008F', '#F07662'],
    ['AXA XL', '#00008F', '#F07662'],
    ['AXA Investment Managers', '#00008F', '#F07662'],
    ['AXA Partners', '#00008F', '#F07662'],
    ['BBVA Seguros', '#004481', '#072146'],
    ['Berkley', '#00563F', '#000000'],
    ['Caser', '#9F1717', '#010004'],
    ['Cesce', '#1C4CDE', '#721C24'],
    ['Chubb', '#6E27C5', '#212529'],
    ['Coface', '#61B57D', '#02365E'],
    ['Confluence Group', '#1C355E', '#00A6A6'],
    ['Consorcio de Compensación de Seguros', '#00529B', '#D6A800'],
    ['Crédit Mutuel', '#E30613', '#0050A4'],
    ['Crédito y Caución', '#DC0028', '#6E0014'],
    ['DKV', '#BC2E2E', '#5B6519'],
    ['DKV Seguros', '#BC2E2E', '#5B6519'],
    ['Eiopa', '#003399', '#FFCC00'],
    ['Empresas implicadas', '#6B7280', '#D1D5DB'],
    ['FIATC', '#00529B', '#D71920'],
    ['Finsa Grupo', '#00ADEF', '#003378'],
    ['Gallagher', '#00263E', '#F0B323'],
    ['García-Ochoa', '#003B71', '#E87722'],
    ['Generali', '#C21B17', '#000000'],
    ['Gómez Arroyo', '#234F8C', '#E99A26'],
    ['Grupo Catalana Occidente', '#DC0028', '#6E0014'],
    ['Occident', '#DC0028', '#6E0014'],
    ['Plus Ultra Seguros', '#DC0028', '#6E0014'],
    ['Seguros Bilbao', '#DC0028', '#6E0014'],
    ['Grupo Mutua Madrileña', '#2A9DDE', '#999999'],
    ['Hannover Re', '#003C70', '#0077D4'],
    ['HDI', '#65A518', '#151515'],
    ['Helvetia', '#9F1717', '#010004'],
    ['Hiscox', '#E2231A', '#313131'],
    ['Howden', '#8D741E', '#3D3D3D'],
    ['Ibercaja Seguros', '#0062AD', '#781720'],
    ['Insurance Europe', '#002957', '#000000'],
    ['Lagun Aro', '#009EE2', '#95C11F'],
    ['Liberty Specialty Markets', '#3A7E83', '#012A6B'],
    ['Línea Directa', '#CC3433', '#721C24'],
    ['Línea Directa Aseguradora', '#CC3433', '#721C24'],
    ['Macif', '#CBE300', '#051D54'],
    ['Mapfre', '#FF002D', '#1A1A1A'],
    ['Markel', '#FF4E00', '#212121'],
    ['Marsh', '#002C77', '#1B222F'],
    ['MetLife', '#0061A0', '#A4CE4E'],
    ['MGS', '#FF8500', '#003082'],
    ['Movistar Prosegur Alarmas', '#FFD102', '#9C8621'],
    ['Munich Re', '#3350B8', '#0F1E32'],
    ['Musaat', '#B0006D', '#4A4A4A'],
    ['Mutua de Propietarios', '#CD9880', '#020101'],
    ['Mutua Madrileña', '#2A9DDE', '#999999'],
    ['Nationale-Nederlanden', '#EE7F00', '#414141'],
    ['Nisteo Consultores', '#13294B', '#00A6A6'],
    ['Ocaso', '#FFD15A', '#003396'],
    ['Parité Assurance', '#C2185B', '#542344'],
    ['Pelayo', '#32A8E6', '#002752'],
    ['Preventiva Seguros', '#012169', '#A2DBF9'],
    ['Prévoir', '#003B70', '#F2A900'],
    ['Prima Seguros', '#6C2BD9', '#B7FF00'],
    ['PSN', '#007A53', '#003B5C'],
    ['QBE', '#0064C1', '#00AEEF'],
    ['Reale', '#004B9C', '#000000'],
    ['Revo Insurance', '#D6964A', '#6BBAEF'],
    ['Sanitas', '#0079C8', '#0D1846'],
    ['Santalucía', '#66C3FF', '#00257A'],
    ['Santander', '#EA1D25', '#000000'],
    ['Santander Seguros', '#EA1D25', '#000000'],
    ['SCOR', '#006A8D', '#000000'],
    ['SegurCaixa Adeslas', '#0F77AE', '#333333'],
    ['Société Générale Assurances', '#E9041E', '#000000'],
    ['Solunion', '#F28C28', '#003B70']
  ];

  /*
   * Normaliza nombres para que diferencias de mayúsculas,
   * tildes y signos no impidan encontrar un color.
   */
  function normalizeCompanyName(name) {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /*
   * Equivalencias adicionales para nombres habituales
   * que pueden venir del boletín o del catálogo.
   */
  const FAMILY_ALIASES = new Map([
    ['axa assistance', 'AXA'],
    ['axa seguros', 'AXA'],
    ['grupo axa', 'AXA'],
    ['helvetia seguros', 'Helvetia'],
    ['helvetia caser', 'Helvetia'],
    ['seguros ocaso', 'Ocaso'],
    ['linea directa aseguradora sa', 'Línea Directa'],
    ['grupo mutua', 'Grupo Mutua Madrileña'],
    ['catalana occidente', 'Grupo Catalana Occidente'],
    ['gco', 'Grupo Catalana Occidente'],
    ['adeslas', 'SegurCaixa Adeslas']
  ]);

  const paletteMap = new Map();

  COMPANY_PALETTES.forEach(function (row) {
    const name = row[0];
    const primary = row[1];
    const secondary = row[2];

    // Solo admitimos códigos HEX RGB completos.
    const validHex = /^#[0-9A-Fa-f]{6}$/;

    if (!validHex.test(primary) || !validHex.test(secondary)) {
      console.warn('Colores HEX no válidos para:', name);
      return;
    }

    paletteMap.set(normalizeCompanyName(name), {
      primary: primary,
      secondary: secondary
    });
  });

  /*
   * Recupera los dos colores de una compañía.
   * No utiliza consultas de red.
   */
  function getColors(name) {
    const normalized = normalizeCompanyName(name);
    const equivalent = FAMILY_ALIASES.get(normalized);
    const key = normalizeCompanyName(equivalent || name);

    return paletteMap.get(key) || null;
  }

  /*
   * Calcula el contraste para seleccionar texto negro o blanco.
   * No modifica los colores corporativos.
   */
  function relativeLuminance(hex) {
    const channels = [1, 3, 5].map(function (index) {
      const value = parseInt(hex.slice(index, index + 2), 16) / 255;

      return value <= 0.04045
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });

    return (
      0.2126 * channels[0] +
      0.7152 * channels[1] +
      0.0722 * channels[2]
    );
  }

  function getTextColor(backgroundHex) {
    const luminance = relativeLuminance(backgroundHex);

    const contrastBlack = (luminance + 0.05) / 0.05;
    const contrastWhite = 1.05 / (luminance + 0.05);

    return contrastBlack >= contrastWhite
      ? '#000000'
      : '#FFFFFF';
  }

  /*
   * Da color a las etiquetas ya generadas por dashboard.js.
   *
   * Se aplica a:
   * - Compañías de las noticias.
   * - Compañías seleccionadas en el filtro.
   * - Nombres de compañías del buscador.
   * - Vista previa de configuración personal.
   */
  function paint(root) {
    const container = root || document;

    if (!container || !container.querySelectorAll) {
      return;
    }

    const elements = container.querySelectorAll(
      '.news-company-badge, ' +
      '.company-chip:not(.company-chip-all), ' +
      '.company-option-name'
    );

    elements.forEach(function (element) {
      // Las etiquetas seleccionables incluyen una "×" final.
      const name = String(element.textContent || '')
        .replace(/\s*×\s*$/, '')
        .trim();

      const colors = getColors(name);

      if (!colors) {
        // Si no existe una paleta, permanece el estilo normal.
        return;
      }

      element.style.setProperty(
        '--company-primary',
        colors.primary
      );

      element.style.setProperty(
        '--company-secondary',
        colors.secondary
      );

      element.style.setProperty(
        '--company-text',
        getTextColor(colors.primary)
      );

      element.setAttribute('data-brand-colored', 'true');
    });
  }

  window.COMPANY_COLORS = Object.freeze({
    paint: paint,
    getColors: getColors,
    getTextColor: getTextColor,
    count: paletteMap.size
  });
})();
