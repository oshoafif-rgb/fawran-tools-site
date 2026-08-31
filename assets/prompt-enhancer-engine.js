/* Fawran.tools — Prompt Enhancer Engine
   يحوّل فكرة بسيطة لبرومبت احترافي مبني على قواعد الهندسة الذكية
   (الدور Role، السياق Context، القيود Constraints، المطلوب Task) — كله محليًا داخل المتصفح. */
(function () {
  const $ = (id) => document.getElementById(id);
  const isEn = document.documentElement.lang === 'en';

  const ROLES = isEn ? {
    content: 'You are a professional content writer and editor, with extensive experience crafting engaging, persuasive text suited to the target audience.',
    code: 'You are an expert software engineer, precise about technical detail, committed to best practices and writing clean, maintainable code.',
    data: 'You are a professional data analyst, able to extract accurate insights from data and present them clearly, backed by numbers.',
    academic: 'You are a rigorous academic researcher, relying on strict scientific methodology and credible sources, with careful attention to scientific accuracy.',
    marketing: 'You are a specialized digital marketing expert, crafting persuasive messages that achieve measurable results while accounting for audience behavior.',
    general: 'You are a specialized, accurate, and helpful AI assistant, attentive to the user\'s actual need in every response.',
  } : {
    content: 'أنت كاتب محتوى ومحرر محترف، بخبرة واسعة في صياغة نصوص جذابة ومقنعة ومناسبة للجمهور المستهدف.',
    code: 'أنت مهندس برمجيات خبير، دقيق في التفاصيل التقنية، ملتزم بأفضل الممارسات وكتابة كود نظيف وقابل للصيانة.',
    data: 'أنت محلل بيانات محترف، قادر على استخلاص رؤى دقيقة من المعطيات وتقديمها بوضوح ودعمها بالأرقام.',
    academic: 'أنت باحث أكاديمي دقيق، تعتمد على منهجية علمية صارمة ومصادر موثوقة، وتراعي الدقة العلمية في كل إجابة.',
    marketing: 'أنت خبير تسويق رقمي متخصص، تصوغ رسائل مقنعة تحقق نتائج قابلة للقياس وتراعي سلوك الجمهور المستهدف.',
    general: 'أنت مساعد ذكي ومتخصص، دقيق ومفيد، تراعي احتياج المستخدم الفعلي في كل إجابة.',
  };

  const LENGTHS = isEn ? {
    short: 'short and concise (no more than ~100 words)',
    medium: 'medium length (roughly 200-400 words)',
    long: 'long and detailed (as thorough and comprehensive as possible)',
  } : {
    short: 'قصير ومختصر (لا يتجاوز 100 كلمة تقريبًا)',
    medium: 'متوسط الطول (بين 200-400 كلمة تقريبًا)',
    long: 'طويل ومفصّل (بأقصى قدر ممكن من التفصيل والشمولية)',
  };

  const TONES = isEn ? {
    formal: 'formal and professional',
    friendly: 'friendly and approachable',
    creative: 'creative and engaging',
    technical: 'technical and direct, with no filler',
  } : {
    formal: 'رسمية ومهنية',
    friendly: 'ودودة وقريبة من القارئ',
    creative: 'إبداعية وجذابة',
    technical: 'تقنية ومباشرة بدون حشو',
  };

  const L = isEn ? {
    emptyWarning: 'Write your idea first in the box above.',
    contextLabel: 'Context & task:',
    constraintsLabel: 'Required formatting & constraints:',
    toneLine: (t) => `- Tone: ${t}`,
    lengthLine: (l) => `- Length: ${l}`,
    audienceLine: (a) => `- Target audience: ${a}`,
    closing: 'Please carry out the above request in full, strictly following the specified formatting and constraints.',
    copy: 'Copy', copied: 'Copied ✓', download: 'Download as .txt',
  } : {
    emptyWarning: 'اكتب فكرتك الأول في المربع فوق.',
    contextLabel: 'السياق والمطلوب:',
    constraintsLabel: 'التنسيق والقيود المطلوبة:',
    toneLine: (t) => `- النبرة: ${t}`,
    lengthLine: (l) => `- الطول: ${l}`,
    audienceLine: (a) => `- الجمهور المستهدف: ${a}`,
    closing: 'يرجى تنفيذ المطلوب أعلاه بالتفصيل مع الالتزام الكامل بالتنسيق والقيود المحددة.',
    copy: 'نسخ', copied: 'تم النسخ ✓', download: 'تحميل كملف نصي',
  };

  const ideaInput = $('ideaInput'), categoryGroup = $('categoryGroup'), toneGroup = $('toneGroup'),
    lengthGroup = $('lengthGroup'), audienceInput = $('audienceInput'), generateBtn = $('generateBtn'),
    resultWrap = $('resultWrap'), resultText = $('resultText'), copyBtn = $('copyBtn'), downloadBtn = $('downloadBtn');

  const state = { category: 'content', tone: 'formal', length: 'medium' };

  function bindSegGroup(group, key) {
    group.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state[key] = btn.dataset.val;
      });
    });
  }
  bindSegGroup(categoryGroup, 'category');
  bindSegGroup(toneGroup, 'tone');
  bindSegGroup(lengthGroup, 'length');

  function buildPrompt() {
    const idea = ideaInput.value.trim();
    if (!idea) return null;
    const parts = [];
    parts.push(ROLES[state.category] || ROLES.general);
    parts.push('');
    parts.push(L.contextLabel);
    parts.push(idea);
    parts.push('');
    parts.push(L.constraintsLabel);
    parts.push(L.toneLine(TONES[state.tone] || TONES.formal));
    parts.push(L.lengthLine(LENGTHS[state.length] || LENGTHS.medium));
    const audience = audienceInput.value.trim();
    if (audience) parts.push(L.audienceLine(audience));
    parts.push('');
    parts.push(L.closing);
    return parts.join('\n');
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
    a.download = 'fawran-enhanced-prompt.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
})();
