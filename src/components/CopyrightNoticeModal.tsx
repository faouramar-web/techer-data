import React from 'react';
import { ShieldCheck, Scale, Lock, Award, X, CheckCircle2, FileText } from 'lucide-react';

interface CopyrightNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CopyrightNoticeModal: React.FC<CopyrightNoticeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 text-right animate-in fade-in zoom-in duration-150"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-amber-400 text-xs font-bold tracking-wider uppercase block">
                Official Legal Notice | הודעה משפטית רשמית
              </span>
              <h2 className="text-xl font-black text-white">
                זכויות יוצרים, קניין רוחני והגנת קוד
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            תעודת בעלות בלעדית, רישוי שימוש ואבטחת מידע - מערכת דיווח גמול בגרות
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm text-gray-700 leading-relaxed">
          {/* Main Statement Box */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-950">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-base text-amber-900 mb-1">
                  הבעלות והזכויות הבלעדיות של עמאר פאעור (Amar Faour) © 2026
                </p>
                <p className="text-xs leading-normal font-medium">
                  מערכת זו פותחה, עוצבה ותוכנתה באופן בלעדי על ידי <strong>עמאר פאעור</strong> עבור תיכון מקיף א' ע"ש קאסם גאנם מע'אר.
                  כל הזכויות מכל סוג שהוא שמורות בלעדית ליוצר.
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Hebrew Law */}
          <div className="border border-gray-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
              <Scale className="w-4 h-4 text-sky-700" />
              <span>1. הגנה משפטית ואיסור העתקה (דיני מדינת ישראל)</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              על פי חוק זכויות יוצרים, התשס"ח-2007, ואמנות בינלאומיות להגנת קניין רוחני:
            </p>
            <ul className="text-xs space-y-1.5 text-gray-700 pr-4 list-disc">
              <li>חל איסור מוחלט להעתיק, לשכפל, להפיץ, להעביר, להשכיר, למכור או להעמיד לרשות הציבור כל חלק מהקוד, הממשק, הלוגיקה או מסד הנתונים.</li>
              <li>חל איסור מוחלט על הנדסה לאחור (Reverse Engineering), פירוק (Decompilation), שכפול פלטפורמה או יצירת יצירות נגזרות ללא אישור מפורש בכתב ומראש מעמאר פאעור.</li>
              <li>כל שימוש מחוץ למסגרת הרשמית של תיכון מקיף א' מגאר מהווה הפרה פלילית ואזרחית.</li>
            </ul>
          </div>

          {/* Section 2: English Notice */}
          <div className="border border-gray-200 rounded-xl p-4 bg-slate-50/50 text-left" dir="ltr">
            <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-sky-700" />
              <span>2. International Intellectual Property Notice</span>
            </div>
            <p className="text-xs text-gray-600 mb-2 font-medium">
              <strong>Copyright © 2026 Amar Faour. All Rights Reserved.</strong>
            </p>
            <p className="text-xs text-gray-600 leading-normal">
              This application, its source code, compiled bundles, database schema, user interface design, and algorithmic routines are the exclusive intellectual property of <strong>Amar Faour</strong>. No part of this application may be reproduced, reverse-engineered, decompiled, cloned, distributed, modified, or deployed in any form without prior express written authorization.
            </p>
          </div>

          {/* Section 3: Technical Code Protection */}
          <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-900 font-bold mb-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>3. אבטחת קוד ומניעת שינויים טכניים</span>
            </div>
            <ul className="text-xs space-y-1.5 text-emerald-950 pr-4 list-disc">
              <li><strong>הקוד מוגן בענן:</strong> מורים המקבלים את הקישור מקבלים קבצי ריצה מקומפלים בלבד (Transpiled & Minified Production Bundles). אין להם גישה לקוד המקור, לסביבת הפיתוח או לשרתי הענן.</li>
              <li><strong>חסינות מסדי הנתונים:</strong> חוקי האבטחה (Firestore Rules) מגנים באופן הרמטי על הנתונים. מורה יכול להזין או לתקן אך ורק את הטופס המשויך לתעודת הזהות שלו, ואינו יכול לשנות, למחוק או לעיין בנתוני שכר של מורים אחרים.</li>
              <li><strong>הרשאות ניהול מוגנות:</strong> לוח הניהול והפקת דוחות מרכזים מוגנים בסיסמת מורשה מיוחדת ובאימות דו-שלבי, ואינם נגישים לאף גורם בלתי מורשה.</li>
            </ul>
          </div>

          {/* Creator Signature Card */}
          <div className="bg-gray-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-700">
            <div>
              <div className="font-extrabold text-gray-900 text-sm">עמאר פאעור | Amar Faour</div>
              <div className="text-gray-500">יוצר, מתכנת ובעל זכויות היוצרים הבלעדי</div>
              <div className="text-sky-800 font-mono text-[11px] mt-0.5">faouramar@gmail.com</div>
            </div>
            <div className="text-left sm:text-right font-medium text-gray-500">
              <div>תיכון מקיף א' ע"ש קאסם גאנם מע'אר</div>
              <div className="text-emerald-700 font-bold flex items-center gap-1 justify-end">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>מוגן תחת זכויות יוצרים 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
          >
            הבנתי וסגור
          </button>
        </div>
      </div>
    </div>
  );
};
