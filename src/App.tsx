import React, { useState, useEffect } from 'react';
import { TeacherForm } from './components/TeacherForm';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { CopyrightNoticeModal } from './components/CopyrightNoticeModal';
import { auth, onAuthStateChanged, signOut } from './lib/firebase';
import { 
  GraduationCap, 
  Lock, 
  ShieldCheck, 
  Share2, 
  Check, 
  Copy, 
  Phone, 
  MapPin, 
  FileText,
  UserCheck,
  Search,
  Scale,
  Award
} from 'lucide-react';

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCopyrightModalOpen, setIsCopyrightModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentView, setCurrentView] = useState<'teacher' | 'admin'>('teacher');

  useEffect(() => {
    // Check if URL has ?admin=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true' || params.get('admin') === '1') {
      setIsLoginModalOpen(true);
    }

    // Check session storage
    const savedAdmin = sessionStorage.getItem('maghar_admin_authenticated');
    if (savedAdmin === 'true') {
      setIsAdminLoggedIn(true);
      setCurrentView('admin');
    }

    // Check Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        setIsAdminLoggedIn(true);
        setAdminEmail(user.email);
        sessionStorage.setItem('maghar_admin_authenticated', 'true');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAdminSuccess = (email?: string) => {
    setIsAdminLoggedIn(true);
    setAdminEmail(email || 'faouramar@gmail.com');
    sessionStorage.setItem('maghar_admin_authenticated', 'true');
    setIsLoginModalOpen(false);
    setCurrentView('admin');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setIsAdminLoggedIn(false);
    setAdminEmail(null);
    sessionStorage.removeItem('maghar_admin_authenticated');
    setCurrentView('teacher');
  };

  const handleCopyLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar (Hidden in Print) */}
      <header className="no-print bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and school brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-sky-400 bg-sky-50 flex items-center justify-center p-1">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                <circle cx="50" cy="50" r="46" stroke="#0284c7" strokeWidth="3" fill="#f0f9ff" />
                <path d="M50 14 L50 22 M50 78 L50 86 M14 50 L22 50 M78 50 L86 50" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M28 58 Q50 62 50 42 Q50 62 72 58 L72 68 Q50 72 50 52 Q50 72 28 68 Z" fill="#0284c7" />
                <path d="M50 26 C46 32 44 36 50 41 C56 36 54 32 50 26 Z" fill="#e11d48" />
              </svg>
            </div>
            <div>
              <div className="font-extrabold text-sm md:text-base text-gray-900 leading-tight">
                תיכון מקיף א' ע"ש קאסם גאנם מגאר
              </div>
              <div className="text-[11px] text-gray-500 font-medium">
                דיווח זכאות לגמול הכנה לבגרות | סמל מוסד: 800136
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Quick search/edit button for teachers */}
            <button
              onClick={() => {
                if (currentView !== 'teacher') {
                  setCurrentView('teacher');
                }
                setTimeout(() => {
                  const searchEl = document.getElementById('teacher-lookup-section');
                  if (searchEl) {
                    searchEl.scrollIntoView({ behavior: 'smooth' });
                  }
                  const inputEl = document.getElementById('teacher-lookup-input') as HTMLInputElement;
                  if (inputEl) {
                    inputEl.focus();
                  }
                }, 100);
              }}
              title="איתור ועריכת טופס שכבר נשלח לפי תעודת זהות"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold rounded-lg transition cursor-pointer shadow-2xs"
            >
              <Search className="w-3.5 h-3.5 text-amber-700" />
              <span>איתור / תיקון טופס</span>
            </button>

            {/* Share link to teachers button */}
            <button
              onClick={handleCopyLink}
              title="העתק קישור לשליחה למורים בוואטסאפ או במייל"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? 'הקישור הועתק!' : 'העתק קישור'}
            </button>

            {/* Admin toggle / login */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView(currentView === 'admin' ? 'teacher' : 'admin')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    currentView === 'admin'
                      ? 'bg-sky-800 text-white shadow-xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  {currentView === 'admin' ? 'בלוח הניהול' : 'מעבר לניהול'}
                </button>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 cursor-pointer"
                >
                  יציאה
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                כניסת מורשה שכר / הנהלה
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1">
        {currentView === 'admin' && isAdminLoggedIn ? (
          <AdminDashboard onLogout={handleLogout} adminEmail={adminEmail} />
        ) : (
          <TeacherForm />
        )}
      </main>

      {/* Footer (Hidden in Print) */}
      <footer className="no-print bg-slate-900 text-slate-300 border-t border-slate-800 pt-8 pb-10 mt-16 text-xs">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          {/* Top row: School identity & contact */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800 text-center md:text-right">
            <div>
              <span className="font-bold text-white text-sm">עיריית מעאר - תיכון מקיף א' ע"ש קאסם גאנם</span>
              <span className="mx-2 text-slate-600 hidden md:inline">|</span>
              <span className="text-slate-400 block md:inline mt-1 md:mt-0">בפיקוח משרד החינוך והתרבות • סמל מוסד: 800136</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 text-[11px]">
              <span>טלפון: 04/6780194</span>
              <span className="text-slate-700">•</span>
              <span>פקס: 04/6783467</span>
              <span className="text-slate-700">•</span>
              <span>ת.ד. 873 מג'אר מיקוד 20128</span>
            </div>
          </div>

          {/* Middle row: Formal Copyright & Intellectual Property Protection Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-inner">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-2 text-right w-full lg:max-w-4xl">
                {/* Hebrew Legal Notice */}
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-slate-200 font-extrabold text-xs sm:text-sm">
                      כל הזכויות שמורות בלעדית ל<span className="text-amber-400 font-black">עמאר פאעור</span> (Amar Faour) © 2026
                    </p>
                    <p className="text-slate-400 text-[11px] sm:text-xs leading-relaxed mt-0.5">
                      המערכת פותחה באופן ייחודי עבור תיכון מקיף א' ע"ש קאסם גאנם מע'אר. חל איסור מוחלט על העתקה, שכפול, הפצה, הנדסה חוזרת (Reverse Engineering), פירוק קוד, שינוי כלשהו או שימוש מסחרי/חיצוני ללא אישור מפורש בכתב מבעל הזכויות.
                    </p>
                  </div>
                </div>

                {/* English Legal Notice */}
                <div className="text-left pt-2 border-t border-slate-800/80" dir="ltr">
                  <p className="text-slate-300 font-bold text-[11px]">
                    All Rights Reserved Exclusively to <span className="text-amber-400 font-bold">Amar Faour</span> © 2026.
                  </p>
                  <p className="text-slate-400 text-[10.5px] leading-relaxed">
                    Proprietary software application developed for Maghar Comprehensive High School. Any unauthorized duplication, modification, reverse engineering, decompilation, redistribution, or commercial use is strictly prohibited by law.
                  </p>
                </div>
              </div>

              {/* Legal Button */}
              <div className="shrink-0 w-full lg:w-auto flex justify-center lg:justify-end">
                <button
                  type="button"
                  onClick={() => setIsCopyrightModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs w-full lg:w-auto justify-center"
                >
                  <Scale className="w-3.5 h-3.5 text-amber-400" />
                  <span>תנאי שימוש והגנה משפטית</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row: status & info */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 text-center sm:text-right">
            <div>
              מערכת מאובטחת לאיסוף, בקרה והפקת טפסי גמול בגרות תשפ"ו
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>קוד מערכת מאובטח ומוגן</span>
              <span className="mx-1">•</span>
              <span>v2.4.0</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Copyright & Legal Notice Modal */}
      <CopyrightNoticeModal
        isOpen={isCopyrightModalOpen}
        onClose={() => setIsCopyrightModalOpen(false)}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleAdminSuccess}
      />
    </div>
  );
}
