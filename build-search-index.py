#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-search-index.py
======================
يولّد ملف assets/tools-index.js تلقائيًا من كل صفحات الأدوات الموجودة فعليًا
في مجلدي tools/ و en/tools/ — بدون أي تدخل يدوي.

الاستخدام:
    python3 build-search-index.py

شغّله من مجلد الموقع الرئيسي (نفس المجلد اللي فيه index.html) في أي وقت
بعد ما تضيف/تحذف/تعدّل أي أداة، قبل ما ترفع نسخة الموقع المحدّثة.

المتطلبات: Python 3 فقط (مفيش أي مكتبات خارجية مطلوبة).
"""

import re
import os
import json
import html
import sys

HUB_PAGES = {'index', 'images', 'pdf', 'developer', 'text', 'seo', 'youtube', 'website', 'email', 'video', 'ai'}
CATEGORY_HUB_FILES = {
    'images': 'tools/images.html',
    'pdf': 'tools/pdf.html',
    'developer': 'tools/developer.html',
    'text': 'tools/text.html',
    'seo': 'tools/seo.html',
    'youtube': 'tools/youtube.html',
    'websites': 'tools/website.html',
    'email': 'tools/email.html',
    'video': 'tools/video.html',
    'ai': 'tools/ai.html',
}


def build_category_map():
    """
    يقرأ صفحات الهاب السبعة ويحدد فئة كل أداة.
    لو أداة موجودة في أكتر من هاب واحد (زي favicon-generator في images.html وwebsite.html معًا)،
    آخر هاب يتفحص هو اللي بيكسب — لهذا رتّبنا القاموس تحت بحيث الفئات الأعم (زي 'seo' و'websites')
    تُفحص أخيرًا فتاخد الأولوية على الفئات الأضيق.
    """
    slug_to_cat = {}
    for cat, path in CATEGORY_HUB_FILES.items():
        if not os.path.exists(path):
            print(f"  تحذير: صفحة الهاب غير موجودة: {path}")
            continue
        content = open(path, encoding='utf-8', errors='replace').read()
        for slug in re.findall(r'href="([a-z0-9\-]+)\.html"', content):
            if slug not in HUB_PAGES:
                slug_to_cat[slug] = cat
    return slug_to_cat


def extract_tools(folder, slug_to_cat):
    """يمسح كل ملفات .html في المجلد (عدا صفحات الهاب) ويستخرج بيانات كل أداة."""
    data = []
    warnings = []
    if not os.path.exists(folder):
        print(f"  تحذير: المجلد غير موجود: {folder}")
        return data, warnings

    for fname in sorted(os.listdir(folder)):
        if not fname.endswith('.html'):
            continue
        slug = fname[:-5]
        if slug in HUB_PAGES:
            continue

        path = os.path.join(folder, fname)
        content = open(path, encoding='utf-8', errors='replace').read()

        title_m = re.search(r'<title>(.*?)</title>', content, re.S)
        desc_m = (re.search(r'<meta[^>]*name="description"[^>]*content="([^"]*)"', content)
                  or re.search(r'<meta[^>]*content="([^"]*)"[^>]*name="description"', content))

        title = html.unescape(title_m.group(1).split('|')[0].strip()) if title_m else slug
        desc = html.unescape(desc_m.group(1)) if desc_m else ''
        cat = slug_to_cat.get(slug, 'other')

        if not title_m:
            warnings.append(f"{path}: مفيش <title> — استُخدم اسم الملف كعنوان مؤقت.")
        if not desc_m:
            warnings.append(f"{path}: مفيش meta description — الوصف هيفضل فاضي في نتائج البحث.")
        if cat == 'other':
            warnings.append(f"{path}: الأداة دي مش مضافة لأي صفحة هاب (tools/<category>.html)، "
                             f"فاتحطت مؤقتًا في فئة 'other'. ضيفها لصفحة الهاب المناسبة لو عايزها تتصنّف صح.")

        data.append({'slug': slug, 'title': title, 'desc': desc, 'cat': cat})
    return data, warnings


def main():
    if not os.path.exists('index.html') or not os.path.isdir('tools'):
        print("خطأ: شغّل السكريبت ده من المجلد الرئيسي للموقع (لازم يكون فيه index.html ومجلد tools/).")
        sys.exit(1)

    print("جارٍ قراءة صفحات الهاب لتحديد فئة كل أداة...")
    slug_to_cat = build_category_map()

    print("جارٍ فحص أدوات النسخة العربية (tools/)...")
    ar_data, ar_warnings = extract_tools('tools', slug_to_cat)

    print("جارٍ فحص أدوات النسخة الإنجليزية (en/tools/)...")
    en_data, en_warnings = extract_tools('en/tools', slug_to_cat)

    js = "// فهرس بحث شامل لكل الأدوات — تم توليده تلقائيًا بواسطة build-search-index.py\n"
    js += "// لا تعدّل هذا الملف يدويًا — شغّل السكريبت تاني بدل التعديل المباشر.\n"
    js += "window.TOOLS_INDEX_AR = " + json.dumps(ar_data, ensure_ascii=False) + ";\n"
    js += "window.TOOLS_INDEX_EN = " + json.dumps(en_data, ensure_ascii=False) + ";\n"

    os.makedirs('assets', exist_ok=True)
    with open('assets/tools-index.js', 'w', encoding='utf-8') as f:
        f.write(js)

    print()
    print("تم إنشاء assets/tools-index.js بنجاح.")
    print(f"  عدد الأدوات العربية: {len(ar_data)}")
    print(f"  عدد الأدوات الإنجليزية: {len(en_data)}")

    all_warnings = ar_warnings + en_warnings
    if all_warnings:
        print()
        print(f"تحذيرات ({len(all_warnings)}) — الأداة اتضافت للبحث برضه، لكن راجع النقط دي لو حابب تظبطها:")
        for w in all_warnings:
            print("  -", w)
    else:
        print("مفيش أي تحذيرات — كل الأدوات عندها عنوان ووصف وفئة صحيحة.")

    if len(ar_data) != len(en_data):
        print()
        print(f"تنبيه: عدد الأدوات مختلف بين العربي ({len(ar_data)}) والإنجليزي ({len(en_data)})! "
              f"تأكد إن كل أداة عربية عندها نسخة مقابلة في en/tools/ والعكس.")


if __name__ == '__main__':
    main()
