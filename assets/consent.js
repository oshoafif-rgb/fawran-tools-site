/* Fawran Tools — consent controls and Google Consent Mode v2 */
(() => {
  'use strict';

  const STORAGE_KEY = 'fawran-consent-v1';
  const script = document.currentScript;
  const measurementId = script?.dataset.measurementId || 'G-JSG9KGPK0S';
  const isEn = document.documentElement.lang === 'en';
  const L = isEn ? {
    title: 'Your privacy choices',
    text: 'We use essential browser storage to run the site. With your permission, Google Analytics helps us understand usage, and advertising storage may support future ads. You can change your choice at any time.',
    accept: 'Accept all', reject: 'Reject non-essential', customize: 'Customize',
    settings: 'Privacy settings', modalTitle: 'Customize privacy choices',
    analytics: 'Analytics', analyticsHelp: 'Helps us measure visits and improve the tools.',
    ads: 'Advertising', adsHelp: 'Allows advertising storage and personalized-ad signals where legally permitted.',
    necessary: 'Essential storage', necessaryHelp: 'Required for theme, favorites, security, and your consent choice. Always active.',
    save: 'Save choices', close: 'Close', policy: 'Privacy Policy'
  } : {
    title: 'خيارات الخصوصية',
    text: 'نستخدم التخزين الضروري لتشغيل الموقع. وبموافقتك، تساعدنا إحصاءات Google Analytics على فهم الاستخدام، وقد يُستخدم تخزين الإعلانات لدعم الإعلانات مستقبلًا. يمكنك تغيير اختيارك في أي وقت.',
    accept: 'قبول الكل', reject: 'رفض غير الضروري', customize: 'تخصيص',
    settings: 'إعدادات الخصوصية', modalTitle: 'تخصيص خيارات الخصوصية',
    analytics: 'التحليلات', analyticsHelp: 'تساعدنا على قياس الزيارات وتحسين الأدوات.',
    ads: 'الإعلانات', adsHelp: 'يسمح بتخزين الإعلانات وإشارات تخصيصها حيثما يسمح القانون.',
    necessary: 'التخزين الضروري', necessaryHelp: 'مطلوب للوضع الليلي والمفضلة والأمان وحفظ اختيارك. نشط دائمًا.',
    save: 'حفظ الاختيارات', close: 'إغلاق', policy: 'سياسة الخصوصية'
  };

  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (value && typeof value.analytics === 'boolean' && typeof value.ads === 'boolean') return value;
    } catch (_) {}
    return null;
  }

  function consentPayload(choice) {
    const analytics = choice?.analytics ? 'granted' : 'denied';
    const ads = choice?.ads ? 'granted' : 'denied';
    return {
      analytics_storage: analytics,
      ad_storage: ads,
      ad_user_data: ads,
      ad_personalization: ads,
      personalization_storage: ads,
      functionality_storage: 'granted',
      security_storage: 'granted'
    };
  }

  let analyticsRequested = false;

  function loadAnalytics(choice) {
    // Basic Consent Mode: do not request Analytics at all before opt-in.
    if (!choice?.analytics || analyticsRequested) return;
    analyticsRequested = true;
    const ga = document.createElement('script');
    ga.async = true;
    ga.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    ga.onload = () => {
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        anonymize_ip: true,
        allow_google_signals: Boolean(choice.ads)
      });
    };
    ga.onerror = () => { analyticsRequested = false; };
    document.head.appendChild(ga);
  }

  function applyChoice(choice, persist = true) {
    window.gtag?.('consent', 'update', consentPayload(choice));
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          analytics: Boolean(choice.analytics),
          ads: Boolean(choice.ads),
          updatedAt: new Date().toISOString()
        }));
      } catch (_) {}
    }
    loadAnalytics(choice);
    window.dispatchEvent(new CustomEvent('fawran:consent', { detail: choice }));
  }

  const saved = readChoice();
  if (saved) applyChoice(saved, false);

  function privacyUrl() {
    const depth = location.pathname.split('/').filter(Boolean).length;
    if (isEn) return '/en/privacy';
    return '/privacy';
  }

  function button(label, className, handler) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = label;
    el.addEventListener('click', handler);
    return el;
  }

  function closeBanner() {
    document.querySelector('.consent-banner')?.remove();
  }

  function save(choice) {
    applyChoice(choice);
    closeBanner();
    document.querySelector('.consent-modal-backdrop')?.remove();
  }

  function openModal() {
    document.querySelector('.consent-modal-backdrop')?.remove();
    const current = readChoice() || { analytics: false, ads: false };
    const backdrop = document.createElement('div');
    backdrop.className = 'consent-modal-backdrop';
    const modal = document.createElement('div');
    modal.className = 'consent-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'consentModalTitle');

    const heading = document.createElement('h2');
    heading.id = 'consentModalTitle';
    heading.textContent = L.modalTitle;
    modal.appendChild(heading);

    const rows = [
      { key: 'necessary', label: L.necessary, help: L.necessaryHelp, checked: true, disabled: true },
      { key: 'analytics', label: L.analytics, help: L.analyticsHelp, checked: current.analytics },
      { key: 'ads', label: L.ads, help: L.adsHelp, checked: current.ads }
    ];
    rows.forEach(row => {
      const label = document.createElement('label');
      label.className = 'consent-option';
      const text = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = row.label;
      const small = document.createElement('small');
      small.textContent = row.help;
      text.append(strong, small);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.consent = row.key;
      input.checked = row.checked;
      input.disabled = Boolean(row.disabled);
      label.append(text, input);
      modal.appendChild(label);
    });

    const policy = document.createElement('a');
    policy.href = privacyUrl();
    policy.className = 'consent-policy-link';
    policy.textContent = L.policy;
    modal.appendChild(policy);

    const actions = document.createElement('div');
    actions.className = 'consent-actions';
    actions.append(
      button(L.save, 'btn btn-primary', () => save({
        analytics: modal.querySelector('[data-consent="analytics"]').checked,
        ads: modal.querySelector('[data-consent="ads"]').checked
      })),
      button(L.close, 'btn btn-ghost', () => backdrop.remove())
    );
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    backdrop.addEventListener('click', event => { if (event.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    modal.querySelector('button')?.focus();
  }

  function showBanner() {
    if (readChoice() || document.querySelector('.consent-banner')) return;
    const banner = document.createElement('section');
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', L.title);
    const copy = document.createElement('div');
    copy.className = 'consent-copy';
    const title = document.createElement('strong');
    title.textContent = L.title;
    const text = document.createElement('p');
    text.textContent = L.text;
    const policy = document.createElement('a');
    policy.href = privacyUrl();
    policy.textContent = L.policy;
    copy.append(title, text, policy);
    const actions = document.createElement('div');
    actions.className = 'consent-actions';
    actions.append(
      button(L.accept, 'btn btn-primary', () => save({ analytics: true, ads: true })),
      button(L.reject, 'btn btn-dark', () => save({ analytics: false, ads: false })),
      button(L.customize, 'btn btn-ghost', openModal)
    );
    banner.append(copy, actions);
    document.body.appendChild(banner);
  }

  function addSettingsButton() {
    if (document.querySelector('.consent-settings-btn')) return;
    const settings = button(L.settings, 'consent-settings-btn', openModal);
    document.body.appendChild(settings);
  }

  const init = () => { addSettingsButton(); showBanner(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
