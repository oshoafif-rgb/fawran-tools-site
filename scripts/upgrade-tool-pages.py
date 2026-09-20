#!/usr/bin/env python3
"""Add the shared professional UX, accessible landmarks, guides, and SEO schema.

The script edits tool pages with small string replacements. BeautifulSoup is used
only to inspect existing content so the original HTML and inline JavaScript are
not reformatted.
"""

from __future__ import annotations

from bs4 import BeautifulSoup
from html import escape
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
TODAY = "2026-09-20"
RATING_MARKER = '<div class="wrap"><div class="rating-widget"'
HUBS = {"ai", "developer", "email", "images", "pdf", "seo", "text", "video", "website", "youtube"}

CATEGORY_NAMES = {
    "ar": {
        "ai": "أدوات الذكاء الاصطناعي",
        "developer": "أدوات المطورين",
        "email": "أدوات البريد الإلكتروني",
        "images": "أدوات الصور",
        "pdf": "أدوات PDF",
        "seo": "أدوات تحسين محركات البحث",
        "text": "أدوات النصوص",
        "video": "أدوات الفيديو",
        "websites": "أدوات المواقع",
        "youtube": "أدوات يوتيوب",
    },
    "en": {
        "ai": "AI Tools",
        "developer": "Developer Tools",
        "email": "Email Tools",
        "images": "Image Tools",
        "pdf": "PDF Tools",
        "seo": "SEO Tools",
        "text": "Text Tools",
        "video": "Video Tools",
        "websites": "Website Tools",
        "youtube": "YouTube Tools",
    },
}

REMOTE_TOOLS = {
    "currency-converter",
    "disposable-email-checker",
    "http-status-checker",
    "website-speed-checker",
    "youtube-keyword-tool",
    "youtube-thumbnail-downloader",
}

SPECIAL_ACTION = {
    "currency-converter": (
        "تتحدث نتيجة التحويل تلقائيًا عند تغيير المبلغ أو إحدى العملتين؛ انتظروا ظهور سعر الصرف ووقت آخر تحديث.",
        "The conversion updates automatically when the amount or either currency changes; wait for the rate and update time to appear.",
    ),
    "word-counter": (
        "تتحدث الإحصاءات فور الكتابة أو اللصق. استخدموا أزرار حالة الأحرف فقط عند الحاجة إلى تعديل النص الإنجليزي.",
        "Statistics update as you type or paste. Use the case-conversion buttons only when you need to modify English text.",
    ),
    "text-analyzer": (
        "تتحدث مؤشرات النص مباشرة أثناء الكتابة؛ راقبوا عدد الكلمات وزمن القراءة والكلمات المتكررة دون زر تشغيل.",
        "Text metrics update live while you type; review word count, reading time, and recurring keywords without a separate run button.",
    ),
    "speech-to-text": (
        "ابدؤوا الإملاء وتحدثوا بوضوح، ثم أوقفوا التسجيل عند اكتمال النص وراجعوا الكلمات التي قد يلتبس نطقها.",
        "Start dictation and speak clearly, then stop recording when finished and review words that may have been misheard.",
    ),
    "prompt-library": (
        "افتحوا البرومبت المناسب، ثم راجعوا المتغيرات والتعليمات قبل نسخه أو تنزيل الحزمة.",
        "Open a suitable prompt, then review its variables and instructions before copying it or downloading the pack.",
    ),
    "website-seo-checklist": (
        "علّموا كل بند مكتمل أثناء المراجعة، واستخدموا نسبة التقدم لتحديد العناصر التي ما زالت تحتاج إلى تنفيذ.",
        "Mark each completed item during the review and use the progress score to identify work that remains.",
    ),
    "youtube-seo-checklist": (
        "علّموا العناصر المكتملة واحفظوا التقدم داخل المتصفح، ثم عالجوا البنود المتبقية قبل النشر.",
        "Mark completed items and keep progress in the browser, then address the remaining checks before publishing.",
    ),
}

SPECIAL_TIP = {
    "currency-converter": (
        "قارنوا السعر الظاهر بسعر الجهة المالية قبل أي معاملة؛ أسعار السوق إرشادية وقد تختلف عنها رسوم البنوك ومنصات الدفع. تحتاج الأداة إلى اتصال لجلب أحدث البيانات.",
        "Compare the displayed rate with your financial provider before a transaction; market rates are indicative and exclude bank or payment-platform fees. The tool needs a connection for current data.",
    ),
    "word-counter": (
        "تختلف طريقة عدّ الكلمات والرموز قليلًا بين المنصات، لذلك استخدموا عداد المنصة نفسها عند الالتزام بحد قانوني أو تقني صارم. تتم المعالجة داخل المتصفح.",
        "Word and character counting can vary slightly between platforms, so use the destination platform's own counter for a strict legal or technical limit. Processing stays in the browser.",
    ),
}

