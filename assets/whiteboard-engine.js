/* Fawran.tools — Whiteboard Video Engine
   يحوّل مجموعة صور لفيديو "رسم على سبورة" حقيقي: تمرير أول خشن للخلفية،
   ثم كشف تدريجي دقيق للتفاصيل عبر شبكة خلايا، مع مؤشر يد اختياري،
   ومزامنة صوتية، وتصدير فعلي عبر canvas.captureStream + MediaRecorder. */
(function () {
  const $ = (id) => document.getElementById(id);
  const isEn = document.documentElement.lang === 'en';
  const L = isEn ? {
    reorderHint: (n) => `Images: ${n} — press and hold an image to drag-reorder, or click normally to edit its duration and caption`,
    sceneTitle: (n) => `Scene #${n} settings`,
    auto: 'Auto', sec: 's', customized: 'Customized',
    addImageFirst: 'Add at least one image first.',
    drawingScene: (i, n) => `Drawing scene ${i} of ${n}...`,
    addingEnding: 'Adding the ending...',
    finishingExport: 'Finishing export...',
    doneExport: 'Export complete — preview before downloading ✓',
    downloadLabel: (mb) => `⬇️ Download video (${mb} MB)`,
    overwriteConfirm: 'Some images already have a caption — overwrite them with the imported text?',
  } : {
    reorderHint: (n) => `عدد الصور: ${n} — اضغط مطوّلًا على صورة ثم اسحبها لإعادة الترتيب، أو اضغط ضغطة عادية لتعديل مدتها وعنوانها`,
    sceneTitle: (n) => `إعدادات المشهد #${n}`,
    auto: 'تلقائي', sec: 'ث', customized: 'مخصّص',
    addImageFirst: 'أضف صورة واحدة على الأقل أولًا.',
    drawingScene: (i, n) => `جارٍ رسم المشهد ${i} من ${n}...`,
    addingEnding: 'جارٍ إضافة النهاية...',
    finishingExport: 'جارٍ إنهاء التصدير...',
    doneExport: 'اكتمل التصدير — شاهد المعاينة قبل التحميل ✓',
    downloadLabel: (mb) => `⬇️ تحميل الفيديو (${mb} MB)`,
    overwriteConfirm: 'بعض الصور فيها عنوان بالفعل — نستبدله بالنص المستورد؟',
  };

  const state = {
    images: [], // {file, url, img(HTMLImageElement), duration(null=تلقائي), caption(نص اختياري)}
    audioFile: null,
    audioUrl: null,
    quality: 720,
    ratio: 'auto',
    drawingStyle: 'bw',
    syncAudio: true,
    coloredEnding: true,
    showHand: true,
    kenBurns: true,
    speed: 1,
    fps: 25,
    detailSpeed: 6,
    bgSpeed: 12,
    lineQuality: 3,
    holdDuration: 2,
  };

  const STYLE_PRESETS = {
    bw:         { bg: [255, 255, 255], line: [25, 25, 25],    hand: true  },
    blueChalk:  { bg: [15, 42, 90],    line: [190, 225, 245], hand: true  },
    blackboard: { bg: [24, 24, 24],    line: [235, 235, 225], hand: true  },
  };

  const thumbRow = $('thumbRow'), addImageBtn = $('addImageBtn'), imageInput = $('imageInput'), countHint = $('countHint');
  const audioDrop = $('audioDrop'), audioInput = $('audioInput');
  const renderBtn = $('renderBtn'), downloadLink = $('downloadLink');
  const previewWrap = $('previewWrap'), canvas = $('wbCanvas'), resultVideo = $('wbResultVideo'), progressBar = $('wbProgressBar'), statusEl = $('wbStatus');
  const sceneEditor = $('sceneEditor'), sceneEditorTitle = $('sceneEditorTitle'), sceneDuration = $('sceneDuration'), sceneDurVal = $('sceneDurVal'), sceneCaption = $('sceneCaption'), closeSceneEditor = $('closeSceneEditor');
  const bulkImportBtn = $('bulkImportBtn'), bulkImportPanel = $('bulkImportPanel'), bulkImportText = $('bulkImportText'), applyBulkImport = $('applyBulkImport'), closeBulkImport = $('closeBulkImport');
  let lastResultUrl = null;
  let editingIdx = null;

  // ---------- رفع وترتيب الصور ----------
  function loadImageFile(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ file, url, img, duration: null, caption: '' });
      img.src = url;
    });
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    for (const f of files) {
      const item = await loadImageFile(f);
      state.images.push(item);
    }
    renderThumbs();
  }

  function renderThumbs() {
    thumbRow.querySelectorAll('.thumb-item').forEach((el) => el.remove());
    state.images.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'thumb-item';
      el.draggable = true;
      el.dataset.idx = String(i);
      const badge = (item.duration || item.caption) ? `<span class="thumb-edited" title="${L.customized}">✎</span>` : '';
      el.innerHTML = `<img src="${item.url}" alt=""/><span class="thumb-num">${i + 1}</span><button type="button" class="thumb-remove" data-remove="${i}">×</button>${badge}`;
      thumbRow.insertBefore(el, addImageBtn);
    });
    countHint.textContent = L.reorderHint(state.images.length);
  }

  addImageBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', () => { addFiles(imageInput.files); imageInput.value = ''; });

  thumbRow.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-remove]');
    if (removeBtn) {
      const idx = +removeBtn.dataset.remove;
      URL.revokeObjectURL(state.images[idx].url);
      state.images.splice(idx, 1);
      if (editingIdx === idx) closeEditor();
      renderThumbs();
      return;
    }
    const item = e.target.closest('.thumb-item');
    if (item) openSceneEditor(+item.dataset.idx);
  });

  // ---------- محرر المشهد الفردي (مدة + عنوان مخصص لكل صورة) ----------
  function openSceneEditor(idx) {
    editingIdx = idx;
    const img = state.images[idx];
    sceneEditorTitle.textContent = L.sceneTitle(idx + 1);
    sceneDuration.value = img.duration || 0;
    sceneDurVal.textContent = img.duration ? img.duration.toFixed(1) + ' ' + L.sec : L.auto;
    sceneCaption.value = img.caption || '';
    sceneEditor.style.display = 'block';
    sceneEditor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function closeEditor() {
    editingIdx = null;
    sceneEditor.style.display = 'none';
  }
  sceneDuration.addEventListener('input', () => {
    if (editingIdx === null) return;
    const v = +sceneDuration.value;
    state.images[editingIdx].duration = v > 0 ? v : null;
    sceneDurVal.textContent = v > 0 ? v.toFixed(1) + ' ' + L.sec : L.auto;
  });
  sceneCaption.addEventListener('input', () => {
    if (editingIdx === null) return;
    state.images[editingIdx].caption = sceneCaption.value;
  });
  sceneDuration.addEventListener('change', renderThumbs);
  sceneCaption.addEventListener('change', renderThumbs);
  closeSceneEditor.addEventListener('click', closeEditor);

  // سحب وإفلات لإعادة الترتيب
  let dragSrc = null;
  thumbRow.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.thumb-item');
    if (!item) return;
    dragSrc = +item.dataset.idx;
    item.classList.add('dragging');
  });
  thumbRow.addEventListener('dragend', (e) => {
    const item = e.target.closest('.thumb-item');
    if (item) item.classList.remove('dragging');
  });
  thumbRow.addEventListener('dragover', (e) => {
    e.preventDefault();
    const item = e.target.closest('.thumb-item');
    if (!item || dragSrc === null) return;
    const idx = +item.dataset.idx;
    if (idx === dragSrc) return;
    const moved = state.images.splice(dragSrc, 1)[0];
    state.images.splice(idx, 0, moved);
    dragSrc = idx;
    renderThumbs();
  });

  $('reverseBtn').addEventListener('click', () => { state.images.reverse(); renderThumbs(); });

  // ---------- استيراد سيناريو دفعة واحدة (بديل محلي 100% لأي تفريغ صوتي عبر سيرفر خارجي) ----------
  bulkImportBtn.addEventListener('click', () => {
    bulkImportPanel.style.display = bulkImportPanel.style.display === 'none' ? 'block' : 'none';
  });
  closeBulkImport.addEventListener('click', () => {
    bulkImportPanel.style.display = 'none';
    bulkImportText.value = '';
  });
  applyBulkImport.addEventListener('click', () => {
    if (!state.images.length) { alert(L.addImageFirst); return; }
    const lines = bulkImportText.value.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (!lines.length) return;
    const hasExisting = state.images.some((img) => img.caption);
    if (hasExisting && !confirm(L.overwriteConfirm)) return;
    state.images.forEach((img, i) => { if (lines[i]) img.caption = lines[i]; });
    renderThumbs();
    bulkImportPanel.style.display = 'none';
    bulkImportText.value = '';
  });

  // ---------- الصوت ----------
  audioDrop.addEventListener('click', () => audioInput.click());
  audioInput.addEventListener('change', () => {
    const f = audioInput.files[0];
    if (!f) return;
    state.audioFile = f;
    state.audioUrl = URL.createObjectURL(f);
    audioDrop.textContent = '🎵 ' + f.name;
    audioDrop.classList.add('has-file');
  });

  // ---------- الإعدادات ----------
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
  bindSegGroup('qualityGroup', 'quality', Number);
  bindSegGroup('ratioGroup', 'ratio');
  bindSegGroup('styleGroup', 'drawingStyle');

  $('syncAudio').addEventListener('change', (e) => (state.syncAudio = e.target.checked));
  $('coloredEnding').addEventListener('change', (e) => (state.coloredEnding = e.target.checked));
  $('showHand').addEventListener('change', (e) => (state.showHand = e.target.checked));
  $('kenBurns').addEventListener('change', (e) => (state.kenBurns = e.target.checked));

  function bindSlider(id, key, valEl, fmt) {
    const el = $(id);
    el.addEventListener('input', () => {
      state[key] = +el.value;
      $(valEl).textContent = fmt ? fmt(+el.value) : el.value;
    });
  }
  bindSlider('speed', 'speed', 'speedVal', (v) => 'x' + v.toFixed(1));
  bindSlider('fps', 'fps', 'fpsVal');
  bindSlider('detailSpeed', 'detailSpeed', 'detailVal');
  bindSlider('bgSpeed', 'bgSpeed', 'bgVal');
  bindSlider('lineQuality', 'lineQuality', 'qualVal');
  bindSlider('holdDuration', 'holdDuration', 'holdVal', (v) => v.toFixed(1) + ' ' + L.sec);

  $('advToggle').addEventListener('click', () => {
    const body = $('advBody');
    const open = body.classList.toggle('open');
    $('advArrow').textContent = open ? '▴' : '▾';
  });

  // ---------- حساب أبعاد الكانفاس (تقبل نسبة مخصصة لدعم التصدير متعدد الأبعاد) ----------
  function computeCanvasSize(ratioOverride) {
    const ratio = ratioOverride || state.ratio;
    const qualityMap = { 1080: 1080, 720: 720, 480: 480 };
    const shortSide = qualityMap[state.quality] || 720;
    let w, h;
    if (ratio === '9:16') { h = Math.round(shortSide * (16 / 9)); w = shortSide; }
    else if (ratio === '16:9') { w = Math.round(shortSide * (16 / 9)); h = shortSide; }
    else {
      // تلقائي: ياخد أبعاد أول صورة
      const first = state.images[0]?.img;
      const ar = first ? first.naturalWidth / first.naturalHeight : 16 / 9;
      if (ar >= 1) { w = Math.round(shortSide * ar); h = shortSide; }
      else { h = Math.round(shortSide / ar); w = shortSide; }
    }
    return { w, h };
  }

  // ---------- بناء شبكة الكشف (خلايا الرسم) — بلوكات مبعثرة (لا مسح خطي) ----------
  // ملاحظة مهمة: أي ترتيب "صف بصف" على كانفاس عريض (16:9 مثلًا) بيبان كخط أفقي
  // بيمسح فجأة، مش رسم يد طبيعي. الحل: تقسيم الصورة لبلوكات صغيرة محلية (تايلات)
  // وترتيبها بشكل مبعثر (Shuffle) بذرة عشوائية ثابتة، فيبان الكشف كتعبئة تدريجية
  // متفرقة عبر الصورة كلها في نفس الوقت — زي ما بيحصل فعليًا في فيديوهات السبورة الاحترافية.
  function seededShuffle(arr, seed) {
    let s = seed;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildRevealGrid(cols, rows, tileCells) {
    const tileCols = Math.ceil(cols / tileCells), tileRows = Math.ceil(rows / tileCells);
    const tiles = [];
    for (let tr = 0; tr < tileRows; tr++) {
      for (let tc = 0; tc < tileCols; tc++) tiles.push({ tr, tc });
    }
    seededShuffle(tiles, 42);

    const cells = [];
    for (const { tr, tc } of tiles) {
      for (let lr = 0; lr < tileCells; lr++) {
        const r = tr * tileCells + lr;
        if (r >= rows) continue;
        const innerOrder = lr % 2 === 0 ? [...Array(tileCells).keys()] : [...Array(tileCells).keys()].reverse();
        for (const lc of innerOrder) {
          const c = tc * tileCells + lc;
          if (c >= cols) continue;
          cells.push({ r, c });
        }
      }
    }
    return cells;
  }

  // يرسم صورة واحدة (object-fit: contain) على كانفاس مؤقت بنفس أبعاد المخرج
  function drawContained(ctx, img, w, h) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const ar = img.naturalWidth / img.naturalHeight;
    const cw = w / h > ar ? h * ar : w;
    const ch = w / h > ar ? h : w / ar;
    const x = (w - cw) / 2, y = (h - ch) / 2;
    ctx.drawImage(img, x, y, cw, ch);
  }

  function drawHand(ctx, x, y, isDarkBg) {
    ctx.save();
    ctx.translate(x, y);
    if (isDarkBg) {
      ctx.shadowColor = 'rgba(255,255,255,0.35)';
      ctx.shadowBlur = 6;
    }
    ctx.save();
    ctx.rotate(-0.5);
    ctx.fillStyle = '#F0A93B';
    ctx.fillRect(-4, -50, 8, 42);
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(-4, -14, 8, 10);
    ctx.beginPath();
    ctx.moveTo(-4, -50); ctx.lineTo(4, -50); ctx.lineTo(0, -58);
    ctx.closePath();
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#F0C89A';
    ctx.strokeStyle = isDarkBg ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(5, 10, 22, 16, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // ---------- تحويل الصورة لرسم تخطيطي بكشف حواف حقيقي (Sobel) بلون خط وخلفية قابلين للتخصيص ----------
  // هذه هي نفس التقنية المستخدمة في فيديوهات السبورة الاحترافية: رسم الخطوط
  // التخطيطية أولًا، ثم التحول للصورة الملونة الكاملة بعد اكتمال الرسم.
  // bgColor/lineColor: مصفوفة [r,g,b] — تُستخدم للتلوين حسب نمط الرسم المختار (أبيض وأسود / طباشير أزرق / سبورة سوداء)
  function sobelSketch(ctx, w, h, bgColor, lineColor) {
    const src = ctx.getImageData(0, 0, w, h);
    const d = src.data;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      gray[i] = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
    }
    const out = ctx.createImageData(w, h);
    const od = out.data;
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1], gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sx = 0, sy = 0;
        if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
          let k = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const val = gray[(y + ky) * w + (x + kx)];
              sx += val * gx[k]; sy += val * gy[k]; k++;
            }
          }
        }
        const mag = Math.min(255, Math.sqrt(sx * sx + sy * sy));
        const t = mag / 255;
        const o = (y * w + x) * 4;
        od[o]     = Math.round(bgColor[0] + (lineColor[0] - bgColor[0]) * t);
        od[o + 1] = Math.round(bgColor[1] + (lineColor[1] - bgColor[1]) * t);
        od[o + 2] = Math.round(bgColor[2] + (lineColor[2] - bgColor[2]) * t);
        od[o + 3] = 255;
      }
    }
    return out;
  }

  // يرسم نص عنوان المشهد (إن وُجد) بخط عربي متصل واتجاه RTL صحيح، أسفل الكانفاس
  function drawCaption(ctx, text, w, h, isDarkBg) {
    if (!text) return;
    const fontSize = Math.max(20, Math.round(w / 34));
    const barHeight = fontSize + 34;
    ctx.save();
    ctx.fillStyle = isDarkBg ? 'rgba(255,255,255,0.92)' : 'rgba(20,19,31,0.82)';
    ctx.fillRect(0, h - barHeight, w, barHeight);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${fontSize}px Tajawal, sans-serif`;
    ctx.fillStyle = isDarkBg ? '#14131F' : '#ffffff';
    ctx.fillText(text, w / 2, h - barHeight / 2, w - 60);
    ctx.restore();
  }

  // ---------- محرك الرسم لمشهد واحد ----------
  // المنطق الجديد (مطابق لأسلوب فيديوهات السبورة الاحترافية):
  // 1) تحويل الصورة لرسم تخطيطي أبيض وأسود بكشف حواف حقيقي (Sobel).
  // 2) كشف الرسم التخطيطي تدريجيًا ببلوكات مبعثرة، مع مؤشر يد يتابع نقطة الرسم.
  // 3) تحوّل (Cross-fade) من الرسم التخطيطي للصورة الملونة الكاملة.
  // 4) ثبات على الصورة الملونة لمدة "مدة الصورة النهائية".
  function playScene(img, ctxOut, w, h, durationMs, opts) {
    return new Promise((resolve) => {
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const offCtx = off.getContext('2d');
      drawContained(offCtx, img, w, h);

      const style = STYLE_PRESETS[opts.drawingStyle] || STYLE_PRESETS.bw;
      const isDarkBg = style.bg[0] + style.bg[1] + style.bg[2] < 380;

      // نسخة الرسم التخطيطي (تُحسب مرة واحدة بس لكل مشهد) بألوان النمط المختار
      const sketchCanvas = document.createElement('canvas');
      sketchCanvas.width = w; sketchCanvas.height = h;
      const sketchCtx = sketchCanvas.getContext('2d');
      sketchCtx.drawImage(off, 0, 0);
      sketchCtx.putImageData(sobelSketch(sketchCtx, w, h, style.bg, style.line), 0, 0);

      const bgCss = `rgb(${style.bg[0]},${style.bg[1]},${style.bg[2]})`;

      // توزيع الوقت: كشف الرسم (الجزء الأكبر) + تحوّل للون + ثبات نهائي
      const crossfadeMs = Math.max(300, Math.min(1400, 1200 - opts.bgSpeed * 30));
      const revealMs = Math.max(600, durationMs - crossfadeMs - opts.holdMs);

      const cellSize = Math.max(10, 30 - opts.detailSpeed * 2);
      const cols = Math.ceil(w / cellSize), rows = Math.ceil(h / cellSize);
      const tileCells = Math.max(2, 7 - opts.lineQuality);
      const grid = buildRevealGrid(cols, rows, tileCells);
      const totalCells = grid.length;

      const start = performance.now();

      function frame(now) {
        const t = now - start;
        ctxOut.clearRect(0, 0, w, h);
        ctxOut.fillStyle = bgCss;
        ctxOut.fillRect(0, 0, w, h);

        if (t < revealMs) {
          // مرحلة 1: كشف الرسم التخطيطي تدريجيًا ببلوكات مبعثرة (تعبئة طبيعية)
          const p = Math.min(1, t / revealMs);
          const revealCount = Math.floor(p * totalCells);
          ctxOut.save();
          ctxOut.beginPath();
          for (let i = 0; i < revealCount; i++) {
            const cell = grid[i];
            ctxOut.rect(cell.c * cellSize, cell.r * cellSize, cellSize + 1, cellSize + 1);
          }
          ctxOut.clip();
          ctxOut.drawImage(sketchCanvas, 0, 0);
          ctxOut.restore();

          if (opts.showHand && revealCount > 0 && revealCount < totalCells) {
            const cur = grid[revealCount - 1];
            drawHand(ctxOut, cur.c * cellSize + cellSize / 2, cur.r * cellSize + cellSize / 2, isDarkBg);
          }
          drawCaption(ctxOut, opts.caption, w, h, isDarkBg);
          requestAnimationFrame(frame);
          return;
        }

        const dt = t - revealMs;
        if (dt < crossfadeMs) {
          // مرحلة 2: تحوّل تدريجي من الرسم التخطيطي للصورة الملونة الكاملة
          const p = Math.min(1, dt / crossfadeMs);
          ctxOut.drawImage(sketchCanvas, 0, 0);
          ctxOut.globalAlpha = p;
          ctxOut.drawImage(off, 0, 0);
          ctxOut.globalAlpha = 1;
          drawCaption(ctxOut, opts.caption, w, h, false);
          requestAnimationFrame(frame);
          return;
        }

        // مرحلة 3: الصورة كاملة — حركة كاميرا بطيئة (Ken Burns) اختيارية أثناء الثبات النهائي
        if (opts.kenBurns) {
          const holdStartT = revealMs + crossfadeMs;
          const holdSpan = Math.max(1, durationMs - holdStartT);
          const p3 = Math.min(1, (t - holdStartT) / holdSpan);
          const maxScale = 1.12;
          const scale = opts.kbDirection === 'out'
            ? maxScale - (maxScale - 1.0) * p3
            : 1.0 + (maxScale - 1.0) * p3;
          const sw = w / scale, sh = h / scale;
          const sx = (w - sw) / 2, sy = (h - sh) / 2;
          ctxOut.drawImage(off, sx, sy, sw, sh, 0, 0, w, h);
        } else {
          ctxOut.drawImage(off, 0, 0);
        }
        drawCaption(ctxOut, opts.caption, w, h, false);
        if (t < durationMs) { requestAnimationFrame(frame); }
        else { resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  async function playEnding(ctxOut, w, h, durationMs) {
    return new Promise((resolve) => {
      const start = performance.now();
      function frame(now) {
        const t = now - start;
        const p = Math.min(1, t / durationMs);
        ctxOut.fillStyle = '#4F3FF0';
        ctxOut.globalAlpha = p;
        ctxOut.fillRect(0, 0, w, h);
        ctxOut.globalAlpha = 1;
        if (p < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  // ---------- التصدير الكامل ----------
  // يحسب مدة كل مشهد بالمللي ثانية: يحترم المدة المخصصة يدويًا لكل صورة،
  // ويوزّع مدة الصوت (عند تفعيل المزامنة) بشكل نسبي حسب "وزن" كل صورة
  // (المدة المخصصة إن وُجدت، أو المدة التلقائية الافتراضية كوزن).
  function computeSceneDurations() {
    const baseAutoMs = (2500 + state.detailSpeed * 400) / state.speed;
    const baseAutoSec = baseAutoMs / 1000;
    if (state.syncAudio && state._totalAudioMs > 0) {
      const weights = state.images.map((img) => img.duration || baseAutoSec);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const totalAudioSec = state._totalAudioMs / 1000;
      return weights.map((wgt) => (totalAudioSec * (wgt / totalWeight)) * 1000);
    }
    return state.images.map((img) => (img.duration ? img.duration * 1000 : baseAutoMs) / state.speed);
  }

  // ---------- ينفّذ تصدير نسخة واحدة كاملة (يُستخدم للنسخة الأساسية والنسخ الإضافية) ----------
  async function renderOneVersion(w, h, targetCanvas, sceneDurations, audioEl, onSceneStatus, onProgress, onEndingStatus) {
    const ctx = targetCanvas.getContext('2d');
    const videoStream = targetCanvas.captureStream(state.fps);
    let combinedStream = videoStream;
    if (audioEl) {
      try {
        const audioStream = audioEl.captureStream ? audioEl.captureStream() : audioEl.mozCaptureStream();
        combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
      } catch (e) { /* بعض المتصفحات لا تدعم captureStream على audio — نكمل بدون صوت */ }
    }

    const chunks = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    const recorder = new MediaRecorder(combinedStream, { mimeType });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const donePromise = new Promise((resolve) => { recorder.onstop = resolve; });

    recorder.start();
    if (audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); }

    const n = state.images.length;
    const holdMs = state.holdDuration * 1000;
    const totalMs = sceneDurations.reduce((a, b) => a + b, 0) + (state.coloredEnding ? 900 : 0);
    let elapsed = 0;
    for (let i = 0; i < n; i++) {
      onSceneStatus(i + 1, n);
      await playScene(state.images[i].img, ctx, w, h, sceneDurations[i], {
        bgSpeed: state.bgSpeed, detailSpeed: state.detailSpeed, lineQuality: state.lineQuality,
        showHand: state.showHand, holdMs, drawingStyle: state.drawingStyle, caption: state.images[i].caption,
        kenBurns: state.kenBurns, kbDirection: i % 2 === 0 ? 'in' : 'out',
      });
      elapsed += sceneDurations[i];
      onProgress(Math.min(100, (elapsed / totalMs) * 100));
    }

    if (state.coloredEnding) {
      if (onEndingStatus) onEndingStatus();
      await playEnding(ctx, w, h, 900);
    }

    if (audioEl) audioEl.pause();
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

  async function startRender() {
    if (!state.images.length) { alert(L.addImageFirst); return; }
    renderBtn.disabled = true;
    previewWrap.style.display = 'block';
    downloadLink.style.display = 'none';
    resultVideo.style.display = 'none';
    resultVideo.removeAttribute('src');
    canvas.style.display = 'block';
    $('extraResultsWrap').innerHTML = '';

    // نتأكد من تحميل خط Tajawal قبل رسم أي عنوان نصي فوق المشاهد
    try { await document.fonts.load('700 32px Tajawal'); await document.fonts.ready; } catch (e) {}

    let audioEl = null;
    state._totalAudioMs = 0;
    if (state.audioFile) {
      audioEl = new Audio(state.audioUrl);
      await new Promise((res) => { audioEl.onloadedmetadata = res; audioEl.load(); });
      state._totalAudioMs = audioEl.duration * 1000;
    }
    const sceneDurations = computeSceneDurations();

    // نحدد قائمة الأبعاد المطلوب تصديرها: الأساسية + أي إضافية مختارة (بدون تكرار)
    const extraRatiosWanted = [];
    if ($('extraRatio916').checked && state.ratio !== '9:16') extraRatiosWanted.push('9:16');
    if ($('extraRatio169').checked && state.ratio !== '16:9') extraRatiosWanted.push('16:9');

    // --- النسخة الأساسية (تستخدم الكانفاس والمعاينة الرئيسية) ---
    const { w, h } = computeCanvasSize();
    canvas.width = w; canvas.height = h;
    const blob = await renderOneVersion(
      w, h, canvas, sceneDurations, audioEl,
      (i, n) => { statusEl.textContent = L.drawingScene(i, n); },
      (pct) => { progressBar.style.width = pct + '%'; },
      () => { statusEl.textContent = L.addingEnding; }
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
    downloadLink.download = 'fawran-whiteboard-video.webm';
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
        size.w, size.h, card.canvas, sceneDurations, audioEl,
        (i, n) => { card.status.textContent = L.drawingScene(i, n); },
        () => {},
        () => { card.status.textContent = L.addingEnding; }
      );
      card.canvas.style.display = 'none';
      const extraUrl = URL.createObjectURL(extraBlob);
      card.video.src = extraUrl;
      card.video.style.display = 'block';
      card.video.load();
      card.link.href = extraUrl;
      card.link.download = `fawran-whiteboard-video-${extraRatio.replace(':', 'x')}.webm`;
      card.link.textContent = L.downloadLabel(Math.round(extraBlob.size / 1024 / 1024 * 10) / 10);
      card.link.style.display = 'block';
      card.status.textContent = L.doneExport;
    }

    renderBtn.disabled = false;
  }

  renderBtn.addEventListener('click', startRender);
})();
