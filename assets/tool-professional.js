/* Fawran Tools — shared professional tool-page enhancements */
(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const isEn = document.documentElement.lang === 'en';
    const main = document.querySelector('#main-content, main, [role="main"]');
    const guide = document.getElementById('how-to');
    if (!main || !guide) return;

    const labels = isEn ? {
      toolbar: 'Tool shortcuts',
      use: 'Use tool',
      guide: 'Step-by-step guide',
      copy: 'Copy page link',
      copied: 'Link copied',
      focus: 'Focus mode',
      exitFocus: 'Exit focus mode',
      print: 'Print guide',
      status: 'Tool status messages',
      exit: 'Exit focus mode',
    } : {
      toolbar: 'اختصارات الأداة',
      use: 'استخدام الأداة',
      guide: 'الشرح خطوة بخطوة',
      copy: 'نسخ رابط الصفحة',
      copied: 'تم نسخ الرابط',
      focus: 'وضع التركيز',
      exitFocus: 'إنهاء وضع التركيز',
      print: 'طباعة الدليل',
      status: 'رسائل حالة الأداة',
      exit: 'إنهاء وضع التركيز',
    };

    const workspace = document.querySelector('.tool-card-shell, .converter-shell, .currency-app, .editor-shell, .tool-workspace, .seo-tool') || main;
    if (!workspace.id) workspace.id = 'tool-workspace';

    const toolbar = document.createElement('nav');
    toolbar.className = 'tool-pro-toolbar';
    toolbar.setAttribute('aria-label', labels.toolbar);

    const makeLink = (text, href, className = '') => {
      const link = document.createElement('a');
      link.className = `tool-pro-action ${className}`.trim();
      link.href = href;
      link.textContent = text;
      return link;
    };
    const makeButton = (text, action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tool-pro-action';
      button.dataset.action = action;
      button.textContent = text;
      return button;
    };

    toolbar.append(
      makeLink(labels.use, `#${workspace.id}`, 'primary'),
      makeLink(labels.guide, '#how-to'),
      makeButton(labels.copy, 'copy-link'),
      makeButton(labels.focus, 'focus'),
      makeButton(labels.print, 'print-guide'),
    );

    const lede = main.querySelector('.tool-lede');
    (lede || main.querySelector('h1'))?.insertAdjacentElement('afterend', toolbar);

    const live = document.createElement('div');
    live.className = 'visually-hidden';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    live.setAttribute('aria-label', labels.status);
    document.body.appendChild(live);

    const copyButton = toolbar.querySelector('[data-action="copy-link"]');
    copyButton?.addEventListener('click', async () => {
      const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
      try {
        await navigator.clipboard.writeText(canonical);
      } catch (_) {
        const input = document.createElement('textarea');
        input.value = canonical;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      const previous = copyButton.textContent;
      copyButton.textContent = labels.copied;
      live.textContent = labels.copied;
      window.setTimeout(() => { copyButton.textContent = previous; }, 1600);
    });

    const focusButton = toolbar.querySelector('[data-action="focus"]');
    let fallbackFocus = false;
    let exitButton = null;

    const updateFocusButton = active => {
      if (focusButton) {
        focusButton.textContent = active ? labels.exitFocus : labels.focus;
        focusButton.setAttribute('aria-pressed', String(active));
      }
    };
    const exitFallback = () => {
      if (!fallbackFocus) return;
      fallbackFocus = false;
      workspace.classList.remove('tool-focus-overlay');
      document.body.classList.remove('tool-focus-active');
      exitButton?.remove();
      exitButton = null;
      updateFocusButton(false);
      focusButton?.focus();
    };
    const enterFallback = () => {
      fallbackFocus = true;
      workspace.classList.add('tool-focus-overlay');
      document.body.classList.add('tool-focus-active');
      exitButton = document.createElement('button');
      exitButton.type = 'button';
      exitButton.className = 'tool-focus-exit';
      exitButton.textContent = `× ${labels.exit}`;
      exitButton.addEventListener('click', exitFallback);
      workspace.prepend(exitButton);
      updateFocusButton(true);
      exitButton.focus();
    };

    focusButton?.addEventListener('click', async () => {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      } else if (fallbackFocus) {
        exitFallback();
      } else if (workspace.requestFullscreen) {
        try {
          await workspace.requestFullscreen();
        } catch (_) {
          enterFallback();
        }
      } else {
        enterFallback();
      }
    });
    document.addEventListener('fullscreenchange', () => {
      workspace.classList.toggle('tool-native-fullscreen', document.fullscreenElement === workspace);
      updateFocusButton(document.fullscreenElement === workspace || fallbackFocus);
    });

    toolbar.querySelector('[data-action="print-guide"]')?.addEventListener('click', () => {
      document.body.classList.add('print-tool-guide');
      window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-tool-guide'));

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && fallbackFocus) exitFallback();
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === '1') {
        event.preventDefault();
        workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (event.key === '2') {
        event.preventDefault();
        guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Give dynamically generated and legacy controls stable accessible names.
    const names = isEn ? {
      fileInput: 'Choose input file', files: 'Choose PDF files', imageInput: 'Choose images', editFileInput: 'Choose video or image files', editAudioInput: 'Choose background audio', audioInput: 'Choose narration audio',
      out: 'Generated output', resultsBox: 'Generated results', codeBox: 'Generated embed code', ocrResultTextarea: 'Extracted text', ocrFileInput: 'Choose an image for text extraction',
      quality: 'Output quality', tolerance: 'Color tolerance', feather: 'Edge softness', newColor: 'Background color to remove', exportColor: 'Export background color',
      bgColor1: 'Primary background color', bgColor2a: 'Gradient start color', bgColor2b: 'Gradient end color', textColor: 'Text color', titleColor: 'Title color', subColor: 'Subtitle color', badgeColor: 'Badge color',
      wField: 'Output width', hField: 'Output height', fitMode: 'Resize fit mode', presetSelect: 'Preset size', orientSelect: 'Page orientation', marginSelect: 'Page margins',
      amountInput: 'Amount to convert', countSelect: 'Number of addresses', domainSelect: 'Email domain', randomCount: 'Number of variations', count: 'Number of identifiers',
      iconText: 'Icon text', badgeText: 'Badge text', titleText: 'Title text', subText: 'Subtitle text', channelText: 'Channel name', logoText: 'Logo text',
      fromPage: 'First page', toPage: 'Last page', changefreq: 'Default change frequency', priority: 'Default priority', speechLang: 'Dictation language',
      clipTrimStart: 'Clip start time', clipTrimEnd: 'Clip end time', clipDuration: 'Clip duration', clipVolume: 'Clip volume', musicVolume: 'Music volume', brightness: 'Brightness', contrast: 'Contrast', saturation: 'Saturation',
      sceneDuration: 'Scene duration', speed: 'Video speed', fps: 'Frames per second', detailSpeed: 'Drawing detail speed', bgSpeed: 'Background drawing speed', lineQuality: 'Line quality', holdDuration: 'Final hold duration',
      pText: 'Text layer content', pSize: 'Text layer size', pColor: 'Text layer color', pOutlineColor: 'Outline color', pOutlineWidth: 'Outline width', pHighlightColor: 'Highlight color', fontSize: 'Font size',
      tH: 'Hours', tM: 'Minutes', tS: 'Seconds', outLink: 'Generated timestamp link', niche: 'Content niche', monRate: 'Estimated monetized playback rate',
      botGPT: 'Block GPTBot', botCC: 'Block Common Crawl bot', botAhrefs: 'Block AhrefsBot', botSemrush: 'Block SemrushBot', a_date: 'Article publication date', p_desc: 'Product description', p_availability: 'Product availability', l_desc: 'Local business description', textInput: 'Text input',
    } : {
      fileInput: 'اختيار ملف الإدخال', files: 'اختيار ملفات PDF', imageInput: 'اختيار الصور', editFileInput: 'اختيار ملفات الفيديو أو الصور', editAudioInput: 'اختيار صوت الخلفية', audioInput: 'اختيار ملف التعليق الصوتي',
      out: 'المخرجات الناتجة', resultsBox: 'النتائج الناتجة', codeBox: 'كود التضمين الناتج', ocrResultTextarea: 'النص المستخرج', ocrFileInput: 'اختيار صورة لاستخراج النص',
      quality: 'جودة الملف الناتج', tolerance: 'درجة حساسية اللون', feather: 'نعومة الحواف', newColor: 'لون الخلفية المطلوب إزالته', exportColor: 'لون خلفية التصدير',
      bgColor1: 'لون الخلفية الأساسي', bgColor2a: 'لون بداية التدرج', bgColor2b: 'لون نهاية التدرج', textColor: 'لون النص', titleColor: 'لون العنوان', subColor: 'لون النص الفرعي', badgeColor: 'لون الشارة',
      wField: 'عرض الملف الناتج', hField: 'ارتفاع الملف الناتج', fitMode: 'وضع ملاءمة الحجم', presetSelect: 'المقاس الجاهز', orientSelect: 'اتجاه الصفحة', marginSelect: 'هوامش الصفحة',
      amountInput: 'المبلغ المطلوب تحويله', countSelect: 'عدد العناوين', domainSelect: 'نطاق البريد', randomCount: 'عدد الاحتمالات', count: 'عدد المعرّفات',
      iconText: 'نص الأيقونة', badgeText: 'نص الشارة', titleText: 'نص العنوان', subText: 'النص الفرعي', channelText: 'اسم القناة', logoText: 'نص الشعار',
      fromPage: 'الصفحة الأولى', toPage: 'الصفحة الأخيرة', changefreq: 'تكرار التحديث الافتراضي', priority: 'الأولوية الافتراضية', speechLang: 'لغة الإملاء',
      clipTrimStart: 'بداية المقطع', clipTrimEnd: 'نهاية المقطع', clipDuration: 'مدة المقطع', clipVolume: 'مستوى صوت المقطع', musicVolume: 'مستوى صوت الموسيقى', brightness: 'السطوع', contrast: 'التباين', saturation: 'التشبع',
      sceneDuration: 'مدة المشهد', speed: 'سرعة الفيديو', fps: 'الإطارات في الثانية', detailSpeed: 'سرعة رسم التفاصيل', bgSpeed: 'سرعة رسم الخلفية', lineQuality: 'جودة الخطوط', holdDuration: 'مدة التوقف النهائية',
      pText: 'محتوى طبقة النص', pSize: 'حجم طبقة النص', pColor: 'لون طبقة النص', pOutlineColor: 'لون الحدود', pOutlineWidth: 'عرض الحدود', pHighlightColor: 'لون التمييز', fontSize: 'حجم الخط',
      tH: 'الساعات', tM: 'الدقائق', tS: 'الثواني', outLink: 'رابط التوقيت الناتج', niche: 'مجال المحتوى', monRate: 'نسبة المشاهدات المحققة للدخل',
      botGPT: 'حظر GPTBot', botCC: 'حظر روبوت Common Crawl', botAhrefs: 'حظر AhrefsBot', botSemrush: 'حظر SemrushBot', a_date: 'تاريخ نشر المقال', p_desc: 'وصف المنتج', p_availability: 'توفر المنتج', l_desc: 'وصف النشاط المحلي', textInput: 'النص المدخل',
    };

    const hasAccessibleName = control => {
      if (control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby') || control.hasAttribute('title') || control.hasAttribute('placeholder')) return true;
      if (control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)) return true;
      return control.closest('label') !== null;
    };
    main.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea, select').forEach(control => {
      if (hasAccessibleName(control)) return;
      const human = (control.id || control.name || control.type || 'input').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
      control.setAttribute('aria-label', names[control.id] || (isEn ? human : `حقل ${human}`));
    });

    const buttonNames = isEn ? {
      copyBtn: 'Copy result', downloadBtn: 'Download result', ocrCopyBtn: 'Copy extracted text', ocrDownloadBtn: 'Download extracted text', toggleBtn: 'Start or stop dictation', speechCopyBtn: 'Copy transcript', speechDownloadBtn: 'Download transcript', speechClearBtn: 'Clear transcript',
    } : {
      copyBtn: 'نسخ النتيجة', downloadBtn: 'تنزيل النتيجة', ocrCopyBtn: 'نسخ النص المستخرج', ocrDownloadBtn: 'تنزيل النص المستخرج', toggleBtn: 'بدء الإملاء أو إيقافه', speechCopyBtn: 'نسخ النص المملى', speechDownloadBtn: 'تنزيل النص المملى', speechClearBtn: 'مسح النص المملى',
    };
    main.querySelectorAll('button').forEach(button => {
      if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
        button.setAttribute('aria-label', buttonNames[button.id] || (isEn ? 'Tool action' : 'إجراء داخل الأداة'));
      }
    });
    main.querySelectorAll('a').forEach(link => {
      if (!link.textContent.trim() && !link.getAttribute('aria-label')) {
        link.setAttribute('aria-label', link.hasAttribute('download') ? (isEn ? 'Download generated file' : 'تنزيل الملف الناتج') : (isEn ? 'Open generated result' : 'فتح النتيجة الناتجة'));
      }
    });

    main.querySelectorAll('#out, #result, #results, #status, .result-box, .output-box').forEach(output => {
      if (!output.matches('input, textarea, select') && !output.hasAttribute('aria-live')) {
        output.setAttribute('role', 'status');
        output.setAttribute('aria-live', 'polite');
      }
    });

    // Modern drag & drop for any file input (progressive enhancement)
    const fileInputs = [...main.querySelectorAll('input[type="file"]')];
    if (fileInputs.length) {
      const dropLabels = isEn ? {
        hint: 'Drop files here',
        sub: 'or click to browse',
        active: 'Release to upload',
      } : {
        hint: 'أسقط الملفات هنا',
        sub: 'أو اضغط للاختيار',
        active: 'اترك الملفات للرفع',
      };
      const overlay = document.createElement('div');
      overlay.className = 'tool-drop-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = `<div class="drop-inner"><span class="drop-icon">⤓</span><strong>${dropLabels.hint}</strong><small>${dropLabels.sub}</small></div>`;
      workspace.classList.add('tool-has-drop');
      workspace.appendChild(overlay);

      let dragCounter = 0;
      const showOverlay = (active) => {
        overlay.classList.toggle('is-active', active);
        overlay.classList.toggle('is-dragover', active);
        overlay.querySelector('strong').textContent = active ? dropLabels.active : dropLabels.hint;
      };
      ['dragenter','dragover'].forEach(ev => {
        workspace.addEventListener(ev, e => {
          e.preventDefault();
          dragCounter++;
          showOverlay(true);
        });
      });
      ['dragleave','drop'].forEach(ev => {
        workspace.addEventListener(ev, e => {
          e.preventDefault();
          dragCounter = Math.max(0, dragCounter-1);
          if (dragCounter===0) showOverlay(false);
        });
      });
      workspace.addEventListener('drop', e => {
        const files = e.dataTransfer?.files;
        if (!files || !files.length) return;
        // Prefer the first visible file input, or the one that accepts the dropped type
        let target = fileInputs.find(inp => {
          const accept = (inp.getAttribute('accept')||'').toLowerCase();
          if (!accept) return true;
          return [...files].some(f => {
            const ext = '.' + (f.name.split('.').pop()||'').toLowerCase();
            const mime = f.type.toLowerCase();
            return accept.split(',').some(a => {
              a=a.trim().toLowerCase();
              if (!a) return false;
              if (a.startsWith('.')) return ext===a;
              if (a.endsWith('/*')) return mime.startsWith(a.replace('/*','/'));
              return mime===a || ext===a;
            });
          });
        }) || fileInputs[0];
        if (!target) return;
        try {
          const dt = new DataTransfer();
          [...files].forEach(f => dt.items.add(f));
          target.files = dt.files;
          target.dispatchEvent(new Event('change', {bubbles:true}));
          target.dispatchEvent(new Event('input', {bubbles:true}));
          live.textContent = isEn ? `${files.length} file(s) added` : `تمت إضافة ${files.length} ملف`;
        } catch (_) {
          // Fallback: if assignment fails, just focus the input
          target.focus();
        }
      });

      // Paste support for images (e.g., screenshot -> image tools)
      document.addEventListener('paste', e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const imageFiles = [...items].filter(it => it.kind==='file' && it.type.startsWith('image/')).map(it => it.getAsFile()).filter(Boolean);
        if (!imageFiles.length) return;
        const imageInputs = fileInputs.filter(inp => {
          const acc = (inp.getAttribute('accept')||'').toLowerCase();
          return !acc || acc.includes('image') || acc.includes('.png') || acc.includes('.jpg') || acc.includes('.webp');
        });
        if (!imageInputs.length) return;
        const target = imageInputs[0];
        try {
          const dt = new DataTransfer();
          imageFiles.forEach(f => dt.items.add(f));
          target.files = dt.files;
          target.dispatchEvent(new Event('change', {bubbles:true}));
          live.textContent = isEn ? 'Image pasted from clipboard' : 'تم لصق الصورة من الحافظة';
          e.preventDefault();
        } catch(_){}
      });
    }

    // Enhance textareas with auto-resize and Cmd/Ctrl+Enter to run
    main.querySelectorAll('textarea').forEach(ta => {
      const autoResize = () => {
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 720) + 'px';
      };
      ta.addEventListener('input', autoResize);
      // initial
      requestAnimationFrame(autoResize);
    });

    // Mark tool as professionally enhanced for CSS
    document.documentElement.classList.add('tool-professional-ready');
  });
})();
