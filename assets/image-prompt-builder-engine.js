/* Fawran.tools — Image Prompt Builder Engine
   يركّب برومبت توليد صور احترافي (لـMidjourney وDALL-E وStable Diffusion) من خيارات مرئية
   قابلة للنقر — بدون أي معالجة خارجية، كل التركيب محليًا داخل المتصفح. */
(function () {
  const $ = (id) => document.getElementById(id);
  const isEn = document.documentElement.lang === 'en';
  const L = isEn ? {
    emptyWarning: 'Describe the subject of the image first.',
    copy: 'Copy', copied: 'Copied ✓', download: 'Download as .txt',
  } : {
    emptyWarning: 'اكتب وصف موضوع الصورة الأول.',
    copy: 'نسخ', copied: 'تم النسخ ✓', download: 'تحميل كملف نصي',
  };

  const subjectInput = $('subjectInput'), extrasInput = $('extrasInput'), generateBtn = $('generateBtn'),
    resultWrap = $('resultWrap'), resultText = $('resultText'), copyBtn = $('copyBtn'), downloadBtn = $('downloadBtn');

  const groups = ['styleGroup', 'lightingGroup', 'angleGroup', 'moodGroup', 'resGroup'];
  const state = {};

  groups.forEach((gid) => {
    const group = $(gid);
    group.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const alreadyActive = chip.classList.contains('active');
        group.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        if (!alreadyActive) {
          chip.classList.add('active');
          state[gid] = chip.dataset.val;
        } else {
          state[gid] = null;
        }
      });
    });
  });

  function buildPrompt() {
    const subject = subjectInput.value.trim();
    if (!subject) return null;
    const parts = [subject];
    if (state.styleGroup) parts.push(state.styleGroup);
    if (state.lightingGroup) parts.push(state.lightingGroup);
    if (state.angleGroup) parts.push(state.angleGroup);
    if (state.moodGroup) parts.push(state.moodGroup);
    const extras = extrasInput.value.trim();
    if (extras) parts.push(extras);
    if (state.resGroup) parts.push(state.resGroup);
    return parts.join(', ');
  }

  generateBtn.addEventListener('click', () => {
    const prompt = buildPrompt();
    if (!prompt) { alert(L.emptyWarning); return; }
    resultText.textContent = prompt;
    resultWrap.style.display = 'block';
    resultWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  copyBtn.textContent = '📋 ' + L.copy;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(resultText.textContent).then(() => {
      const old = copyBtn.textContent;
      copyBtn.textContent = L.copied;
      setTimeout(() => (copyBtn.textContent = old), 1500);
    });
  });

  downloadBtn.textContent = '⬇️ ' + L.download;
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([resultText.textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fawran-image-prompt.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
})();