SPECIAL_INPUT = {
    "base64-to-image": (
        "ألصقوا سلسلة Base64 أو Data URL الصحيحة في الحقل، ويمكن استخدام ملف نصي إذا كانت الواجهة تتيحه.",
        "Paste a valid Base64 string or data URL into the input; use a text file when that option is available.",
    ),
    "currency-converter": (
        "أدخلوا المبلغ، ثم اختاروا عملة المصدر وعملة التحويل من القائمتين.",
        "Enter the amount, then choose the source and target currencies from the two selectors.",
    ),
    "prompt-library": (
        "استخدموا البحث والتصنيفات للوصول إلى حزمة البرومبتات المناسبة للمهمة المطلوبة.",
        "Use search and categories to find the prompt pack that matches the task you want to complete.",
    ),
    "speech-to-text": (
        "اختاروا لغة الإملاء واسمحوا للمتصفح باستخدام الميكروفون عند ظهور طلب الإذن.",
        "Choose the dictation language and allow microphone access when the browser requests permission.",
    ),
    "website-seo-checklist": (
        "ابدؤوا بمراجعة عناصر الفحص واحدًا تلو الآخر اعتمادًا على الحالة الفعلية للموقع.",
        "Review the checklist one item at a time against the website's actual implementation.",
    ),
    "youtube-seo-checklist": (
        "راجعوا عناصر العنوان والوصف والصورة المصغرة والكلمات والتوزيع قبل نشر الفيديو.",
        "Review the title, description, thumbnail, keywords, and distribution items before publishing the video.",
    ),
    "youtube-upload-checklist": (
        "أدخلوا موضوع الفيديو ثم راجعوا عناصر النشر والإعدادات الأساسية قبل الرفع.",
        "Enter the video topic, then review the key publishing and settings checks before upload.",
    ),
}


def load_categories() -> dict[str, str]:
    text = (ROOT / "assets/tools-index.js").read_text()
    match = re.search(r"window\.TOOLS_INDEX_AR\s*=\s*(\[.*?\]);\s*window\.TOOLS_INDEX_EN", text, re.S)
    if not match:
        raise RuntimeError("Unable to parse assets/tools-index.js")
    return {item["slug"]: item["cat"] for item in json.loads(match.group(1))}


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def meaningful_labels(soup: BeautifulSoup, lang: str) -> list[str]:
    values: list[str] = []
    ignored = {"◐", "إغلاق", "إلغاء", "Close", "Cancel", "مسح", "Clear", "Reset", "إعادة تعيين"}
    for node in soup.find_all(["label"]):
        text = clean_text(node.get_text(" ", strip=True))
        text = re.sub(r"\s+\d+(?:\.\d+)?%?$", "", text).strip()
        if not text or text in ignored or len(text) > 65 or text in values:
            continue
        values.append(text)
    return values[:3]


def button_labels(soup: BeautifulSoup) -> list[str]:
    values: list[str] = []
    for node in soup.find_all("button"):
        text = clean_text(node.get_text(" ", strip=True))
        if not text or text == "◐" or len(text) > 60 or text in values:
            continue
        values.append(text)
    return values


