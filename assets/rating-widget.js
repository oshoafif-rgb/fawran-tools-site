/* Fawran Tools — Real tool rating widget
   يعتمد على /api/tool-rating (Netlify Function + Netlify Blobs) لتقييمات حقيقية 100%
   لا يتم اختراع أي رقم — لو مفيش تقييمات لسه، الودجت بيوضح كده صراحة ولا يظهر نجوم Schema مزيفة. */
document.addEventListener('DOMContentLoaded', () => {
  const widget = document.querySelector('.rating-widget');
  if (!widget) return;

  const isEn = document.documentElement.lang === 'en';
  const slug = widget.dataset.toolSlug;
  if (!slug) return;

  const STORAGE_KEY = `fawran-rated-${slug}`;
  const starsEl = widget.querySelector('.rating-stars');
  const summaryEl = widget.querySelector('.rating-summary');
  const promptEl = widget.querySelector('.rating-prompt');
  const thanksEl = widget.querySelector('.rating-thanks');

  const L = isEn
    ? { loading: 'Loading ratings…', none: 'No ratings yet — be the first to rate this tool',
        summary: (avg, n) => `${avg} out of 5 (${n.toLocaleString('en')} rating${n === 1 ? '' : 's'})`,
        prompt: 'Rate this tool:', thanks: 'Thanks for rating!', error: 'Could not load ratings right now.' }
    : { loading: 'جارٍ تحميل التقييمات…', none: 'لسه مفيش تقييمات — كن أول من يقيّم الأداة دي',
        summary: (avg, n) => `${avg} من 5 (${n.toLocaleString('ar')} تقييم)`,
        prompt: 'قيّم الأداة دي:', thanks: 'شكرًا لتقييمك!', error: 'تعذّر تحميل التقييمات حاليًا.' };

  function starSVG() {
    return '<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.9-6.2 3.9 1.6-7L2 9.2l7.1-.6z"/></svg>';
  }

  function renderStars(activeCount, clickable) {
    starsEl.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = starSVG();
      btn.setAttribute('aria-label', isEn ? `${i} star${i === 1 ? '' : 's'}` : `${i} نجوم`);
      if (i <= activeCount) btn.classList.add('filled');
      if (clickable) {
        btn.addEventListener('mouseenter', () => previewStars(i));
        btn.addEventListener('mouseleave', () => renderStars(activeCount, true));
        btn.addEventListener('click', () => submitRating(i));
      } else {
        btn.disabled = true;
      }
      starsEl.appendChild(btn);
    }
  }

  function previewStars(count) {
    [...starsEl.children].forEach((btn, i) => btn.classList.toggle('filled', i < count));
  }

  function updatePageSchema(average, count) {
    if (!count) return; // ما نضيفش aggregateRating في الـSchema إلا لما يكون فيه تقييم حقيقي واحد على الأقل
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent);
        if (data['@type'] === 'SoftwareApplication') {
          data.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: average,
            reviewCount: count,
            bestRating: 5,
            worstRating: 1,
          };
          s.textContent = JSON.stringify(data);
        }
      } catch (e) { /* تجاهل أي وسم Schema مش JSON صحيح */ }
    }
  }

  function showResult(average, count) {
    if (count > 0) {
      renderStars(Math.round(average), false);
      summaryEl.textContent = L.summary(average, count);
      updatePageSchema(average, count);
    } else {
      summaryEl.textContent = L.none;
    }
  }

  async function loadRating() {
    summaryEl.textContent = L.loading;
    try {
      const res = await fetch(`/api/tool-rating?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      showResult(data.average, data.count);

      const alreadyRated = localStorage.getItem(STORAGE_KEY);
      if (alreadyRated) {
        widget.classList.add('rated');
      } else {
        renderStars(0, true);
      }
    } catch (e) {
      summaryEl.textContent = L.error;
    }
  }

  async function submitRating(rating) {
    if (localStorage.getItem(STORAGE_KEY)) return; // تصويت واحد لكل متصفح
    try {
      const res = await fetch('/api/tool-rating', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, rating }),
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, String(rating));
      widget.classList.add('rated');
      showResult(data.average, data.count);
    } catch (e) {
      summaryEl.textContent = L.error;
    }
  }

  promptEl.textContent = L.prompt;
  thanksEl.textContent = L.thanks;
  loadRating();
});
