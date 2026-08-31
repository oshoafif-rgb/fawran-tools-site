/* Fawran.tools — Live Speech-to-Text Engine
   يستخدم Web Speech API المدمجة في المتصفح (SpeechRecognition) لتحويل الإملاء الصوتي
   المباشر من الميكروفون لنص مكتوب. ملاحظة مهمة: على عكس باقي أدوات الموقع، هذه الأداة
   تحديدًا ليست معالجة محلية بالكامل — المتصفح يرسل الصوت لمحرك تعرّف سحابي (خدمة جوجل
   في Chrome) لأن هذا جزء من تصميم الـWeb Speech API نفسها ولا يوجد بديل محلي بنفس الدقة. */
(function () {
  const $ = (id) => document.getElementById(id);
  const isEn = document.documentElement.lang === 'en';

  const L = isEn ? {
    notSupported: 'Live dictation is not supported in this browser. Try Chrome or Edge.',
    start: '🎙️ Start dictation', stop: '⏹️ Stop', listening: 'Listening...', paused: 'Paused',
    micDenied: 'Microphone access was denied. Allow microphone access from your browser settings and try again.',
    copy: 'Copy', copied: 'Copied ✓', download: 'Download as .txt', clear: 'Clear',
  } : {
    notSupported: 'الإملاء الصوتي المباشر غير مدعوم في هذا المتصفح. جرّب Chrome أو Edge.',
    start: '🎙️ ابدأ الإملاء', stop: '⏹️ إيقاف', listening: 'جارٍ الاستماع...', paused: 'متوقف',
    micDenied: 'تم رفض الوصول للميكروفون. اسمح بالوصول من إعدادات المتصفح وحاول تاني.',
    copy: 'نسخ', copied: 'تم النسخ ✓', download: 'تحميل كملف نصي', clear: 'مسح',
  };

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const langSelect = $('speechLang'), toggleBtn = $('toggleBtn'), statusLabel = $('speechStatus'),
    transcriptArea = $('transcriptArea'), copyBtn = $('speechCopyBtn'), downloadBtn = $('speechDownloadBtn'),
    clearBtn = $('speechClearBtn'), unsupportedNotice = $('unsupportedNotice'), mainCard = $('speechMainCard');

  if (!SpeechRecognition) {
    unsupportedNotice.textContent = L.notSupported;
    unsupportedNotice.style.display = 'block';
    mainCard.style.display = 'none';
    return;
  }

  let recognition = null;
  let isListening = false;
  let shouldContinue = false;
  let finalTranscript = '';

  function buildRecognition() {
    const r = new SpeechRecognition();
    r.lang = langSelect.value;
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript + ' ';
        else interim += transcript;
      }
      transcriptArea.value = finalTranscript + interim;
    };

    r.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        alert(L.micDenied);
        shouldContinue = false;
        stopListening();
      }
      // أخطاء زي "no-speech" أو "network" مؤقتة — بنسيب onend يتعامل مع إعادة المحاولة
    };

    r.onend = () => {
      if (shouldContinue) {
        // بعض المتصفحات بتوقف التعرّف تلقائيًا بعد فترة صمت حتى في وضع continuous — نعيد التشغيل تلقائيًا
        try { r.start(); } catch (e) {}
      } else {
        isListening = false;
        updateUI();
      }
    };

    return r;
  }

  function updateUI() {
    toggleBtn.textContent = isListening ? L.stop : L.start;
    toggleBtn.classList.toggle('btn-primary', !isListening);
    toggleBtn.classList.toggle('btn-ghost', isListening);
    statusLabel.textContent = isListening ? '🔴 ' + L.listening : L.paused;
    langSelect.disabled = isListening;
  }

  function startListening() {
    recognition = buildRecognition();
    shouldContinue = true;
    isListening = true;
    updateUI();
    try { recognition.start(); } catch (e) {}
  }

  function stopListening() {
    shouldContinue = false;
    isListening = false;
    updateUI();
    if (recognition) { try { recognition.stop(); } catch (e) {} }
  }

  toggleBtn.addEventListener('click', () => {
    if (isListening) stopListening();
    else startListening();
  });

  clearBtn.addEventListener('click', () => {
    finalTranscript = '';
    transcriptArea.value = '';
  });

  copyBtn.textContent = '📋 ' + L.copy;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(transcriptArea.value).then(() => {
      const old = copyBtn.textContent;
      copyBtn.textContent = L.copied;
      setTimeout(() => (copyBtn.textContent = old), 1500);
    });
  });

  downloadBtn.textContent = '⬇️ ' + L.download;
  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([transcriptArea.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fawran-dictation.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  clearBtn.textContent = '🗑️ ' + L.clear;

  updateUI();
})();
