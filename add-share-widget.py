#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add-share-widget.py
=====================
يدرج ودجت المشاركة (SHARE) في كل مقالات المدونة وصفحات الأدوات تلقائيًا
(tools/ وen/tools/ وblog/ وen/blog/)، مع سكريبت share-widget.js اللازم.

شغّله في أي وقت — آمن يتكرر (بيتأكد الأول إن الودجت مش مضافة قبل كده
في كل ملف قبل ما يضيفها، فمش هيكرر الإدراج).

الاستخدام:
    python3 add-share-widget.py
"""

import re
import os

HUB_PAGES = {'index', 'images', 'pdf', 'developer', 'text', 'seo', 'youtube', 'website', 'email', 'video', 'ai'}

WIDGET_HTML = '<div class="wrap"><div class="share-widget"></div></div>\n'


def process_file(path, rel_prefix):
    content = open(path, encoding='utf-8', errors='replace').read()

    if 'share-widget' in content:
        return 'skipped'

    script_tag = f'<script src="{rel_prefix}assets/share-widget.js"></script>'

    if '<footer' in content:
        content = content.replace('<footer', WIDGET_HTML + '<footer', 1)
    elif '</body>' in content:
        content = content.replace('</body>', WIDGET_HTML + '</body>', 1)
    else:
        return 'no-insertion-point'

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


def process_folder(folder, rel_prefix, exclude_hub=True):
    stats = {'added': 0, 'skipped': 0, 'no-insertion-point': 0}
    problems = []
    if not os.path.exists(folder):
        print(f"  تحذير: المجلد غير موجود: {folder}")
        return stats, problems

    for fname in sorted(os.listdir(folder)):
        if not fname.endswith('.html'):
            continue
        slug = fname[:-5]
        if slug == 'index':
            continue  # صفحة القائمة (index) مش مقال أو أداة فردية
        if exclude_hub and slug in HUB_PAGES:
            continue
        path = os.path.join(folder, fname)
        result = process_file(path, rel_prefix)
        stats[result] = stats.get(result, 0) + 1
        if result == 'no-insertion-point':
            problems.append(path)
    return stats, problems


def main():
    if not os.path.isdir('tools') or not os.path.isdir('blog'):
        print("خطأ: شغّل السكريبت ده من المجلد الرئيسي للموقع.")
        return

    targets = [
        ('أدوات النسخة العربية', 'tools', '../', True),
        ('أدوات النسخة الإنجليزية', 'en/tools', '../../', True),
        ('مقالات المدونة العربية', 'blog', '../', False),
        ('مقالات المدونة الإنجليزية', 'en/blog', '../../', False),
    ]

    total_added = 0
    all_problems = []

    for label, folder, prefix, exclude_hub in targets:
        print(f"جارٍ إدراج ودجت المشاركة في {label}...")
        stats, problems = process_folder(folder, prefix, exclude_hub)
        total_added += stats.get('added', 0)
        all_problems += problems
        print(f"  أُضيف: {stats.get('added',0)} | متجاهَل (مضاف قبل كده): {stats.get('skipped',0)} | مشاكل: {len(problems)}")

    print()
    print(f"الإجمالي: أُضيفت ودجت المشاركة إلى {total_added} صفحة جديدة.")

    if all_problems:
        print("\nملفات محتاجة مراجعة يدوية:")
        for p in all_problems:
            print("  -", p)


if __name__ == '__main__':
    main()
