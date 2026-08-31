/* Fawran.tools — Prompt Library Engine
   يعرض حزم البرومبتات، يفلترها بالبحث والفئة، وينسخ/يحمّل كل برومبت أو الحزمة كاملة. */
(function () {
  const isEn = document.documentElement.lang === 'en';
  const LIB = (isEn ? window.PROMPT_LIBRARY_EN : window.PROMPT_LIBRARY_AR) || [];
  const L = isEn
    ? { copy: 'Copy', copied: 'Copied ✓', download: 'Download pack (.txt)', open: 'Open pack', close: 'Close', count: (n) => n + ' prompts', noResults: 'No prompts match your search.', all: 'All' }
    : { copy: 'نسخ', copied: 'تم النسخ ✓', download: 'تحميل الحزمة (.txt)', open: 'افتح الحزمة', close: 'إغلاق', count: (n) => n + ' برومبت', noResults: 'لا توجد برومبتات مطابقة لبحثك.', all: 'الكل' };

  const grid = document.getElementById('packGrid');
  const searchInput = document.getElementById('librarySearch');
  const chipsWrap = document.getElementById('categoryChips');
  const noResultsEl = document.getElementById('noResults');
  let activeCat = 'all';
  let openPackId = null;

  function escHtml(s) {
    return (s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function renderChips() {
    const cats = [{ id: 'all', icon: '📚', title: L.all }, ...LIB.map((p) => ({ id: p.id, icon: p.icon, title: p.title }))];
    chipsWrap.innerHTML = cats.map((c) => `<span class="lib-chip${c.id === activeCat ? ' active' : ''}" data-cat="${c.id}">${c.icon} ${escHtml(c.title)}</span>`).join('');
    chipsWrap.querySelectorAll('.lib-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        activeCat = chip.dataset.cat;
        renderChips();
        renderGrid();
      });
    });
  }

  function matchesSearch(pack, term) {
    if (!term) return true;
    const hay = (pack.title + ' ' + pack.desc + ' ' + pack.prompts.map((p) => p.title + ' ' + p.text).join(' ')).toLowerCase();
    return hay.includes(term);
  }

  function packToText(pack) {
    const header = `${pack.icon} ${pack.title}\n${'='.repeat(30)}\n\n`;
    const body = pack.prompts.map((p, i) => `${i + 1}. ${p.title}\n${'-'.repeat(20)}\n${p.text}\n`).join('\n');
    const footer = `\n\n— ${isEn ? 'Downloaded from' : 'تم التحميل من'} Fawran.tools`;
    return header + body + footer;
  }

  function downloadPack(pack) {
    const blob = new Blob([packToText(pack)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fawran-prompts-${pack.id}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function copyText(btn, text) {
    navigator.clipboard?.writeText(text).then(() => {
      const old = btn.textContent;
      btn.textContent = L.copied;
      setTimeout(() => (btn.textContent = old), 1500);
    });
  }

  function renderGrid() {
    const term = (searchInput.value || '').trim().toLowerCase();
    const packs = LIB.filter((p) => (activeCat === 'all' || p.id === activeCat) && matchesSearch(p, term));

    if (!packs.length) {
      grid.innerHTML = '';
      noResultsEl.style.display = 'block';
      return;
    }
    noResultsEl.style.display = 'none';

    grid.innerHTML = packs
      .map((pack) => {
        const isOpen = pack.id === openPackId;
        const promptsHtml = pack.prompts
          .map(
            (p, i) => `
          <div class="prompt-item">
            <div class="prompt-item-title">${i + 1}. ${escHtml(p.title)}</div>
            <div class="prompt-item-text">${escHtml(p.text)}</div>
            <button type="button" class="btn btn-ghost prompt-copy-btn" data-pack="${pack.id}" data-idx="${i}">📋 ${L.copy}</button>
          </div>`
          )
          .join('');
        return `
        <div class="pack-card${isOpen ? ' open' : ''}" data-pack-id="${pack.id}">
          <div class="pack-card-head" data-toggle="${pack.id}">
            <div class="pack-card-icon">${pack.icon}</div>
            <div class="pack-card-body">
              <div class="pack-card-title">${escHtml(pack.title)}</div>
              <div class="pack-card-desc">${escHtml(pack.desc)}</div>
              <div class="pack-card-count">${L.count(pack.prompts.length)}</div>
            </div>
            <div class="pack-card-arrow">${isOpen ? '▴' : '▾'}</div>
          </div>
          <div class="pack-card-expand" style="${isOpen ? '' : 'display:none;'}">
            ${promptsHtml}
            <button type="button" class="btn btn-primary pack-download-btn" data-pack="${pack.id}" style="width:100%;margin-top:8px;">⬇️ ${L.download}</button>
          </div>
        </div>`;
      })
      .join('');
  }

  grid.addEventListener('click', (e) => {
    const toggleEl = e.target.closest('[data-toggle]');
    if (toggleEl) {
      const id = toggleEl.dataset.toggle;
      openPackId = openPackId === id ? null : id;
      renderGrid();
      return;
    }
    const copyBtn = e.target.closest('.prompt-copy-btn');
    if (copyBtn) {
      const pack = LIB.find((p) => p.id === copyBtn.dataset.pack);
      const prompt = pack?.prompts[+copyBtn.dataset.idx];
      if (prompt) copyText(copyBtn, prompt.text);
      return;
    }
    const dlBtn = e.target.closest('.pack-download-btn');
    if (dlBtn) {
      const pack = LIB.find((p) => p.id === dlBtn.dataset.pack);
      if (pack) downloadPack(pack);
    }
  });

  searchInput.addEventListener('input', renderGrid);

  renderChips();
  renderGrid();
})();
