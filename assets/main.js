// Fawran Tools — shared behavior
document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close menu when a link is tapped
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Live tool search on homepage
  const searchInput = document.querySelector('#toolSearch');
  const chips = document.querySelectorAll('.quick-chip');
  const cards = document.querySelectorAll('.tool-card');
  const categories = document.querySelectorAll('.category');

  function applyFilter(term, cat){
    term = (term || '').trim().toLowerCase();
    cards.forEach(card => {
      const name = card.dataset.name || '';
      const cardCat = card.dataset.cat || '';
      const matchesTerm = !term || name.includes(term);
      const matchesCat = !cat || cat === 'all' || cardCat === cat;
      card.style.display = (matchesTerm && matchesCat) ? '' : 'none';
    });
    categories.forEach(section => {
      const visible = section.querySelectorAll('.tool-card:not([style*="display: none"])').length;
      section.style.display = visible ? '' : 'none';
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const activeChip = document.querySelector('.quick-chip.active');
      applyFilter(searchInput.value, activeChip ? activeChip.dataset.cat : 'all');
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilter(searchInput ? searchInput.value : '', chip.dataset.cat);
    });
  });

  // Footer year
  const yearEl = document.querySelector('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme toggle (dark mode)
  const themeBtn = document.querySelector('#themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('fawran-theme', 'light'); } catch(e){}
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        try { localStorage.setItem('fawran-theme', 'dark'); } catch(e){}
      }
    });
  }

  // Adblock detector — shows a dismissible, non-blocking notice.
  // Uses a classic bait element pattern most blockers hide via CSS rules.
  const bait = document.createElement('div');
  bait.className = 'adsbox ad-banner ads ad-placement adsbygoogle';
  bait.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(bait);

  setTimeout(() => {
    const blocked = bait.offsetParent === null || bait.offsetHeight === 0 || getComputedStyle(bait).display === 'none';
    bait.remove();
    if (blocked && !sessionStorage.getItem('fawran-adblock-dismissed')) {
      const banner = document.createElement('div');
      banner.className = 'adblock-banner';
      banner.innerHTML = `
        <span class="icn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg></span>
        <span class="txt"><b>لاحظنا إنك تستخدم مانع إعلانات</b>موقعنا مجاني بالكامل ويعتمد على الإعلانات لتغطية تكاليفه — تعطيله يساعدنا نستمر.</span>
        <button class="close-btn" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg></button>
      `;
      document.body.appendChild(banner);
      requestAnimationFrame(() => banner.classList.add('show'));
      banner.querySelector('.close-btn').addEventListener('click', () => {
        banner.classList.remove('show');
        sessionStorage.setItem('fawran-adblock-dismissed', '1');
        setTimeout(() => banner.remove(), 400);
      });
    }
  }, 600);
});
