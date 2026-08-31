/* Fawran.tools — OCR Engine
   يستخرج نص من صورة عبر مكتبة Tesseract.js (تعمل بالكامل داخل المتصفح عبر WebAssembly).
   الصورة نفسها لا تُرفع لأي خادم أبدًا؛ فقط ملفات محرك التعرّف (WASM + بيانات اللغة)
   تُحمَّل من شبكة توزيع Tesseract العامة في أول استخدام، بشكل منفصل تمامًا عن صورتك. */
(function () {
  const $ = (id) => document.getElementById(id);
  const isEn = document.documentElement.lang === 'en';

  const L = isEn ? {
    chooseImage: 'Choose an image or scanned document',
    clickToAdd: 'Click or drag an image here',
    extract: '📄 Extract text',
    extracting: 'Extracting text...',
    loadingEngine: 'Loading the OCR engine (first time only)...',
    done: 'Done ✓', copy: 'Copy', copied: 'Copied ✓', download: 'Download as .txt',
    noImage: 'Choose an image first.',
    noLang: 'Choose at least one language.',
    error: 'Something went wrong while reading the image. Try a clearer photo or a different format.',
    engineError: 'Could not load the OCR engine — check your internet connection and try again.',
  } : {
    chooseImage: 'اختر صورة أو مستندًا ممسوحًا ضوئيًا',
    clickToAdd: 'اضغط أو اسحب صورة هنا',
    extract: '📄 استخرج النص',
    extracting: 'جارٍ استخراج النص...',
    loadingEngine: 'جارٍ تحميل محرك التعرّف (أول مرة بس)...',
    done: 'تم ✓', copy: 'نسخ', copied: 'تم النسخ ✓', download: 'تحميل كملف نصي',
    noImage: 'اختر صورة الأول.',
    noLang: 'اختر لغة واحدة على الأقل.',
    error: 'حصلت مشكلة أثناء قراءة الصورة. جرّب صورة أوضح أو بصيغة مختلفة.',
    engineError: 'تعذّر تحميل محرك التعرّف — تأكد من اتصالك بالإنترنت وحاول تاني.',
  };

  const dropzone = $('ocrDropzone'), fileInput = $('ocrFileInput'), previewImg = $('ocrPreview'),
    langAr = $('langAr'), langEn = $('langEn'), extractBtn = $('extractBtn'),
    progressWrap = $('ocrProgressWrap'), progressBar = $('ocrProgressBar'), progressLabel = $('ocrProgressLabel'),
    resultWrap = $('ocrResultWrap'), resultTextarea = $('ocrResultTextarea'), copyBtn = $('ocrCopyBtn'), downloadBtn = $('ocrDownloadBtn');

  let currentFile = null;
  let worker = null;

  function showPreview(file) {
    const url = URL.createObjectURL(file);
    previewImg.src = url;
    previewImg.style.display = 'block';
    dropzone.querySelector('.dz-placeholder').style.display = 'none';
  }

  dropzone.addEventListener('click', () => fileInput.click());
  ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); }));
  dropzone.addEventListener('drop', (e) => {
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) { currentFile = f; showPreview(f); }
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (f) { currentFile = f; showPreview(f); }
    fileInput.value = '';
  });

  function getLangs() {
    const langs = [];
    if (langAr.checked) langs.push('ara');
    if (langEn.checked) langs.push('eng');
    return langs;
  }

  async function ensureWorker(langs, onLoadingEngine) {
    // نعيد إنشاء الـworker لو اللغات اتغيرت عن آخر مرة، عشان نضمن تحميل بيانات اللغة الصحيحة
    const langKey = langs.join('+');
    if (worker && worker._fawranLangKey === langKey) return worker;
    if (worker) { await worker.terminate(); worker = null; }
    onLoadingEngine();
    worker = await Tesseract.createWorker(langs, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          progressBar.style.width = Math.round(m.progress * 100) + '%';
          progressLabel.textContent = L.extracting + ' ' + Math.round(m.progress * 100) + '%';
        }
      },
    });
    worker._fawranLangKey = langKey;
    return worker;
  }

  extractBtn.addEventListener('click', async () => {
    if (!currentFile) { alert(L.noImage); return; }
    const langs = getLangs();
    if (!langs.length) { alert(L.noLang); return; }

    extractBtn.disabled = true;
    resultWrap.style.display = 'none';
    progressWrap.style.display = 'block';
    progressBar.style.width = '0%';
    progressLabel.textContent = L.loadingEngine;

    try {
      const w = await ensureWorker(langs, () => { progressLabel.textContent = L.loadingEngine; });
      progressLabel.textContent = L.extracting;
      const { data } = await w.recognize(currentFile);
      progressBar.style.width = '100%';
      progressLabel.textContent = L.done;
      resultTextarea.value = data.text.trim();
      resultWrap.style.display = 'block';
      resultWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      const msg = /network|fetch|load/i.test(String(err && err.message)) ? L.engineError : L.error;
      alert(msg);
    } finally {
      extractBtn.disabled = false;
    }
  });

  copyBtn.textContent = '📋 ' + L.copy;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(resultTextarea.value).then(() => {
      const old = copyBtn.textContent;
      copyBtn.textContent = L.copied;
      setTimeout(() => (copyBtn.textContent = old), 1500);
    });
  });

  downloadBtn.textContent = '⬇️ ' + L.download;
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([resultTextarea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fawran-extracted-text.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
})();
