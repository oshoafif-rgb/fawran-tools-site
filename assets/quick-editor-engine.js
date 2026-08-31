/* Fawran.tools — Quick Video Editor Engine
   يجمّع فيديوهات وصور في تايم لاين واحد، يقصّها لنسبة العرض المطلوبة (object-fit: cover)،
   يمزج صوت الفيديوهات نفسها مع موسيقى خلفية اختيارية عبر Web Audio API،
   يضيف انتقالات وعناوين نصية، ويصدّر الناتج فعليًا عبر canvas.captureStream + MediaRecorder. */
(function () {
  const $ = (id) => document.getElementById(id);
  const isEn = document.documentElement.lang === 'en';
  const L = isEn ? {
    addClipFirst: 'Add at least one video or image first.',
    processingClip: (i, n) => `Processing clip ${i} of ${n}...`,
    finishingExport: 'Finishing export...',
    doneExport: 'Export complete — preview before downloading ✓',
    downloadLabel: (mb) => `⬇️ Download video (${mb} MB)`,
    clipTitle: (n) => `Clip #${n} settings`,
    customized: 'Customized',
    introCard: 'Drawing the intro card...',
    outroCard: 'Drawing the outro card...',
  } : {
    addClipFirst: 'أضف فيديو أو صورة واحدة على الأقل أولًا.',
    processingClip: (i, n) => `جارٍ معالجة المقطع ${i} من ${n}...`,
    finishingExport: 'جارٍ إنهاء التصدير...',
    doneExport: 'اكتمل التصدير — شاهد المعاينة قبل التحميل ✓',
    downloadLabel: (mb) => `⬇️ تحميل الفيديو (${mb} MB)`,
    clipTitle: (n) => `إعدادات المقطع #${n}`,
    customized: 'مخصّص',
    introCard: 'جارٍ رسم بطاقة المقدمة...',
    outroCard: 'جارٍ رسم بطاقة الخاتمة...',
  };

  const state = {
    clips: [], // {file, type:'video'|'image', url, el, duration, trimStart, trimEnd, volume, caption}
    audioFile: null,
    audioUrl: null,
    quality: 720,
    ratio: 'auto',
    transition: 'cut',
    musicVolume: 1,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    kenBurns: true,
  };

  const TRANSITION_MS = 450; // مدة ثابتة للانتقال بالمللي ثانية (تُقيَّد تلقائيًا للمقاطع القصيرة جدًا)

  const dropzone = $('editDropzone'), fileInput = $('editFileInput'), clipStrip = $('clipStrip');
  const audioDrop = $('editAudioDrop'), audioInput = $('editAudioInput');
  const exportBtn = $('exportBtn'), downloadLink = $('editDownloadLink');
  const previewWrap = $('editPreviewWrap'), canvas = $('editCanvas'), resultVideo = $('editResultVideo'), progressBar = $('editProgressBar'), statusEl = $('editStatus');
  const clipEditor = $('clipEditor'), clipEditorTitle = $('clipEditorTitle'), closeClipEditor = $('closeClipEditor');
  const clipTrimFields = $('clipTrimFields'), clipTrimStart = $('clipTrimStart'), clipTrimStartVal = $('clipTrimStartVal'), clipTrimEnd = $('clipTrimEnd'), clipTrimEndVal = $('clipTrimEndVal');
  const clipDurationField = $('clipDurationField'), clipDuration = $('clipDuration'), clipDurVal = $('clipDurVal');
  const clipVolumeField = $('clipVolumeField'), clipVolume = $('clipVolume'), clipVolVal = $('clipVolVal');
  const clipCaption = $('clipCaption');
  const musicVolumeField = $('musicVolumeField'), musicVolume = $('musicVolume'), musicVolVal = $('musicVolVal');
  let lastResultUrl = null;
  let editingIdx = null;

  function loadClip(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const el = document.createElement(isVideo ? 'video' : 'img');
      el.src = url;
      el.muted = true;
      const onReady = () => {
        const duration = isVideo ? el.duration : 3; // الصور الثابتة تُعرض 3 ثوانٍ افتراضيًا
        resolve({ file, type: isVideo ? 'video' : 'image', url, el, duration, trimStart: 0, trimEnd: duration, volume: 1, caption: '', _gainNode: null });
      };
      if (isVideo) { el.onloadedmetadata = onReady; el.load(); } else { el.onload = onReady; }
    });
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('video/') || f.type.startsWith('image/'));
    for (const f of files) state.clips.push(await loadClip(f));
    renderClips();
  }

  function renderClips() {
    clipStrip.innerHTML = '';
    if (!state.clips.length) { dropzone.style.display = ''; clipStrip.style.display = 'none'; return; }
    dropzone.style.display = 'none';
    clipStrip.style.display = 'flex';
    state.clips.forEach((clip, i) => {
      const el = document.createElement('div');
      el.className = 'edit-clip';
      el.draggable = true;
      el.dataset.idx = String(i);
      const icon = clip.type === 'video' ? '🎬' : '🖼️';
      const isEdited = clip.caption || clip.volume !== 1 || (clip.type === 'video' && (clip.trimStart > 0 || clip.trimEnd < clip.duration)) || (clip.type === 'image' && clip.duration !== 3);
      const badge = isEdited ? `<span class="clip-edited" title="${L.customized}">✎</span>` : '';
      el.innerHTML = `<div class="clip-thumb">${icon}</div><span class="clip-num">${i + 1}</span><button type="button" class="clip-remove" data-remove="${i}">×</button><span class="clip-dur">${clip.duration.toFixed(1)}s</span>${badge}`;
      clipStrip.appendChild(el);
    });
    const addMore = document.createElement('div');
    addMore.className = 'clip-add';
    addMore.textContent = '+';
    addMore.addEventListener('click', () => fileInput.click());
    clipStrip.appendChild(addMore);
  }

  dropzone.addEventListener('click', () => fileInput.click());
  ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); }));
  dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
  fileInput.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

  clipStrip.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      const idx = +removeBtn.dataset.remove;
      URL.revokeObjectURL(state.clips[idx].url);
      state.clips.splice(idx, 1);
      if (editingIdx === idx) closeEditor();
      renderClips();
      return;
    }
    const item = e.target.closest('.edit-clip');
    if (item) openClipEditor(+item.dataset.idx);
  });

  // ---------- محرر المقطع الفردي (قص، مدة، صوت، عنوان) ----------
  function openClipEditor(idx) {
    editingIdx = idx;
    const clip = state.clips[idx];
    clipEditorTitle.textContent = L.clipTitle(idx + 1);

    if (clip.type === 'video') {
      clipTrimFields.style.display = 'block';
      clipDurationField.style.display = 'none';
      clipVolumeField.style.display = 'block';
      clipTrimStart.max = clip.duration; clipTrimStart.value = clip.trimStart;
      clipTrimEnd.max = clip.duration; clipTrimEnd.value = clip.trimEnd;
      clipTrimStartVal.textContent = clip.trimStart.toFixed(1);
      clipTrimEndVal.textContent = clip.trimEnd.toFixed(1);
      clipVolume.value = Math.round(clip.volume * 100);
      clipVolVal.textContent = Math.round(clip.volume * 100) + '%';
    } else {
      clipTrimFields.style.display = 'none';
      clipDurationField.style.display = 'block';
      clipVolumeField.style.display = 'none';
      clipDuration.value = clip.duration;
      clipDurVal.textContent = clip.duration.toFixed(1);
    }
    clipCaption.value = clip.caption || '';
    clipEditor.style.display = 'block';
    clipEditor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function closeEditor() { editingIdx = null; clipEditor.style.display = 'none'; }
  closeClipEditor.addEventListener('click', closeEditor);

  clipTrimStart.addEventListener('input', () => {
    if (editingIdx === null) return;
    const clip = state.clips[editingIdx];
    let v = +clipTrimStart.value;
    if (v >= clip.trimEnd) v = Math.max(0, clip.trimEnd - 0.1);
    clip.trimStart = v; clipTrimStart.value = v;
    clipTrimStartVal.textContent = v.toFixed(1);
  });
  clipTrimEnd.addEventListener('input', () => {
    if (editingIdx === null) return;
    const clip = state.clips[editingIdx];
    let v = +clipTrimEnd.value;
    if (v <= clip.trimStart) v = Math.min(clip.duration, clip.trimStart + 0.1);
    clip.trimEnd = v; clipTrimEnd.value = v;
    clipTrimEndVal.textContent = v.toFixed(1);
  });
  clipDuration.addEventListener('input', () => {
    if (editingIdx === null) return;
    const v = +clipDuration.value;
    state.clips[editingIdx].duration = v;
    clipDurVal.textContent = v.toFixed(1);
  });
  clipVolume.addEventListener('input', () => {
    if (editingIdx === null) return;
    const v = +clipVolume.value;
    state.clips[editingIdx].volume = v / 100;
    clipVolVal.textContent = v + '%';
  });
  clipCaption.addEventListener('input', () => {
    if (editingIdx === null) return;
    state.clips[editingIdx].caption = clipCaption.value;
  });
  [clipTrimStart, clipTrimEnd, clipDuration, clipVolume, clipCaption].forEach((el) => el.addEventListener('change', renderClips));

  let dragSrc = null;
  clipStrip.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.edit-clip');
    if (!item) return;
    dragSrc = +item.dataset.idx;
  });
  clipStrip.addEventListener('dragover', (e) => {
    e.preventDefault();
    const item = e.target.closest('.edit-clip');
    if (!item || dragSrc === null) return;
    const idx = +item.dataset.idx;
    if (idx === dragSrc) return;
    const moved = state.clips.splice(dragSrc, 1)[0];
    state.clips.splice(idx, 0, moved);
    dragSrc = idx;
    renderClips();
  });

  audioDrop.addEventListener('click', () => audioInput.click());
  audioInput.addEventListener('change', () => {
    const f = audioInput.files[0];
    if (!f) return;
    state.audioFile = f;
    state.audioUrl = URL.createObjectURL(f);
    audioDrop.textContent = '🎵 ' + f.name;
    audioDrop.classList.add('has-file');
    musicVolumeField.style.display = 'block';
  });
  musicVolume.addEventListener('input', () => {
    state.musicVolume = +musicVolume.value / 100;
    musicVolVal.textContent = musicVolume.value + '%';
  });
  $('kenBurns').addEventListener('change', (e) => (state.kenBurns = e.target.checked));

  function bindSegGroup(id, key, parse) {
    const group = $(id);
    group.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state[key] = parse ? parse(btn.dataset.val) : btn.dataset.val;
      });
    });
  }
  bindSegGroup('editQualityGroup', 'quality', Number);
  bindSegGroup('editRatioGroup', 'ratio');
  bindSegGroup('transitionGroup', 'transition');

  // ---------- تعديل الألوان (سطوع/تباين/إشباع) — فلتر Canvas قياسي، يُطبَّق محليًا على كل المقاطع ----------
  const colorAdvToggle = $('colorAdvToggle'), colorAdvBody = $('colorAdvBody'), colorAdvArrow = $('colorAdvArrow');
  colorAdvToggle.addEventListener('click', () => {
    const open = colorAdvBody.style.display !== 'none';
    colorAdvBody.style.display = open ? 'none' : 'block';
    colorAdvArrow.textContent = open ? '▾' : '▴';
  });
  function bindColorSlider(id, key, valEl) {
    const el = $(id);
    el.addEventListener('input', () => {
      state[key] = +el.value;
      $(valEl).textContent = el.value + '%';
    });
  }
  bindColorSlider('brightness', 'brightness', 'brightnessVal');
  bindColorSlider('contrast', 'contrast', 'contrastVal');
  bindColorSlider('saturation', 'saturation', 'saturationVal');
  function colorFilterCss() {
    if (state.brightness === 100 && state.contrast === 100 && state.saturation === 100) return 'none';
    return `brightness(${state.brightness}%) contrast(${state.contrast}%) saturate(${state.saturation}%)`;
  }

  function computeCanvasSize(ratioOverride) {
    const ratio = ratioOverride || state.ratio;
    const qualityMap = { 1080: 1080, 720: 720, 480: 480 };
    const shortSide = qualityMap[state.quality] || 720;
    const ratioMap = { '2:1': 2, '3:4': 3/4, '21:9': 21/9, '4:5': 4/5, '9:16': 9/16, '1:1': 1, '16:9': 16/9 };
    let ar = ratioMap[ratio];
    if (!ar) {
      const first = state.clips[0]?.el;
      const nw = first ? (first.videoWidth || first.naturalWidth) : 16;
      const nh = first ? (first.videoHeight || first.naturalHeight) : 9;
      ar = nw / nh || 16 / 9;
    }
    let w, h;
    if (ar >= 1) { w = Math.round(shortSide * ar); h = shortSide; } else { h = Math.round(shortSide / ar); w = shortSide; }
    return { w, h };
  }

  // يرسم عنصر (فيديو أو صورة) بأسلوب object-fit: cover داخل مربع الإخراج، مع تطبيق فلتر الألوان إن وُجد
  function drawCover(ctx, el, w, h) {
    const nw = el.videoWidth || el.naturalWidth, nh = el.videoHeight || el.naturalHeight;
    const scale = Math.max(w / nw, h / nh);
    const dw = nw * scale, dh = nh * scale;
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    ctx.filter = colorFilterCss();
    ctx.drawImage(el, dx, dy, dw, dh);
    ctx.filter = 'none';
  }

  // يرسم عنوان نصي فوق المقطع بخط عربي متصل واتجاه RTL صحيح
  function drawClipCaption(ctx, text, w, h) {
    if (!text) return;
    const fontSize = Math.max(20, Math.round(w / 34));
    const barHeight = fontSize + 34;
    ctx.save();
    ctx.fillStyle = 'rgba(20,19,31,0.82)';
    ctx.fillRect(0, h - barHeight, w, barHeight);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${fontSize}px Tajawal, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, h - barHeight / 2, w - 60);
    ctx.restore();
  }

  // ينسخ الإطار الحالي من الكانفاس لاستخدامه في انتقال "ذوبان" مع المقطع التالي
  function snapshotCanvas(ctx, w, h) {
    const snap = document.createElement('canvas');
    snap.width = w; snap.height = h;
    snap.getContext('2d').drawImage(ctx.canvas, 0, 0);
    return snap;
  }

  // يرسم فوق الإطار الحالي طبقة الانتقال (تلاشي للأسود أو ذوبان مع اللقطة السابقة)
  function drawTransitionOverlay(ctx, w, h, type, alpha, prevSnapshot) {
    if (type === 'fade') {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    } else if (type === 'dissolve' && prevSnapshot) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(prevSnapshot, 0, 0, w, h);
      ctx.restore();
    }
  }

  const TEXT_CARD_MS = 2000;

  // يرسم بطاقة نصية بسيطة بلون العلامة التجارية (تُستخدم للمقدمة والخاتمة الجاهزة)
  function playTextCard(ctx, w, h, text) {
    return new Promise((resolve) => {
      const start = performance.now();
      function frame(now) {
        const t = now - start;
        ctx.fillStyle = '#4F3FF0';
        ctx.fillRect(0, 0, w, h);
        let alpha = 1;
        if (t < 300) alpha = t / 300;
        else if (t > TEXT_CARD_MS - 300) alpha = Math.max(0, (TEXT_CARD_MS - t) / 300);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.direction = isEn ? 'ltr' : 'rtl';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `800 ${Math.round(w / 18)}px Tajawal, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, w / 2, h / 2, w - 100);
        ctx.restore();
        if (t < TEXT_CARD_MS) requestAnimationFrame(frame);
        else { resolve(snapshotCanvas(ctx, w, h)); }
      }
      requestAnimationFrame(frame);
    });
  }

  // ---------- مزج الصوت: يربط صوت كل فيديو + الموسيقى الخلفية عبر Web Audio API ----------
  let audioCtx = null, streamDest = null, musicGainNode = null;
  function ensureAudioGraph() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    streamDest = audioCtx.createMediaStreamDestination();
  }
  function getClipGain(clip) {
    if (clip.type !== 'video') return null;
    if (clip._gainNode) return clip._gainNode;
    try {
      ensureAudioGraph();
      const source = audioCtx.createMediaElementSource(clip.el);
      const gain = audioCtx.createGain();
      gain.gain.value = 0; // مقفول افتراضيًا، يُفتح فقط وقت تشغيل هذا المقطع تحديدًا
      source.connect(gain);
      gain.connect(audioCtx.destination); // سماع مباشر أثناء المعالجة
      gain.connect(streamDest); // تسجيل داخل الفيديو الناتج
      clip._gainNode = gain;
    } catch (e) { /* بعض المتصفحات القديمة قد لا تدعم createMediaElementSource — نكمل بدون مزج صوتي لهذا المقطع */ }
    return clip._gainNode;
  }
  function getMusicGain(audioEl) {
    if (musicGainNode) return musicGainNode;
    try {
      ensureAudioGraph();
      const source = audioCtx.createMediaElementSource(audioEl);
      const gain = audioCtx.createGain();
      source.connect(gain);
      gain.connect(audioCtx.destination);
      gain.connect(streamDest);
      musicGainNode = gain;
    } catch (e) {}
    return musicGainNode;
  }
  function silenceAllClipGains() {
    state.clips.forEach((c) => { if (c._gainNode) c._gainNode.gain.value = 0; });
  }

  // يرسم صورة بأسلوب object-fit: cover مع حركة كاميرا بطيئة اختيارية (Ken Burns)
  function drawCoverKenBurns(ctx, el, w, h, zoomScale) {
    const nw = el.videoWidth || el.naturalWidth, nh = el.videoHeight || el.naturalHeight;
    const baseScale = Math.max(w / nw, h / nh) * zoomScale;
    const dw = nw * baseScale, dh = nh * baseScale;
    const dx = (w - dw) / 2, dy = (h - dh) / 2;
    ctx.filter = colorFilterCss();
    ctx.drawImage(el, dx, dy, dw, dh);
    ctx.filter = 'none';
  }

  function playImageClip(clip, ctx, w, h, durationMs, opts) {
    return new Promise((resolve) => {
      const start = performance.now();
      const maxScale = 1.12;
      function frame(now) {
        const t = now - start;
        ctx.clearRect(0, 0, w, h);
        if (state.kenBurns) {
          const p = Math.min(1, t / durationMs);
          const scale = opts.kbDirection === 'out' ? maxScale - (maxScale - 1.0) * p : 1.0 + (maxScale - 1.0) * p;
          drawCoverKenBurns(ctx, clip.el, w, h, scale);
        } else {
          drawCover(ctx, clip.el, w, h);
        }
        if (opts.introType !== 'cut' && t < opts.introMs) {
          const alpha = 1 - t / opts.introMs;
          drawTransitionOverlay(ctx, w, h, opts.introType, alpha, opts.prevSnapshot);
        }
        if (opts.transition === 'fade' && !opts.isLast && t > durationMs - opts.introMs) {
          const alpha = (t - (durationMs - opts.introMs)) / opts.introMs;
          drawTransitionOverlay(ctx, w, h, 'fade', Math.min(1, alpha), null);
        }
        drawClipCaption(ctx, clip.caption, w, h);
        if (t < durationMs) requestAnimationFrame(frame);
        else { opts.onDone(snapshotCanvas(ctx, w, h)); resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  function playVideoClip(clip, ctx, w, h, opts) {
    return new Promise((resolve) => {
      const vid = clip.el;
      vid.currentTime = clip.trimStart;
      vid.muted = false;
      const gain = getClipGain(clip);
      if (gain) { silenceAllClipGains(); gain.gain.value = clip.volume; }
      const trimmedDuration = (clip.trimEnd - clip.trimStart) * 1000;
      const start = performance.now();
      function frame(now) {
        const t = now - start;
        ctx.clearRect(0, 0, w, h);
        drawCover(ctx, vid, w, h);
        if (opts.introType !== 'cut' && t < opts.introMs) {
          const alpha = 1 - t / opts.introMs;
          drawTransitionOverlay(ctx, w, h, opts.introType, alpha, opts.prevSnapshot);
        }
        if (opts.transition === 'fade' && !opts.isLast && t > trimmedDuration - opts.introMs) {
          const alpha = (t - (trimmedDuration - opts.introMs)) / opts.introMs;
          drawTransitionOverlay(ctx, w, h, 'fade', Math.min(1, alpha), null);
        }
        drawClipCaption(ctx, clip.caption, w, h);
        if (t < trimmedDuration && !vid.ended) requestAnimationFrame(frame);
        else {
          vid.pause();
          if (gain) gain.gain.value = 0;
          opts.onDone(snapshotCanvas(ctx, w, h));
          resolve();
        }
      }
      vid.play().then(() => requestAnimationFrame(frame)).catch(() => resolve());
    });
  }

  // ---------- ينفّذ تصدير نسخة واحدة كاملة (يُستخدم للنسخة الأساسية والنسخ الإضافية) ----------
  async function renderOneVersion(w, h, targetCanvas, audioEl, onClipStatus, onProgress) {
    const ctx = targetCanvas.getContext('2d');
    const videoStream = targetCanvas.captureStream(30);
    const audioTracks = streamDest ? streamDest.stream.getAudioTracks() : [];
    const combinedStream = audioTracks.length
      ? new MediaStream([...videoStream.getVideoTracks(), ...audioTracks])
      : videoStream;

    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    const recorder = new MediaRecorder(combinedStream, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const donePromise = new Promise((resolve) => { recorder.onstop = resolve; });

    recorder.start();
    if (audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); }

    const wantIntro = $('addIntro').checked && $('introText').value.trim();
    const wantOutro = $('addOutro').checked && $('outroText').value.trim();
    const totalMs = state.clips.reduce((sum, c) => sum + (c.type === 'video' ? (c.trimEnd - c.trimStart) * 1000 : c.duration * 1000), 0)
      + (wantIntro ? TEXT_CARD_MS : 0) + (wantOutro ? TEXT_CARD_MS : 0);
    let elapsed = 0;

    if (wantIntro) {
      onClipStatus(L.introCard);
      await playTextCard(ctx, w, h, $('introText').value.trim());
      elapsed += TEXT_CARD_MS;
      onProgress(Math.min(100, (elapsed / totalMs) * 100));
    }

    let prevSnapshot = null;
    for (let i = 0; i < state.clips.length; i++) {
      const clip = state.clips[i];
      const isLast = i === state.clips.length - 1;
      const clipDurationMs = clip.type === 'video' ? (clip.trimEnd - clip.trimStart) * 1000 : clip.duration * 1000;
      const introType = i === 0 ? 'cut' : state.transition;
      const introMs = introType === 'cut' ? 0 : Math.min(TRANSITION_MS, clipDurationMs * 0.4);
      onClipStatus(L.processingClip(i + 1, state.clips.length));
      const opts = {
        introType, introMs, prevSnapshot, isLast, transition: state.transition,
        kbDirection: i % 2 === 0 ? 'in' : 'out',
        onDone: (snap) => { prevSnapshot = snap; },
      };
      if (clip.type === 'video') await playVideoClip(clip, ctx, w, h, opts);
      else await playImageClip(clip, ctx, w, h, clipDurationMs, opts);
      elapsed += clipDurationMs;
      onProgress(Math.min(100, (elapsed / totalMs) * 100));
    }

    if (wantOutro) {
      onClipStatus(L.outroCard);
      await playTextCard(ctx, w, h, $('outroText').value.trim());
      elapsed += TEXT_CARD_MS;
      onProgress(Math.min(100, (elapsed / totalMs) * 100));
    }

    if (audioEl) audioEl.pause();
    if (musicGainNode) musicGainNode.gain.value = 0;
    silenceAllClipGains();
    recorder.stop();
    await donePromise;
    return new Blob(chunks, { type: 'video/webm' });
  }

  // ---------- ينشئ بطاقة نتيجة لنسخة إضافية (أبعاد غير أساسية) داخل extraResultsWrap ----------
  function createExtraResultCard(label) {
    const wrap = $('extraResultsWrap');
    const card = document.createElement('div');
    card.className = 'extra-result-card';
    card.innerHTML = `
      <div class="label">${label}</div>
      <canvas></canvas>
      <video controls style="display:none;max-width:280px;border-radius:10px;background:#000;"></video>
      <div class="status">…</div>
      <a class="btn btn-primary" download style="display:none;"></a>
    `;
    wrap.appendChild(card);
    return {
      canvas: card.querySelector('canvas'),
      video: card.querySelector('video'),
      status: card.querySelector('.status'),
      link: card.querySelector('a'),
    };
  }

  async function startExport() {
    if (!state.clips.length) { alert(L.addClipFirst); return; }
    exportBtn.disabled = true;
    previewWrap.style.display = 'block';
    downloadLink.style.display = 'none';
    resultVideo.style.display = 'none';
    resultVideo.removeAttribute('src');
    canvas.style.display = 'block';
    $('extraResultsWrap').innerHTML = '';

    ensureAudioGraph();
    if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch (e) {} }

    let audioEl = null;
    if (state.audioFile) {
      audioEl = new Audio(state.audioUrl);
      audioEl.loop = true;
      await new Promise((res) => { audioEl.onloadedmetadata = res; audioEl.load(); });
      const mg = getMusicGain(audioEl);
      if (mg) mg.gain.value = state.musicVolume;
      else audioEl.muted = false;
    }

    // نحدد قائمة الأبعاد المطلوب تصديرها: الأساسية + أي إضافية مختارة (بدون تكرار)
    const extraRatiosWanted = [];
    if ($('extraRatio916').checked && state.ratio !== '9:16') extraRatiosWanted.push('9:16');
    if ($('extraRatio169').checked && state.ratio !== '16:9') extraRatiosWanted.push('16:9');

    // --- النسخة الأساسية (تستخدم الكانفاس والمعاينة الرئيسية) ---
    const { w, h } = computeCanvasSize();
    canvas.width = w; canvas.height = h;
    const blob = await renderOneVersion(
      w, h, canvas, audioEl,
      (msg) => { statusEl.textContent = msg; },
      (pct) => { progressBar.style.width = pct + '%'; }
    );
    statusEl.textContent = L.finishingExport;

    if (lastResultUrl) URL.revokeObjectURL(lastResultUrl);
    const url = URL.createObjectURL(blob);
    lastResultUrl = url;
    canvas.style.display = 'none';
    resultVideo.src = url;
    resultVideo.style.display = 'block';
    resultVideo.load();
    downloadLink.href = url;
    downloadLink.download = 'fawran-quick-edit.webm';
    downloadLink.textContent = L.downloadLabel(Math.round(blob.size / 1024 / 1024 * 10) / 10);
    downloadLink.style.display = 'block';
    statusEl.textContent = L.doneExport;

    // --- النسخ الإضافية (كل واحدة في بطاقة منفصلة) ---
    const ratioLabels = { '9:16': '9:16 📱', '16:9': '16:9 🖥️' };
    for (const extraRatio of extraRatiosWanted) {
      const card = createExtraResultCard(ratioLabels[extraRatio]);
      const size = computeCanvasSize(extraRatio);
      card.canvas.width = size.w; card.canvas.height = size.h;
      card.canvas.style.display = 'block';
      const extraBlob = await renderOneVersion(
        size.w, size.h, card.canvas, audioEl,
        (msg) => { card.status.textContent = msg; },
        () => {}
      );
      card.canvas.style.display = 'none';
      const extraUrl = URL.createObjectURL(extraBlob);
      card.video.src = extraUrl;
      card.video.style.display = 'block';
      card.video.load();
      card.link.href = extraUrl;
      card.link.download = `fawran-quick-edit-${extraRatio.replace(':', 'x')}.webm`;
      card.link.textContent = L.downloadLabel(Math.round(extraBlob.size / 1024 / 1024 * 10) / 10);
      card.link.style.display = 'block';
      card.status.textContent = L.doneExport;
    }

    exportBtn.disabled = false;
  }

  exportBtn.addEventListener('click', startExport);
  renderClips();
})();
