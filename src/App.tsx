import React, { useState, useEffect } from 'react';
import { TeacherForm } from './components/TeacherForm';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
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
  Search
} from 'lucide-react';

export default function App() {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
      <footer className="no-print bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-right">
            <span className="font-bold text-gray-800">עיריית מעאר - תיכון מקיף א' ע"ש קאסם גאנם</span>
            <span className="mx-2 text-gray-300">|</span>
            <span>בפיקוח משרד החינוך והתרבות</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500 text-[11px]">
            <span>טלפון: 04/6780194</span>
            <span>פקס: 04/6783467</span>
            <span>ת.ד. 873 מג'אר מיקוד 20128</span>
          </div>
          <div className="text-gray-400 text-[11px]">
            מערכת רשמית לאיסוף והפקת טפסי גמול בגרות ©
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleAdminSuccess}
      />
    </div>
  );
}
