#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add-rating-widget.py
=====================
يدرج ودجت التقييم الحقيقي (النجوم القابلة للضغط) في كل صفحات الأدوات
تلقائيًا (tools/ وen/tools/)، مع سكريبت rating-widget.js اللازم.

شغّله مرة واحدة فقط:
    python3 add-rating-widget.py

آمن يتشغّل أكتر من مرة (بيتأكد الأول إن الودجت مش متضاف قبل كده في كل ملف
قبل ما يضيفه، فمش هيكرر الإدراج لو شغّلته غلط مرتين).
"""

import re
import os

HUB_PAGES = {'index', 'images', 'pdf', 'developer', 'text', 'seo', 'youtube', 'website'}

WIDGET_HTML_TEMPLATE = '''<div class="wrap"><div class="rating-widget" data-tool-slug="{slug}">
  <div class="rating-stars"></div>
  <div><div class="rating-summary"></div><span class="rating-prompt"></span><span class="rating-thanks"></span></div>
</div></div>
'''


def process_file(path, slug, rel_prefix):
    content = open(path, encoding='utf-8', errors='replace').read()

    if 'rating-widget' in content:
        return 'skipped'  # الودجت متضافة بالفعل

    widget_html = WIDGET_HTML_TEMPLATE.format(slug=slug)
    script_tag = f'<script src="{rel_prefix}assets/rating-widget.js"></script>'

    # 1) إدراج الودجت: قبل <footer لو موجودة، وإلا قبل </body> مباشرة
    if '<footer' in content:
        content = content.replace('<footer', widget_html + '<footer', 1)
    elif '</body>' in content:
        content = content.replace('</body>', widget_html + '</body>', 1)
    else:
        return 'no-insertion-point'

    # 2) إدراج سكريبت الودجت قبل </body> (بعد main.js لو موجود، وإلا قبل </body> مباشرة)
    if 'assets/main.js"></script>' in content:
        content = re.sub(
            r'(<script src="[^"]*assets/main\.js"></script>)',
            r'\1' + script_tag,
            content, count=1
        )
    elif '</body>' in content:
        content = content.replace('</body>', script_tag + '</body>', 1)

    open(path, 'w', encoding='utf-8').write(content)
    return 'added'


def process_folder(folder, rel_prefix):
    stats = {'added': 0, 'skipped': 0, 'no-insertion-point': 0}
    problems = []
    if not os.path.exists(folder):
        print(f"  تحذير: المجلد غير موجود: {folder}")
        return stats, problems

    for fname in sorted(os.listdir(folder)):
        if not fname.endswith('.html'):
            continue
        slug = fname[:-5]
        if slug in HUB_PAGES:
            continue
        path = os.path.join(folder, fname)
        result = process_file(path, slug, rel_prefix)
        stats[result] = stats.get(result, 0) + 1
        if result == 'no-insertion-point':
            problems.append(path)
    return stats, problems


def main():
    if not os.path.isdir('tools'):
        print("خطأ: شغّل السكريبت ده من المجلد الرئيسي للموقع.")
        return

    print("جارٍ إدراج ودجت التقييم في أدوات النسخة العربية (tools/)...")
    ar_stats, ar_problems = process_folder('tools', '../')

    print("جارٍ إدراج ودجت التقييم في أدوات النسخة الإنجليزية (en/tools/)...")
    en_stats, en_problems = process_folder('en/tools', '../../')

    print()
    print(f"العربي  — أُضيف: {ar_stats.get('added',0)} | متجاهَل (مضاف قبل كده): {ar_stats.get('skipped',0)} | مشاكل: {len(ar_problems)}")
    print(f"الإنجليزي — أُضيف: {en_stats.get('added',0)} | متجاهَل (مضاف قبل كده): {en_stats.get('skipped',0)} | مشاكل: {len(en_problems)}")

    if ar_problems or en_problems:
        print()
        print("ملفات محتاجة مراجعة يدوية (مفيش فيها نقطة إدراج واضحة):")
        for p in ar_problems + en_problems:
            print("  -", p)


if __name__ == '__main__':
    main()
