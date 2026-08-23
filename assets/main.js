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
    document.documentElement.toggleAttribute('data-theme',!dark);
    try{localStorage.setItem('fawran-theme',dark?'light':'dark')}catch(e){}
  });

  // Search with aliases / keywords
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
  if(searchInput) searchInput.addEventListener('input',()=>applyFilter(searchInput.value,$('.quick-chip.active')?.dataset.cat||'all'));
  chips.forEach(chip=>chip.addEventListener('click',()=>{chips.forEach(c=>c.classList.remove('active'));chip.classList.add('active');applyFilter(searchInput?.value||'',chip.dataset.cat);}));

  // Favorites + recent tools. Works without login and stays local.
  const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const load=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch(e){return d}};
  const toolKey = path.match(/\/tools\/([^/]+)\.html$/)?.[1];
  if(toolKey){
    let recent=load('fawran-recent'); recent=[toolKey,...recent.filter(x=>x!==toolKey)].slice(0,12); store('fawran-recent',recent);
    const head=$('h1'); if(head){
      const b=document.createElement('button'); b.type='button'; b.className='favorite-tool-btn';
      const fav=load('fawran-favorites'); const active=fav.includes(toolKey); b.setAttribute('aria-pressed',String(active)); b.textContent=(active?'★ ':'☆ ')+(active?labels.favOn:labels.fav);
      b.addEventListener('click',()=>{let f=load('fawran-favorites'); const i=f.indexOf(toolKey); if(i>=0)f.splice(i,1);else f.push(toolKey);store('fawran-favorites',f); const on=f.includes(toolKey);b.setAttribute('aria-pressed',String(on));b.textContent=(on?'★ ':'☆ ')+(on?labels.favOn:labels.fav);});
      head.parentNode.insertBefore(b,head.nextSibling);
    }
  }

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

  // Adblock notice is kept non-blocking and uses textContent to avoid injection.
  const bait=document.createElement('div'); bait.className='adsbox ad-banner ads ad-placement adsbygoogle'; bait.style.cssText='position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;'; document.body.appendChild(bait);
  setTimeout(()=>{const blocked=bait.offsetParent===null||bait.offsetHeight===0||getComputedStyle(bait).display==='none';bait.remove(); if(blocked&&!sessionStorage.getItem('fawran-adblock-dismissed')){
    const banner=document.createElement('div');banner.className='adblock-banner';
    const txt=isEn?'We noticed an ad blocker. Fawran is free and ads help cover operating costs.':'لاحظنا أنك تستخدم مانع إعلانات. فورا مجاني والإعلانات تساعدنا على تغطية تكاليف التشغيل.';
    const span=document.createElement('span');span.className='txt';span.textContent=txt;const close=document.createElement('button');close.className='close-btn';close.type='button';close.setAttribute('aria-label',isEn?'Close':'إغلاق');close.textContent='×';banner.append(span,close); document.body.appendChild(banner); requestAnimationFrame(()=>banner.classList.add('show')); banner.querySelector('.close-btn').onclick=()=>{banner.classList.remove('show');sessionStorage.setItem('fawran-adblock-dismissed','1');setTimeout(()=>banner.remove(),400)};
  }},700);
});
