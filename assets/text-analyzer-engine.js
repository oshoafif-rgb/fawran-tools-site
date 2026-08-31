/* Fawran.tools — Smart Text Analyzer Engine
   يحلّل النص لحظيًا: عدد الكلمات والأحرف، وقت القراءة التقديري، الكلمات المفتاحية
   الأكثر تكرارًا، ودرجة تعقيد تقريبية — كل الحساب محليًا داخل المتصفح بخوارزميات ثابتة. */
(function () {
  const $ = (id) => document.getElementById(id);
  const isEn = document.documentElement.lang === 'en';

  const L = isEn ? {
    words: 'Words', chars: 'Characters', charsNoSpace: 'Characters (no spaces)',
    sentences: 'Sentences', readingTime: 'Reading time', min: 'min', minShort: 'min',
    complexity: 'Complexity', easy: 'Easy', medium: 'Medium', complex: 'Complex',
    keywords: 'Most frequent keywords', noKeywords: 'Not enough distinct words yet.',
    placeholder: 'Paste or type your text here to see live stats...',
  } : {
    words: 'الكلمات', chars: 'الأحرف', charsNoSpace: 'الأحرف (بدون مسافات)',
    sentences: 'الجمل', readingTime: 'وقت القراءة التقديري', min: 'دقيقة', minShort: 'د',
    complexity: 'درجة التعقيد', easy: 'سهل', medium: 'متوسط', complex: 'معقد',
    keywords: 'الكلمات المفتاحية الأكثر تكرارًا', noKeywords: 'لسه مفيش كلمات مميزة كفاية.',
    placeholder: 'الصق أو اكتب نصك هنا عشان تشاهد الإحصائيات لحظيًا...',
  };

  const STOPWORDS_AR = new Set(['من','في','على','إلى','عن','هذا','هذه','ذلك','تلك','التي','الذي','و','ثم','أو','لا','لم','لن','قد','كان','يكون','مع','بعد','قبل','هو','هي','أن','إن','كل','بين','عند','كما','حتى','إذا','لكن','غير','دون','فيه','فيها','منه','منها','عليه','عليها','ما','لها','له']);
  const STOPWORDS_EN = new Set(['the','a','an','in','on','at','to','for','of','and','or','is','are','was','were','be','been','this','that','these','those','it','with','as','by','from','but','not','you','your','they','their','have','has','had','will','would','can','could','about']);

  const textInput = $('textInput');
  const statWords = $('statWords'), statChars = $('statChars'), statCharsNoSpace = $('statCharsNoSpace'),
    statSentences = $('statSentences'), statReadingTime = $('statReadingTime'), statComplexity = $('statComplexity'),
    keywordsWrap = $('keywordsWrap'), emptyState = $('emptyState'), statsGrid = $('statsGrid');

  function analyze(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const chars = trimmed.length;
    const charsNoSpaces = trimmed.replace(/\s/g, '').length;
    const words = trimmed.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const sentences = trimmed.split(/[.!?؟。]+/).map((s) => s.trim()).filter(Boolean);
    const sentenceCount = Math.max(1, sentences.length);
    const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgWordLength = charsNoSpaces / wordCount;
    let complexity;
    if (avgWordsPerSentence > 20 || avgWordLength > 6) complexity = L.complex;
    else if (avgWordsPerSentence < 12 && avgWordLength < 4.5) complexity = L.easy;
    else complexity = L.medium;

    const freq = {};
    words.forEach((w) => {
      const clean = w.replace(/[.,!?؟،؛:"'()«»\-—]/g, '').toLowerCase();
      if (clean.length < 3) return;
      if (STOPWORDS_AR.has(clean) || STOPWORDS_EN.has(clean)) return;
      freq[clean] = (freq[clean] || 0) + 1;
    });
    const topKeywords = Object.entries(freq)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    return { chars, charsNoSpaces, wordCount, sentenceCount, readingTimeMin, complexity, topKeywords };
  }

  function render() {
    const result = analyze(textInput.value);
    if (!result) {
      statsGrid.style.display = 'none';
      keywordsWrap.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';
    statsGrid.style.display = 'grid';

    statWords.textContent = result.wordCount.toLocaleString();
    statChars.textContent = result.chars.toLocaleString();
    statCharsNoSpace.textContent = result.charsNoSpaces.toLocaleString();
    statSentences.textContent = result.sentenceCount.toLocaleString();
    statReadingTime.textContent = result.readingTimeMin + ' ' + L.minShort;
    statComplexity.textContent = result.complexity;

    if (result.topKeywords.length) {
      keywordsWrap.style.display = 'block';
      keywordsWrap.innerHTML = `<div class="field-label">${L.keywords}</div><div class="chip-group">` +
        result.topKeywords.map(([word, count]) => `<span class="chip">${word} <b>×${count}</b></span>`).join('') +
        `</div>`;
    } else {
      keywordsWrap.style.display = 'block';
      keywordsWrap.innerHTML = `<div class="field-label">${L.keywords}</div><p class="wb-sub" style="margin:0;">${L.noKeywords}</p>`;
    }
  }

  textInput.placeholder = L.placeholder;
  textInput.addEventListener('input', render);
  render();
})();
