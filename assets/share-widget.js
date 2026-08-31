/* Fawran Tools — Lightweight social share widget
   لا يعتمد على أي مكتبة خارجية — كل الأيقونات SVG مرسومة يدويًا. */
document.addEventListener('DOMContentLoaded', () => {
  const widget = document.querySelector('.share-widget');
  if (!widget) return;

  const isEn = document.documentElement.lang === 'en';
  const pageUrl = window.location.href;
  const pageTitle = document.title.split('|')[0].trim();
  const encUrl = encodeURIComponent(pageUrl);
  const encTitle = encodeURIComponent(pageTitle);

  const L = isEn
    ? { label: 'Share', copy: 'Copy link', copied: 'Copied!', email: 'Email', print: 'Print', share: 'Share' }
    : { label: 'مشاركة', copy: 'نسخ الرابط', copied: 'تم النسخ!', email: 'إيميل', print: 'طباعة', share: 'مشاركة' };

  const ICONS = {
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.6c0-.9.3-1.6 1.7-1.6h1.5V3.1C16.4 3 15.3 3 14.1 3c-2.6 0-4.4 1.6-4.4 4.5V10H7v3.2h2.7V21z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4l7.2 9.1L4.4 20h1.9l6-6.4 4.5 6.4H21l-7.5-9.7L20 4h-1.9l-5.6 6L8.5 4z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="9" width="4" height="12"/><circle cx="5" cy="5" r="2.2"/><path d="M11 21V9h3.8v1.8c.6-1 1.9-2.1 3.9-2.1 3 0 4.3 2 4.3 5.3V21h-4v-6.3c0-1.6-.6-2.7-2-2.7-1.1 0-1.7.7-2 1.4-.1.3-.1.6-.1 1V21z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/><path d="M9.1 7.3c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.7 4.3 3.8.6.3 1.1.4 1.4.5.6.2 1.2.2 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .2-1.1-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.1-.3 0-.4.1-.6l.4-.5c.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3L2.9 11.8c-1.2.5-1.2 1.2-.2 1.5l4.9 1.5 1.9 5.8c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.1-2 4.3 3.2c.8.4 1.3.2 1.5-.7l2.8-13.5c.3-1.1-.4-1.6-1-1.6zM8.6 14.3l9.1-6.9c.4-.3.8-.1.5.2l-7.5 7-3 .3z"/></svg>',
    pinterest: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-1.7.2-2.5l1.4-6s-.3-.7-.3-1.7c0-1.6.9-2.8 2.1-2.8 1 0 1.5.7 1.5 1.6 0 1-.6 2.4-.9 3.8-.3 1.1.6 2.1 1.7 2.1 2.1 0 3.5-2.6 3.5-5.8 0-2.4-1.6-4.2-4.6-4.2-3.3 0-5.4 2.5-5.4 5.2 0 1 .3 1.6.7 2.2.2.2.2.3.1.6l-.3 1c-.1.3-.3.4-.6.3-1.6-.7-2.3-2.4-2.3-4.4 0-3.3 2.8-7.2 8.2-7.2 4.4 0 7.3 3.2 7.3 6.6 0 4.5-2.5 7.9-6.1 7.9-1.2 0-2.4-.7-2.7-1.4l-.8 3c-.3 1-.9 2.2-1.4 3a10 10 0 1 0 4.3-19z"/></svg>',
    reddit: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="13" r="8.5"/><circle cx="8.5" cy="13.5" r="1.3" fill="#fff"/><circle cx="15.5" cy="13.5" r="1.3" fill="#fff"/><path d="M8.5 17c1 .7 2.2 1 3.5 1s2.5-.3 3.5-1" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="18" cy="7.5" r="1.5"/><path d="M12 8L13 3l3.5 1" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>',
  };

  const BRAND_COLORS = {
    facebook:'#1877F2', x:'#000000', linkedin:'#0A66C2', whatsapp:'#25D366',
    telegram:'#26A5E4', pinterest:'#E60023', reddit:'#FF4500'
  };

  function shareUrl(network){
    switch(network){
      case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
      case 'x': return `https://twitter.com/intent/tweet?url=${encUrl}&text=${encTitle}`;
      case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`;
      case 'whatsapp': return `https://api.whatsapp.com/send?text=${encTitle}%20${encUrl}`;
      case 'telegram': return `https://t.me/share/url?url=${encUrl}&text=${encTitle}`;
      case 'pinterest': return `https://pinterest.com/pin/create/button/?url=${encUrl}&description=${encTitle}`;
      case 'reddit': return `https://reddit.com/submit?url=${encUrl}&title=${encTitle}`;
    }
    return '#';
  }

  function openPopup(url){
    window.open(url, 'share', 'width=600,height=500,noopener,noreferrer');
  }

  function makeBtn({icon, bg, title, onClick}){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'share-btn' + (bg ? '' : ' neutral');
    if (bg) btn.style.background = bg;
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.innerHTML = ICONS[icon] || '';
    btn.addEventListener('click', onClick);
    return btn;
  }

  const row = document.createElement('div');
  row.className = 'share-row';

  // نسخ الرابط
  row.appendChild(makeBtn({
    icon: 'copy', title: L.copy,
    onClick: async (e) => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        const btn = e.currentTarget;
        btn.classList.add('copied');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = ICONS.copy; }, 1800);
      } catch (err) {}
    }
  }));

  // مشاركة النظام (لو مدعومة على الجهاز)
  if (navigator.share) {
    row.appendChild(makeBtn({
      icon: 'share', bg: 'var(--indigo)', title: L.share,
      onClick: () => { navigator.share({ title: pageTitle, url: pageUrl }).catch(() => {}); }
    }));
  }

  // إيميل
  row.appendChild(makeBtn({
    icon: 'email', title: L.email,
    onClick: () => { window.location.href = `mailto:?subject=${encTitle}&body=${encUrl}`; }
  }));

  // طباعة
  row.appendChild(makeBtn({
    icon: 'print', title: L.print,
    onClick: () => window.print()
  }));

  // منصات التواصل
  ['facebook','x','linkedin','pinterest','reddit','whatsapp','telegram'].forEach(network => {
    row.appendChild(makeBtn({
      icon: network, bg: BRAND_COLORS[network], title: network.charAt(0).toUpperCase() + network.slice(1),
      onClick: () => openPopup(shareUrl(network))
    }));
  });

  const labelEl = document.createElement('div');
  labelEl.className = 'share-label';
  labelEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>' + L.label;

  widget.appendChild(labelEl);
  widget.appendChild(row);
});