def input_instruction(slug: str, category: str, has_file: bool, lang: str) -> str:
    if slug in SPECIAL_INPUT:
        return SPECIAL_INPUT[slug][0 if lang == "ar" else 1]
    if lang == "ar":
        if has_file and category == "images":
            return "ارفعوا الصورة أو الصور المطلوبة، وتأكدوا من أن الصيغة والحجم يناسبان المهمة قبل المعالجة."
        if has_file and category == "pdf":
            return "اختاروا ملف PDF المطلوب، أو أضيفوا الملفات بالترتيب الصحيح إذا كانت الأداة تدعم أكثر من ملف."
        if has_file and category == "video":
            return "أضيفوا ملفات الصور أو الفيديو أو الصوت المطلوبة، ثم راجعوا ترتيبها داخل مساحة العمل."
        if category == "youtube":
            if any(word in slug for word in ("thumbnail", "banner", "logo")):
                return "أضيفوا الصورة أو النص أو رابط فيديو يوتيوب المطلوب بحسب الحقول الظاهرة في الأداة."
            return "أدخلوا موضوع الفيديو أو رابطه أو بياناته المطلوبة بدقة في الحقول الظاهرة."
        if category == "email":
            return "أدخلوا عنوان البريد أو القائمة أو بيانات التوقيع المطلوبة، مع وضع كل قيمة في الحقل المخصص لها."
        if category in {"developer", "text"}:
            return "ألصقوا النص أو الكود المراد معالجته في حقل الإدخال مع الحفاظ على التنسيق الأصلي عند الحاجة."
        if category in {"seo", "websites"}:
            return "أدخلوا الرابط أو HTML أو البيانات المطلوبة للفحص أو التوليد كما هي منشورة في الصفحة الفعلية."
        if category == "ai":
            return "أدخلوا الموضوع أو النص أو الملف المطلوب، وحددوا اللغة والسياق بوضوح للحصول على نتيجة أدق."
        return "أضيفوا المدخلات المطلوبة في الحقول الظاهرة، ثم راجعوا صحتها قبل تشغيل الأداة."
    if has_file and category == "images":
        return "Upload the required image or images and confirm that the format and size suit the task before processing."
    if has_file and category == "pdf":
        return "Choose the PDF file, or add files in the correct order when the tool supports multiple documents."
    if has_file and category == "video":
        return "Add the required image, video, or audio files, then verify their order in the workspace."
    if category == "youtube":
        if any(word in slug for word in ("thumbnail", "banner", "logo")):
            return "Add the image, text, or YouTube URL requested by the fields shown in the tool."
        return "Enter the video topic, URL, or requested metrics accurately in the visible fields."
    if category == "email":
        return "Enter the email address, list, or signature details, placing each value in its designated field."
    if category in {"developer", "text"}:
        return "Paste the text or code you want to process, preserving its original formatting when needed."
    if category in {"seo", "websites"}:
        return "Enter the URL, HTML, or requested data exactly as it appears on the live page."
    if category == "ai":
        return "Enter the topic, text, or file and describe the language and context clearly for a more useful result."
    return "Add the requested inputs to the visible fields and verify them before running the tool."


def options_instruction(labels: list[str], lang: str) -> str:
    if labels:
        joined = "، ".join(f"«{escape(x)}»" for x in labels) if lang == "ar" else ", ".join(f"“{escape(x)}”" for x in labels)
        if lang == "ar":
            return f"اضبطوا الخيارات المتاحة مثل {joined} وفق النتيجة المطلوبة. يمكن البدء بالقيم الافتراضية ثم تحسينها بعد المعاينة."
        return f"Adjust available settings such as {joined} for the result you need. Start with the defaults, then refine them after previewing."
    if lang == "ar":
        return "راجعوا القيم والصيغة والترتيب قبل التنفيذ. استخدموا بيانات واقعية غير حساسة للحصول على نتيجة يمكن تقييمها بدقة."
    return "Review values, format, and order before running the tool. Use realistic, non-sensitive data so the result can be evaluated accurately."


def action_instruction(slug: str, buttons: list[str], title: str, lang: str) -> str:
    if slug in SPECIAL_ACTION:
        return SPECIAL_ACTION[slug][0 if lang == "ar" else 1]
    skip = re.compile(r"(?:نسخ|تحميل|تنزيل|تصدير|مسح|إعادة|Copy|Download|Export|Clear|Reset)", re.I)
    action = re.compile(r"(?:تنفيذ|تحويل|توليد|إنشاء|تحليل|فحص|اختبار|ضغط|دمج|تقسيم|استخراج|إزالة|قص|تغيير|تدوير|قلب|تكسيل|إضافة|بناء|تنسيق|تصغير|تحقق|فك|تشغيل|ابدأ|استخرج|Process|Run|Generate|Create|Analyze|Check|Test|Compress|Merge|Split|Extract|Remove|Crop|Resize|Convert|Build|Format|Validate|Decode|Get)", re.I)
    primary = next((x for x in buttons if action.search(x) and not skip.search(x)), "")
    if lang == "ar":
        if primary:
            return f"اضغطوا «{escape(primary)}» وانتظروا اكتمال المعالجة. راقبوا رسائل الحالة أو التنبيهات الظاهرة قبل الانتقال للنتيجة."
        return f"شغّلوا {escape(title)} بعد إكمال المدخلات، ثم انتظروا ظهور النتيجة أو تقرير الفحص داخل الصفحة."
    if primary:
        return f"Select “{escape(primary)}” and wait for processing to finish. Check any status messages or warnings before using the result."
    return f"Run {escape(title)} after completing the inputs, then wait for the result or analysis report to appear on the page."


