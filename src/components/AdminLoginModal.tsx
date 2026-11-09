import React, { useState } from 'react';
import { Lock, KeyRound, X } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email?: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pinCode, setPinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handles Password login exclusively
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const validPins = ['2611'];
    if (validPins.includes(pinCode.trim())) {
      onSuccess('מורשה שכר והנהלה');
    } else {
      setErrorMsg('סיסמת כניסה שגויה. אנא נסה שנית.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 md:p-8 shadow-2xl relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg cursor-pointer transition"
          aria-label="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-sky-100 text-sky-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
          <Lock className="w-7 h-7 stroke-[2.2]" />
        </div>

        <h2 className="text-xl font-extrabold text-gray-900 text-center mb-1">
          כניסת מחלקת שכר ומורשים
        </h2>
        <p className="text-xs text-gray-500 text-center mb-6 leading-relaxed">
          הזן את סיסמת המנהל לצפייה בכלל הטפסים, אישור גמולים, הפקת דוחות ונעילת המערכת
        </p>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold mb-4 text-center animate-shake">
            {errorMsg}
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 text-right">
              סיסמת מנהל:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-gray-400 absolute right-3 top-3.5" />
              <input
                type="password"
                autoFocus
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="הקלד כאן את הסיסמה..."
                autoComplete="current-password"
                className="w-full pr-10 pl-3 py-2.5 border-2 border-gray-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-200 rounded-xl text-base font-mono text-center tracking-widest text-gray-900 font-bold transition outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-sky-800 hover:bg-sky-900 active:scale-98 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
          >
            כניסה ללוח הניהול
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 text-[11px] text-gray-400 text-center">
          🔒 הגישה ללוח הניהול מוגנת וחסויה לצוות המורשה בלבד.
        </div>
      </div>
    </div>
  );
};
