/* Fawran Tools — global UX layer */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const path = location.pathname;
  const isEn = document.documentElement.lang === 'en';
  const labels = isEn ? {fav:'Add to favorites', favOn:'Remove from favorites', recent:'Recently used', favorites:'Favorites', copy:'Copy', copied:'Copied'} : {fav:'إضافة للمفضلة',favOn:'إزالة من المفضلة',recent:'استخدمتها مؤخرًا',favorites:'المفضلة',copy:'نسخ',copied:'تم النسخ'};

  // Mobile navigation
  const toggle = $('.nav-toggle'), nav = $('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => { const open=nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
    $$('.nav a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');}));
  }

  // Theme
  const themeBtn=$('#themeToggle');
  if(themeBtn) themeBtn.addEventListener('click',()=>{
    const dark=document.documentElement.getAttribute('data-theme')==='dark';
    if(dark){document.documentElement.removeAttribute('data-theme');}
    else{document.documentElement.setAttribute('data-theme','dark');}
    try{localStorage.setItem('fawran-theme',dark?'light':'dark')}catch(e){}
  });

  // Search with aliases / keywords
  const TOOLS_INDEX = (isEn ? window.TOOLS_INDEX_EN : window.TOOLS_INDEX_AR) || [];
  const CAT_LABELS_AR = {images:'الصور',pdf:'PDF',developer:'المطورين',text:'النصوص',seo:'SEO',youtube:'يوتيوب',websites:'المواقع'};
  const CAT_LABELS_EN = {images:'Images',pdf:'PDF',developer:'Developer',text:'Text',seo:'SEO',youtube:'YouTube',websites:'Website'};
  const catLabel = c => (isEn ? CAT_LABELS_EN : CAT_LABELS_AR)[c] || c;
  const escHtml = s => (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const searchInput=$('#toolSearch'), chips=$$('.quick-chip'), cards=$$('.tool-card'), categories=$$('.category');
  function applyFilter(term,cat){
    term=(term||'').trim().toLowerCase();
    cards.forEach(card=>{
      const hay=(card.dataset.name||'')+' '+(card.dataset.keywords||'')+' '+card.textContent;
      const ok=(!term||hay.toLowerCase().includes(term))&&(!cat||cat==='all'||card.dataset.cat===cat);
      card.style.display=ok?'':'none';
    });
    categories.forEach(sec=>{sec.style.display=sec.querySelector('.tool-card:not([style*="display: none"])')?'':'none';});
  }
  chips.forEach(chip=>chip.addEventListener('click',()=>{chips.forEach(c=>c.classList.remove('active'));chip.classList.add('active');applyFilter(searchInput?.value||'',chip.dataset.cat);runSearchDropdown();}));

  // Real site-wide search: a live dropdown backed by the full tools index (works regardless of what's rendered on the current page).
  let searchResults=null, searchActiveIndex=-1;
  function ensureDropdown(){
    if(searchResults) return searchResults;
    searchResults=document.createElement('div');
    searchResults.className='search-results';
    searchResults.setAttribute('role','listbox');
    searchInput.parentElement.style.position='relative';
    searchInput.parentElement.appendChild(searchResults);
    return searchResults;
  }
  function closeDropdown(){ if(searchResults){searchResults.remove(); searchResults=null;} searchActiveIndex=-1; searchInput?.setAttribute('aria-expanded','false'); }
  function scoreMatch(tool, term){
    const title=tool.title.toLowerCase(), desc=(tool.desc||'').toLowerCase(), slug=tool.slug.toLowerCase();
    if(title.startsWith(term)) return 3;
    if(title.includes(term)) return 2;
    if(slug.includes(term)||desc.includes(term)) return 1;
    return 0;
  }
  function runSearchDropdown(){
    if(!searchInput) return;
    const term=searchInput.value.trim().toLowerCase();
    const activeCat=$('.quick-chip.active')?.dataset.cat||'all';
    if(!term){ closeDropdown(); return; }
    let matches=TOOLS_INDEX
      .filter(t=> activeCat==='all'||t.cat===activeCat)
      .map(t=>({t,score:scoreMatch(t,term)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,8)
      .map(x=>x.t);

    const dd=ensureDropdown();
    searchActiveIndex=-1;
    searchInput.setAttribute('aria-expanded','true');
    if(!matches.length){
      dd.innerHTML=`<div class="search-empty">${isEn?'No tools found for':'لا توجد نتائج لـ'} "${escHtml(searchInput.value.trim())}"</div>`;
      return;
    }
    const base = path.includes('/tools/') ? '' : 'tools/';
    dd.innerHTML = matches.map((t,i)=>`
      <a class="search-result" href="${base}${t.slug}" role="option" data-idx="${i}">
        <span class="sr-cat">${escHtml(catLabel(t.cat))}</span>
        <span class="sr-body"><span class="sr-title">${escHtml(t.title)}</span><span class="sr-desc">${escHtml(t.desc)}</span></span>
      </a>`).join('');
  }
  function moveActive(delta){
    if(!searchResults) return;
    const items=$$('.search-result',searchResults);
    if(!items.length) return;
    searchActiveIndex=(searchActiveIndex+delta+items.length)%items.length;
    items.forEach((el,i)=>el.classList.toggle('active',i===searchActiveIndex));
    items[searchActiveIndex].scrollIntoView({block:'nearest'});
  }
  if(searchInput){
    searchInput.setAttribute('autocomplete','off');
    searchInput.setAttribute('role','combobox');
    searchInput.setAttribute('aria-expanded','false');
    searchInput.addEventListener('input',()=>{ applyFilter(searchInput.value,$('.quick-chip.active')?.dataset.cat||'all'); runSearchDropdown(); });
    searchInput.addEventListener('focus',()=>{ if(searchInput.value.trim()) runSearchDropdown(); });
    searchInput.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){e.preventDefault();moveActive(1);}
      else if(e.key==='ArrowUp'){e.preventDefault();moveActive(-1);}
      else if(e.key==='Enter'){ if(searchActiveIndex>-1){ const items=$$('.search-result',searchResults||document.createElement('div')); items[searchActiveIndex]?.click(); } }
      else if(e.key==='Escape'){ closeDropdown(); searchInput.blur(); }
    });
    document.addEventListener('click',e=>{ if(searchResults && !searchInput.contains(e.target) && !searchResults.contains(e.target)) closeDropdown(); });
  }

  // Favorites + recent tools. Works without login and stays local — now visible on every tool card and every tool page.
  const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const load=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(e){return d}};
  const extractSlug = href => {
    if(!href) return null;
    const m = href.match(/\/tools\/([a-z0-9\-]+)(?:\.html)?\/?(?:[?#].*)?$/);
    return m ? m[1] : null;
  };
  const toolKey = extractSlug(path);
  const favState = new Set(load('fawran-favorites'));
  const updateFavButtons = (slug, active) => {
    document.querySelectorAll(`[data-fav-slug=\"${slug}\"]`).forEach(btn=>{
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('is-fav', active);
      const icon = btn.querySelector('.fav-icon');
      if(icon) icon.textContent = active ? '★' : '☆';
      const label = btn.querySelector('.fav-label');
      if(label) label.textContent = active ? labels.favOn : labels.fav;
      btn.title = active ? labels.favOn : labels.fav;
    });
  };
  const toggleFav = (slug) => {
    let fav = load('fawran-favorites');
    const idx = fav.indexOf(slug);
    const willBeActive = idx < 0;
    if(idx>=0) fav.splice(idx,1); else fav.push(slug);
    store('fawran-favorites', fav);
    favState.clear(); fav.forEach(s=>favState.add(s));
    updateFavButtons(slug, willBeActive);
    return willBeActive;
  };

  // Recent tracking for tool pages
  if(toolKey){
    let recent=load('fawran-recent'); recent=[toolKey,...recent.filter(x=>x!==toolKey)].slice(0,12); store('fawran-recent',recent);
  }

  // 1) Tool page: prominent favorite button after H1 + also in professional toolbar
  if(toolKey){
    const head=$('h1');
    if(head && !document.querySelector('.favorite-tool-btn[data-fav-slug]')){
      const favActive = favState.has(toolKey);
      const b=document.createElement('button');
      b.type='button';
      b.className='favorite-tool-btn'+(favActive?' is-fav':'');
      b.dataset.favSlug = toolKey;
      b.setAttribute('aria-pressed', String(favActive));
      b.innerHTML=`<span class=\"fav-icon\">${favActive?'★':'☆'}</span><span class=\"fav-label\">${favActive?labels.favOn:labels.fav}</span>`;
      b.addEventListener('click',()=>{ const on = toggleFav(toolKey); /* live region */ const live = document.querySelector('[aria-label=\"Tool status messages\"], [aria-label=\"رسائل حالة الأداة\"]'); if(live) live.textContent = on ? (isEn ? 'Added to favorites' : 'تمت الإضافة للمفضلة') : (isEn ? 'Removed from favorites' : 'تمت الإزالة من المفضلة'); });
      head.parentNode.insertBefore(b,head.nextSibling);
    }
    // If professional toolbar exists, also add favorite there
    const proToolbar = document.querySelector('.tool-pro-toolbar');
    if(proToolbar && !proToolbar.querySelector('[data-action=\"fav\"]')){
      const favActive = favState.has(toolKey);
      const favBtn = document.createElement('button');
      favBtn.type='button';
      favBtn.className='tool-pro-action'+(favActive?' is-fav':'');
      favBtn.dataset.action='fav';
      favBtn.dataset.favSlug=toolKey;
      favBtn.setAttribute('aria-pressed', String(favActive));
      favBtn.innerHTML=`<span class=\"fav-icon\">${favActive?'★':'☆'}</span> <span class=\"fav-label\">${isEn ? 'Favorite' : 'المفضلة'}</span>`;
      favBtn.addEventListener('click', ()=> toggleFav(toolKey));
      proToolbar.appendChild(favBtn);
    }
  }

  // 2) Every tool card on home / hub / favorites pages gets a star
  const toolCards = $$('.tool-card[href*=\"/tools/\"]');
  toolCards.forEach(card=>{
    if(card.querySelector('.card-fav-btn')) return;
    const slug = extractSlug(card.getAttribute('href')||'');
    if(!slug) return;
    card.style.position='relative';
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='card-fav-btn'+(favState.has(slug)?' is-fav':'');
    btn.dataset.favSlug=slug;
    btn.setAttribute('aria-pressed', String(favState.has(slug)));
    btn.setAttribute('aria-label', favState.has(slug) ? labels.favOn : labels.fav);
    btn.title = favState.has(slug) ? labels.favOn : labels.fav;
    btn.innerHTML=`<span class=\"fav-icon\">${favState.has(slug)?'★':'☆'}</span>`;
    btn.addEventListener('click', e=>{
      e.preventDefault(); e.stopPropagation();
      toggleFav(slug);
    });
    card.appendChild(btn);
  });

  // Copy buttons: announce success accessibly.
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-copy-target]'); if(!b)return;
    const el=$(b.dataset.copyTarget); if(!el)return;
    navigator.clipboard?.writeText(el.value ?? el.textContent ?? '').then(()=>{
      const old=b.textContent; b.textContent=labels.copied; setTimeout(()=>b.textContent=old,1400);
    }).catch(()=>{});
  });

  // Personal tools hub on home/category pages
  const personal=$('#personalTools');
  if(personal){
    const fav=load('fawran-favorites'); const recent=load('fawran-recent');
    const ids=[...new Set([...fav,...recent])].slice(0,8);
    if(!ids.length){ personal.innerHTML=''; }
  }

  // Footer year
  const year=$('#year'); if(year)year.textContent=new Date().getFullYear();

  // PWA
  if('serviceWorker' in navigator && location.protocol!=='file:') navigator.serviceWorker.register('/sw.js').catch(()=>{});

});