def output_instruction(buttons: list[str], lang: str) -> str:
    pattern = re.compile(r"(?:نسخ|تحميل|تنزيل|تصدير|Copy|Download|Export)", re.I)
    outputs = [x for x in buttons if pattern.search(x)][:2]
    if lang == "ar":
        if outputs:
            joined = " أو ".join(f"«{escape(x)}»" for x in outputs)
            return f"راجعوا المعاينة أو التقرير، ثم استخدموا {joined} لحفظ النتيجة. احتفظوا بالملف الأصلي للمقارنة أو التراجع."
        return "راجعوا النتيجة بحثًا عن القيم غير المتوقعة، ثم انسخوا المخرجات أو احفظوها بالطريقة التي توفرها الأداة."
    if outputs:
        joined = " or ".join(f"“{escape(x)}”" for x in outputs)
        return f"Review the preview or report, then use {joined} to save the result. Keep the original file for comparison or recovery."
    return "Review the result for unexpected values, then copy or save the output using the option provided by the tool."


def tip_text(slug: str, category: str, lang: str) -> str:
    if slug in SPECIAL_TIP:
        return SPECIAL_TIP[slug][0 if lang == "ar" else 1]
    remote = slug in REMOTE_TOOLS
    if lang == "ar":
        privacy = (
            "تحتاج هذه الأداة إلى اتصال بخدمة خارجية لإكمال الفحص أو جلب البيانات؛ لذلك لا تُدخلوا روابط خاصة أو بيانات سرية."
            if remote
            else "تتم المعالجة الأساسية داخل المتصفح في هذه الأداة؛ ومع ذلك يُنصح دائمًا بالاحتفاظ بنسخة أصلية من الملفات المهمة."
        )
        category_tip = {
            "images": "قارنوا الجودة والحجم بعد التصدير، وافحصوا الشفافية والأبعاد قبل استخدام الصورة في موقع أو حملة.",
            "pdf": "افتحوا ملف PDF الناتج وتحققوا من ترتيب الصفحات والخطوط والروابط قبل مشاركته.",
            "seo": "اعتبروا النتيجة فحصًا مساعدًا، ثم تحققوا من الصفحة المنشورة باستخدام أدوات محركات البحث الرسمية.",
            "websites": "اختبروا الكود أو الملف الناتج في بيئة تجريبية قبل تطبيقه على الموقع المنشور.",
            "developer": "اختبروا المخرجات بعينة صغيرة أولًا، ولا تستخدموا أسرارًا أو رموز وصول حقيقية داخل أدوات المتصفح.",
            "youtube": "راجعوا سياسات يوتيوب والبيانات الفعلية للقناة؛ الاقتراحات والتقديرات تساعد في التخطيط ولا تضمن النتائج.",
            "email": "تجنبوا إدخال قوائم عملاء حساسة، واختبروا الروابط والتواقيع في رسالة تجريبية قبل الإرسال الجماعي.",
            "video": "ابدؤوا بملفات قصيرة وإعداد جودة متوسط، ثم ارفعوا الجودة بعد التأكد من الترتيب والصوت.",
            "text": "راجعوا علامات الترقيم والتنسيق بعد المعالجة، خصوصًا في النصوص متعددة اللغات.",
            "ai": "راجعوا المخرجات لغويًا وواقعيًا قبل النشر، وعدّلوا السياق بدل الاعتماد على أول نتيجة.",
        }.get(category, "راجعوا النتيجة النهائية قبل استخدامها في عمل منشور أو ملف مهم.")
        return f"{category_tip} {privacy}"
    privacy = (
        "This tool needs an external service to complete the check or retrieve data, so do not enter private URLs or confidential data."
        if remote
        else "Core processing for this tool runs in the browser; still, keep an original copy of important files."
    )
    category_tip = {
        "images": "Compare quality and file size after export, and verify transparency and dimensions before using the image in a site or campaign.",
        "pdf": "Open the resulting PDF and verify page order, fonts, and links before sharing it.",
        "seo": "Treat the result as a practical first check, then verify the live page with official search-engine tools.",
        "websites": "Test generated code or files in a staging environment before applying them to a live website.",
        "developer": "Test outputs with a small sample first, and never place real secrets or access tokens in browser tools.",
        "youtube": "Check current YouTube policies and actual channel data; suggestions and estimates support planning but do not guarantee results.",
        "email": "Avoid confidential customer lists, and test links or signatures in a draft message before a bulk send.",
        "video": "Start with short files and medium quality, then increase quality after checking sequence and audio.",
        "text": "Review punctuation and formatting after processing, especially in multilingual text.",
        "ai": "Review outputs for language and factual accuracy before publishing, and refine the context rather than relying on the first result.",
    }.get(category, "Review the final result before using it in published work or an important file.")
    return f"{category_tip} {privacy}"


