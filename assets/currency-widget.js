/* Fawran.tools — Embeddable Currency Rates Widget
   حقن هذا السكريبت + حاوية <div class="fawran-currency-widget"> في أي موقع
   لعرض جدول أسعار صرف حي يتحدث تلقائيًا، مصدره بيانات مجانية موثوقة ومحدّثة يوميًا. */
(function () {
  var CDN_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
  var FALLBACK_BASE = 'https://latest.currency-api.pages.dev/v1';

  var CURRENCY_NAMES = {
    usd: 'US Dollar', eur: 'Euro', gbp: 'British Pound', jpy: 'Japanese Yen', sar: 'Saudi Riyal',
    aed: 'UAE Dirham', egp: 'Egyptian Pound', kwd: 'Kuwaiti Dinar', qar: 'Qatari Riyal',
    bhd: 'Bahraini Dinar', omr: 'Omani Riyal', jod: 'Jordanian Dinar', try: 'Turkish Lira',
    cny: 'Chinese Yuan', inr: 'Indian Rupee', cad: 'Canadian Dollar', aud: 'Australian Dollar',
    chf: 'Swiss Franc', rub: 'Russian Ruble', mad: 'Moroccan Dirham', dzd: 'Algerian Dinar',
    tnd: 'Tunisian Dinar', lyd: 'Libyan Dinar', iqd: 'Iraqi Dinar', pkr: 'Pakistani Rupee',
    nzd: 'New Zealand Dollar', hkd: 'Hong Kong Dollar', zar: 'South African Rand',
    brl: 'Brazilian Real', mxn: 'Mexican Peso', ils: 'Israeli Shekel'
  };

  function nameFor(code, lang) {
    return CURRENCY_NAMES[code] || code.toUpperCase();
  }

  function fetchJSON(path) {
    return fetch(CDN_BASE + path)
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .catch(function () { return fetch(FALLBACK_BASE + path).then(function (r) { return r.json(); }); });
  }

  function buildStyles(theme, accent) {
    var isDark = theme === 'dark';
    return {
      wrap: 'font-family:-apple-system,Segoe UI,Tajawal,Arial,sans-serif;border-radius:14px;overflow:hidden;' +
            'border:1px solid ' + (isDark ? '#33314a' : '#e6e4f0') + ';max-width:420px;',
      header: 'background:' + accent + ';color:#fff;padding:14px 18px;font-weight:800;font-size:15px;text-align:center;',
      row: 'display:flex;justify-content:space-between;align-items:center;padding:11px 18px;' +
           'border-bottom:1px solid ' + (isDark ? '#282639' : '#eeecf7') + ';' +
           'background:' + (isDark ? '#1a1826' : '#fff') + ';color:' + (isDark ? '#e7e6f0' : '#1a1a2e') + ';font-size:14px;',
      code: 'font-weight:800;',
      value: 'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;direction:ltr;',
      footer: 'text-align:center;padding:8px;font-size:10.5px;' +
              'background:' + (isDark ? '#14131f' : '#faf9fd') + ';color:' + (isDark ? '#8b89a3' : '#8a8798') + ';'
    };
  }

  function renderWidget(container) {
    var base = (container.getAttribute('data-base') || 'usd').toLowerCase();
    var targets = (container.getAttribute('data-currencies') || 'eur,gbp,cad,jpy')
      .toLowerCase().split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var theme = container.getAttribute('data-theme') || 'light';
    var accent = container.getAttribute('data-accent') || '#4F3FF0';
    var lang = container.getAttribute('data-lang') || 'en';
    var isAr = lang === 'ar';
    var S = buildStyles(theme, accent);

    container.innerHTML =
      '<div style="' + S.wrap + '">' +
      '<div style="' + S.header + '">' + (isAr ? 'أسعار الصرف مقابل ' : 'Exchange rates vs ') + base.toUpperCase() + '</div>' +
      '<div data-fawran-rows></div>' +
      '<div style="' + S.footer + '">' + (isAr ? 'بيانات حية من' : 'Live data by') +
      ' <a href="https://fawran.tools/tools/currency-converter.html" target="_blank" rel="noopener" style="color:' + accent + ';text-decoration:none;font-weight:700;">Fawran.tools</a></div>' +
      '</div>';

    var rowsEl = container.querySelector('[data-fawran-rows]');
    rowsEl.innerHTML = targets.map(function () {
      return '<div style="' + S.row + '"><span>' + (isAr ? 'جارٍ التحميل...' : 'Loading...') + '</span></div>';
    }).join('');

    fetchJSON('/currencies/' + base + '.json').then(function (data) {
      var rates = data[base] || {};
      rowsEl.innerHTML = targets.map(function (code) {
        var rate = rates[code];
        var display = rate !== undefined ? Number(rate).toLocaleString('en', { maximumFractionDigits: 4 }) : '—';
        return '<div style="' + S.row + '">' +
               '<span style="' + S.code + '">' + code.toUpperCase() + '</span>' +
               '<span style="' + S.value + '">' + display + '</span>' +
               '</div>';
      }).join('');
    }).catch(function () {
      rowsEl.innerHTML = '<div style="' + S.row + '">' + (isAr ? 'تعذّر تحميل الأسعار حاليًا.' : 'Could not load rates right now.') + '</div>';
    });
  }

  function init() {
    var containers = document.querySelectorAll('.fawran-currency-widget');
    for (var i = 0; i < containers.length; i++) renderWidget(containers[i]);
  }

  // إتاحة دالة إعادة الرسم للاستخدام الخارجي (مثلًا صفحة منشئ الودجت للمعاينة الحية)
  window.FawranCurrencyWidgetRender = renderWidget;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
