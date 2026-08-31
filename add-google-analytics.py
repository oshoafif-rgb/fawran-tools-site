#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add-google-analytics.py
=========================
يضيف كود Google Analytics (GA4) لكل صفحات الموقع دفعة واحدة (عربي + إنجليزي).

الاستخدام:
    python3 add-google-analytics.py

آمن يتشغّل أكتر من مرة (بيتأكد الأول إن الكود مش مضاف قبل كده في كل ملف
قبل ما يضيفه، فمش هيكرر الإدراج لو شغّلته غلط مرتين).

لتغيير معرّف القياس مستقبلًا، عدّلي قيمة GA_MEASUREMENT_ID تحت وشغّلي
السكريبت تاني — هيستبدل الكود القديم بالجديد تلقائيًا في كل الصفحات.
"""

import os
import re

GA_MEASUREMENT_ID = "G-JSG9KGPK0S"

GA_SNIPPET = f'''<script async src="https://www.googletagmanager.com/gtag/js?id={GA_MEASUREMENT_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA_MEASUREMENT_ID}');</script>
'''

SKIP_DIRS = {'.git', 'node_modules', '.tmp', 'netlify'}


def process_file(path):
    content = open(path, encoding='utf-8', errors='replace').read()

    if 'googletagmanager.com/gtag/js' in content:
        # موجود بالفعل — تحقق إذا كان بنفس المعرّف الحالي أو محتاج تحديث
        if GA_MEASUREMENT_ID in content:
            return 'skipped'
        # معرّف قديم مختلف — استبدله بالجديد
        content = re.sub(
            r"<script async src=\"https://www\.googletagmanager\.com/gtag/js\?id=[^\"]+\"></script>\n"
            r"<script>window\.dataLayer=window\.dataLayer\|\|\[\];function gtag\(\)\{dataLayer\.push\(arguments\);\}"
            r"gtag\('js',new Date\(\)\);gtag\('config','[^']+'\);</script>\n",
            GA_SNIPPET,
            content
        )
        open(path, 'w', encoding='utf-8').write(content)
        return 'updated'

    if '<head>' not in content:
        return 'no-head-tag'

    content = content.replace('<head>', '<head>\n' + GA_SNIPPET, 1)
    open(path, 'w', encoding='utf-8').write(content)
    return 'added'


def main():
    if not os.path.isfile('index.html'):
        print("خطأ: شغّلي السكريبت ده من المجلد الرئيسي للموقع.")
        return

    stats = {'added': 0, 'skipped': 0, 'updated': 0, 'no-head-tag': 0}
    problems = []

    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        for fname in files:
            if not fname.endswith('.html'):
                continue
            path = os.path.join(root, fname)
            result = process_file(path)
            stats[result] = stats.get(result, 0) + 1
            if result == 'no-head-tag':
                problems.append(path)

    print(f"أُضيف حديثًا: {stats.get('added',0)}")
    print(f"محدَّث (معرّف قديم استُبدل): {stats.get('updated',0)}")
    print(f"متجاهَل (موجود بالفعل بنفس المعرّف): {stats.get('skipped',0)}")

    if problems:
        print(f"\nملفات بدون وسم <head> واضح (راجعيها يدويًا):")
        for p in problems:
            print("  -", p)


if __name__ == '__main__':
    main()