def guide_html(slug: str, title: str, category: str, soup: BeautifulSoup, lang: str) -> str:
    controls = meaningful_labels(soup, lang)
    buttons = button_labels(soup)
    has_file = bool(soup.find("input", attrs={"type": "file"}))
    steps = [
        input_instruction(slug, category, has_file, lang),
        options_instruction(controls, lang),
        action_instruction(slug, buttons, title, lang),
        output_instruction(buttons, lang),
    ]
    if lang == "ar":
        heading = f"طريقة استخدام {escape(title)} خطوة بخطوة"
        intro = f"اتبعوا الخطوات التالية للحصول على نتيجة دقيقة من {escape(title)}، مع مراجعة المدخلات والنتيجة قبل الحفظ أو النشر."
        step_names = ["إضافة المدخلات", "ضبط الخيارات", "تشغيل الأداة", "مراجعة النتيجة وحفظها"]
        badge = "دليل عملي"
        tips_heading = "نصائح للحصول على أفضل نتيجة"
    else:
        heading = f"How to use {escape(title)} step by step"
        intro = f"Follow these steps to get a reliable result from {escape(title)}, checking both the inputs and output before saving or publishing."
        step_names = ["Add the inputs", "Adjust the options", "Run the tool", "Review and save the result"]
        badge = "Practical guide"
        tips_heading = "Tips for the best result"
    items = "".join(
        f'<li><span class="step-number" aria-hidden="true">{i}</span><div><h3>{escape(step_names[i-1])}</h3><p>{text}</p></div></li>'
        for i, text in enumerate(steps, 1)
    )
    return (
        f'<div class="wrap tool-guide-wrap"><section class="tool-guide" id="how-to" aria-labelledby="how-to-title">'
        f'<div class="guide-heading"><span class="guide-badge">{badge}</span><h2 id="how-to-title">{heading}</h2><p>{intro}</p></div>'
        f'<ol class="tool-steps">{items}</ol>'
        f'<aside class="tool-tip"><h3>{tips_heading}</h3><p>{tip_text(slug, category, lang)}</p></aside>'
        f'</section></div>\n'
    )


def update_schema(text: str, slug: str, title: str, description: str, category: str, lang: str) -> str:
    soup = BeautifulSoup(text, "html.parser")
    schemas = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            value = json.loads(script.string or script.get_text())
        except Exception:
            continue
        schemas.append((script, value))

    software = next((pair for pair in schemas if isinstance(pair[1], dict) and pair[1].get("@type") == "SoftwareApplication"), None)
    base = "https://fawran.tools/" + ("en/tools/" if lang == "en" else "tools/") + slug
    if software:
        script, data = software
        old = script.string or script.get_text()
        data.update({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "@id": base + "#software",
            "name": title,
            "url": base,
            "description": description,
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "Any",
            "isAccessibleForFree": True,
            "inLanguage": lang,
            "browserRequirements": "Requires JavaScript and a modern web browser",
            "dateModified": TODAY,
        })
        data.setdefault("offers", {"@type": "Offer", "price": "0", "priceCurrency": "USD"})
        new = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        text = text.replace(old, new, 1)
    else:
        data = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "@id": base + "#software",
            "name": title,
            "url": base,
            "description": description,
            "applicationCategory": "UtilitiesApplication",
            "operatingSystem": "Any",
            "isAccessibleForFree": True,
            "inLanguage": lang,
            "browserRequirements": "Requires JavaScript and a modern web browser",
            "dateModified": TODAY,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
            "publisher": {"@type": "Organization", "name": "Fawran Tools", "url": "https://fawran.tools/"},
        }
        tag = '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "</script>"
        text = text.replace("</head>", tag + "</head>", 1)

    if not any(isinstance(value, dict) and value.get("@type") == "BreadcrumbList" for _, value in schemas):
        category_name = CATEGORY_NAMES[lang].get(category, CATEGORY_NAMES[lang]["websites"])
        prefix = "en/" if lang == "en" else ""
        home_name = "Tools" if lang == "en" else "الأدوات"
        crumb = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "@id": base + "#breadcrumb",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": home_name, "item": f"https://fawran.tools/{prefix}tools/"},
                {"@type": "ListItem", "position": 2, "name": category_name, "item": f"https://fawran.tools/{prefix}tools/{'website' if category == 'websites' else category}"},
                {"@type": "ListItem", "position": 3, "name": title, "item": base},
            ],
        }
        tag = '<script type="application/ld+json">' + json.dumps(crumb, ensure_ascii=False, separators=(",", ":")) + "</script>"
        text = text.replace("</head>", tag + "</head>", 1)
    return text


