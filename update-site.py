#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
update-site.py
===============
سكريبت واحد شامل — شغّله كل مرة تضيف/تعدّل أدوات في الموقع، قبل الرفع مباشرة.

بيعمل الخطوتين دفعة واحدة بالترتيب الصحيح:
  1) يولّد assets/tools-index.js من جديد (فهرس البحث الشامل لكل الأدوات)
  2) يدرج ودجت التقييم (النجوم) في أي أداة جديدة لسه ما عندهاش الودجت

الاستخدام:
    python3 update-site.py

شغّله من مجلد الموقع الرئيسي (نفس المكان اللي فيه index.html).
"""

import subprocess
import sys

STEPS = [
    ("تحديث فهرس البحث (assets/tools-index.js)", "build-search-index.py"),
    ("إضافة ودجت التقييم للأدوات الجديدة", "add-rating-widget.py"),
]


def main():
    print("=" * 55)
    print("جارٍ تحديث الموقع بالكامل...")
    print("=" * 55)

    for i, (label, script) in enumerate(STEPS, 1):
        print(f"\n[{i}/{len(STEPS)}] {label}")
        print("-" * 55)
        result = subprocess.run([sys.executable, script])
        if result.returncode != 0:
            print(f"\nتوقف التحديث — حصلت مشكلة في {script}. راجع الرسالة فوق.")
            sys.exit(1)

    print("\n" + "=" * 55)
    print("تم تحديث الموقع بالكامل بنجاح. جاهز للرفع الآن.")
    print("=" * 55)


if __name__ == '__main__':
    main()
