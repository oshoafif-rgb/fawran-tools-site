/* Fawran.tools — Social Metadata Generator Engine
   يولّد عنوان SEO، وصف Meta، منشورات لمنصات التواصل المختلفة، وهاشتاجات مقترحة
   من موضوع أو ملخص محتوى واحد — كل التوليد محليًا بقواعد ثابتة داخل المتصفح. */
(function () {
  const $ = (id) => document.getElementById(id);
  const isEn = document.documentElement.lang === 'en';

  const STOPWORDS_AR = new Set(['من','في','على','إلى','عن','هذا','هذه','ذلك','التي','الذي','و','ثم','أو','لا','لم','لن','قد','كان','يكون','مع','بعد','قبل','هو','هي','أن','إن','كل','بين','عند','كما','حتى','إذا','لكن']);
  const STOPWORDS_EN = new Set(['the','a','an','in','on','at','to','for','of','and','or','is','are','was','were','be','this','that','it','with','as','by','from']);

  const L = isEn ? {
    emptyWarning: 'Write your topic or content summary first.',
    seoTitle: 'SEO title', metaDesc: 'Meta description', fbPost: 'Facebook / Instagram post',
    twitterPost: 'X (Twitter) post', linkedinPost: 'LinkedIn post', hashtags: 'Suggested hashtags',
    copy: 'Copy', copied: 'Copied ✓', download: 'Download as .txt',
    ctaGeneric: 'Learn more in the full guide.',
    fbClosing: (t) => `What do you think? Share your thoughts below 👇\n\n${t}`,
    linkedinOpening: 'A quick insight worth sharing:',
    linkedinClosing: 'What has your experience been? I would love to hear your perspective in the comments.',
  } : {
    emptyWarning: 'اكتب موضوعك أو ملخص المحتوى الأول.',
    seoTitle: 'عنوان SEO', metaDesc: 'وصف Meta', fbPost: 'منشور فيسبوك / انستغرام',
    twitterPost: 'منشور X (تويتر)', linkedinPost: 'منشور لينكدإن', hashtags: 'هاشتاجات مقترحة',
    copy: 'نسخ', copied: 'تم النسخ ✓', download: 'تحميل كملف نصي',
    ctaGeneric: 'اعرف التفاصيل كاملة في الدليل الشامل.',
    fbClosing: (t) => `إيه رأيكم؟ شاركونا تعليقاتكم 👇\n\n${t}`,
    linkedinOpening: 'ملاحظة سريعة تستحق المشاركة:',
    linkedinClosing: 'إيه تجربتكم في الموضوع ده؟ يسعدني أسمع وجهة نظركم في التعليقات.',
  };

  const topicInput = $('topicInput'), generateBtn = $('generateBtn'), resultsWrap = $('resultsWrap');

  function truncateAtWord(text, maxLen) {
    if (text.length <= maxLen) return text;
    const truncated = text.slice(0, maxLen);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated).trim();
  }

  function buildSeoTitle(topic) {
    return truncateAtWord(topic, 55) + ' | Fawran.tools';
  }

  function buildMetaDescription(topic) {
    let desc = topic;
    if (desc.length > 155) desc = truncateAtWord(desc, 152) + '...';
    else if (desc.length < 100) desc = desc + ' — ' + L.ctaGeneric;
    return desc;
  }

  function buildHashtags(text, maxCount) {
    const stopwords = isEn ? STOPWORDS_EN : STOPWORDS_AR;
    const words = text.split(/\s+/).filter(Boolean);
    const seen = new Set();
    const tags = [];
    for (const w of words) {
      const clean = w.replace(/[.,!?؟،؛:"'()«»\-—]/g, '');
      if (clean.length < 3) continue;
      if (stopwords.has(clean.toLowerCase())) continue;
      if (seen.has(clean.toLowerCase())) continue;
      seen.add(clean.toLowerCase());
      tags.push('#' + clean);
      if (tags.length >= maxCount) break;
    }
    return tags;
  }

  function buildTwitterPost(topic, hashtags) {
    const tagStr = hashtags.slice(0, 3).join(' ');
    const maxTextLen = 280 - tagStr.length - 2;
    const text = truncateAtWord(topic, maxTextLen);
    return text + '\n\n' + tagStr;
  }

  function buildFbPost(topic, hashtags) {
    const body = L.fbClosing(topic);
    return body + '\n\n' + hashtags.slice(0, 5).join(' ');
  }

  function buildLinkedinPost(topic, hashtags) {
    return `${L.linkedinOpening}\n\n${topic}\n\n${L.linkedinClosing}\n\n${hashtags.slice(0, 4).join(' ')}`;
  }

  function renderCard(label, text) {
    const card = document.createElement('div');
    card.className = 'meta-card';
    card.innerHTML = `
      <div class="field-label">${label}</div>
      <div class="meta-box">${text.replace(/</g, '&lt;')}</div>
      <button type="button" class="btn btn-ghost meta-copy-btn">📋 ${L.copy}</button>
    `;
    const btn = card.querySelector('.meta-copy-btn');
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(text).then(() => {
        const old = btn.textContent;
        btn.textContent = '✓ ' + L.copied;
        setTimeout(() => (btn.textContent = old), 1500);
      });
    });
    return card;
  }

  generateBtn.addEventListener('click', () => {
    const topic = topicInput.value.trim();
    if (!topic) { alert(L.emptyWarning); return; }

    const hashtags = buildHashtags(topic, 8);
    const seoTitle = buildSeoTitle(topic);
    const metaDesc = buildMetaDescription(topic);
    const fbPost = buildFbPost(topic, hashtags);
    const twitterPost = buildTwitterPost(topic, hashtags);
    const linkedinPost = buildLinkedinPost(topic, hashtags);

    resultsWrap.innerHTML = '';
    resultsWrap.appendChild(renderCard(L.seoTitle, seoTitle));
    resultsWrap.appendChild(renderCard(L.metaDesc, metaDesc));
    resultsWrap.appendChild(renderCard(L.fbPost, fbPost));
    resultsWrap.appendChild(renderCard(L.twitterPost, twitterPost));
    resultsWrap.appendChild(renderCard(L.linkedinPost, linkedinPost));
    resultsWrap.appendChild(renderCard(L.hashtags, hashtags.join(' ')));
    resultsWrap.style.display = 'block';
    resultsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