def add_meta(text: str, lang: str) -> str:
    additions = []
    if "property=\"og:locale:alternate\"" not in text:
        additions.append(f'<meta property="og:locale:alternate" content="{"en_US" if lang == "ar" else "ar_AR"}">')
    if "property=\"og:image:alt\"" not in text:
        alt = "فورا.tools — أدوات مجانية تعمل مباشرة من المتصفح" if lang == "ar" else "Fawran Tools — free browser-based online tools"
        additions.append(f'<meta property="og:image:alt" content="{alt}">')
    if "name=\"twitter:image:alt\"" not in text:
        alt = "فورا.tools — أدوات مجانية تعمل مباشرة من المتصفح" if lang == "ar" else "Fawran Tools — free browser-based online tools"
        additions.append(f'<meta name="twitter:image:alt" content="{alt}">')
    if additions:
        text = text.replace("</head>", "".join(additions) + "</head>", 1)
    return text


def add_landmarks(text: str, lang: str) -> str:
    if "class=\"skip-link\"" not in text:
        label = "تخطي إلى محتوى الأداة" if lang == "ar" else "Skip to tool content"
        text = re.sub(r"(<body\b[^>]*>)", rf'\1<a class="skip-link" href="#main-content">{label}</a>', text, count=1, flags=re.I)
    if re.search(r"<main\b", text, re.I):
        text = re.sub(r"<main(?![^>]*\bid=)([^>]*)>", r'<main id="main-content"\1>', text, count=1, flags=re.I)
    else:
        text = text.replace('<div class="wrap tool-page">', '<div class="wrap tool-page" id="main-content" role="main">', 1)
    return text


def process_page(path: Path, category_map: dict[str, str], lang: str) -> bool:
    slug = path.stem
    if slug in HUBS or slug == "index":
        return False
    text = path.read_text()
    if RATING_MARKER not in text:
        return False
    soup = BeautifulSoup(text, "html.parser")
    h1 = soup.find("h1")
    meta = soup.find("meta", attrs={"name": "description"})
    if not h1 or not meta:
        raise RuntimeError(f"Missing H1 or description: {path}")
    title = clean_text(h1.get_text(" ", strip=True))
    description = clean_text(meta.get("content", ""))
    category = category_map.get(slug, "websites")

    guide = guide_html(slug, title, category, soup, lang)
    if 'id="how-to"' in text:
        text, replaced = re.subn(
            r'<div class="wrap tool-guide-wrap"><section class="tool-guide".*?</section></div>\n?',
            guide,
            text,
            count=1,
            flags=re.S,
        )
        if replaced != 1:
            raise RuntimeError(f"Unable to refresh guide: {path}")
    else:
        text = text.replace(RATING_MARKER, guide + RATING_MARKER, 1)
    text = update_schema(text, slug, title, description, category, lang)
    text = add_meta(text, lang)
    text = add_landmarks(text, lang)
    script = "../../assets/tool-professional.js" if lang == "en" else "../assets/tool-professional.js"
    if "tool-professional.js" not in text:
        text = text.replace("</body>", f'<script src="{script}"></script></body>', 1)
    path.write_text(text)
    return True


def main() -> None:
    category_map = load_categories()
    counts = {}
    for lang, directory in (("ar", ROOT / "tools"), ("en", ROOT / "en/tools")):
        count = sum(process_page(path, category_map, lang) for path in sorted(directory.glob("*.html")))
        counts[lang] = count
    print(json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()
