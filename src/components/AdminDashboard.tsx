import React, { useState, useEffect, useRef } from 'react';
import { 
  TeacherSubmission, 
  calculateRowEligiblePercent,
  FormRow,
  COMMON_SUBJECTS,
  EMPTY_ROW,
  SCHOOL_YEARS
} from '../types';
import { 
  getAllSubmissions, 
  subscribeToSubmissions,
  updateSubmissionApproval, 
  updateSubmissionSignature,
  updateSubmission,
  deleteSubmission 
} from '../lib/firebase';
import { OfficialDocumentView } from './OfficialDocumentView';
import { generateWordDocx } from '../lib/generateDocx';
import { 
  Search, 
  Filter, 
  Printer, 
  Download, 
  Eye, 
  Trash2, 
  CheckCircle, 
  Clock, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Share2, 
  Building, 
  Users, 
  FileText, 
  Award,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Radio,
  PenTool,
  RotateCcw,
  Edit3,
  Save,
  Plus
} from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  adminEmail?: string | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, adminEmail }) => {
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveSynced, setIsLiveSynced] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<TeacherSubmission | null>(null);
  const [isApproving, setIsApproving] = useState<TeacherSubmission | null>(null);
  const [approvedBonusInput, setApprovedBonusInput] = useState('');
  const [principalSignInput, setPrincipalSignInput] = useState('מורשה שכר - עירייה');
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Admin editing state (for correcting questionnaire codes, subjects, etc.)
  const [editingSubmissionAdmin, setEditingSubmissionAdmin] = useState<TeacherSubmission | null>(null);
  const [adminEditRows, setAdminEditRows] = useState<FormRow[]>([]);
  const [adminEditName, setAdminEditName] = useState('');
  const [adminEditId, setAdminEditId] = useState('');
  const [adminEditDate, setAdminEditDate] = useState('');
  const [adminEditYear, setAdminEditYear] = useState('');
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState(false);

  // Teacher signature pad modal state
  const [signingSubmission, setSigningSubmission] = useState<TeacherSubmission | null>(null);
  const signaturePadCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPadDrawingRef = useRef(false);
  const [padHasDrawn, setPadHasDrawn] = useState(false);

  const getPadCoordinates = (clientX: number, clientY: number) => {
    const canvas = signaturePadCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePadPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = signaturePadCanvasRef.current;
    if (!canvas) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isPadDrawingRef.current = true;

    const { x, y } = getPadCoordinates(e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7';
  };

  const handlePadPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPadDrawingRef.current) return;
    e.preventDefault();
    const canvas = signaturePadCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPadCoordinates(e.clientX, e.clientY);
    ctx.lineTo(x, y);
    ctx.stroke();
    setPadHasDrawn(true);
  };

  const handlePadPointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPadDrawingRef.current) return;
    isPadDrawingRef.current = false;
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const clearPadCanvas = () => {
    const canvas = signaturePadCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPadHasDrawn(false);
  };

  const handleSaveSignature = async () => {
    if (!signingSubmission || !signingSubmission.id) return;
    const canvas = signaturePadCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    
    try {
      await updateSubmissionSignature(signingSubmission.id, dataUrl);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === signingSubmission.id ? { ...s, teacherSignature: dataUrl } : s))
      );
      if (selectedSubmission?.id === signingSubmission.id) {
        setSelectedSubmission((prev) => (prev ? { ...prev, teacherSignature: dataUrl } : null));
      }
      setSigningSubmission(null);
    } catch (err) {
      console.error('Failed to update signature:', err);
      alert('שגיאה בשמירת החתימה');
    }
  };

  const handleOpenAdminEdit = (sub: TeacherSubmission) => {
    setEditingSubmissionAdmin(sub);
    setAdminEditName(sub.teacherName || '');
    setAdminEditId(sub.teacherId || '');
    setAdminEditDate(sub.submissionDate || '');
    setAdminEditYear(sub.schoolYear || 'תשפ"ז (2026-2027)');
    setAdminEditRows(
      sub.rows && sub.rows.length > 0
        ? sub.rows.map((r, i) => ({ ...EMPTY_ROW, ...r, rowNum: i + 1 }))
        : [{ rowNum: 1, ...EMPTY_ROW }]
    );
  };

  const handleAdminRowChange = (index: number, field: keyof FormRow, value: string) => {
    setAdminEditRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };
      if (
        field === 'externalExamBonus' ||
        field === 'schoolExamBonus' ||
        field === 'projectBonus' ||
        field === 'unitsCount' ||
        field === 'outOfUnits'
      ) {
        target.eligibleBonusPercent = calculateRowEligiblePercent(target);
      }
      updated[index] = target;
      return updated;
    });
  };

  const handleAdminAddRow = () => {
    setAdminEditRows((prev) => [
      ...prev,
      { rowNum: prev.length + 1, ...EMPTY_ROW }
    ]);
  };

  const handleAdminRemoveRow = (index: number) => {
    if (adminEditRows.length <= 1) {
      setAdminEditRows([{ rowNum: 1, ...EMPTY_ROW }]);
      return;
    }
    setAdminEditRows((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((r, i) => ({ ...r, rowNum: i + 1 }));
    });
  };

  const handleSaveAdminEdit = async () => {
    if (!editingSubmissionAdmin || !editingSubmissionAdmin.id) return;
    setIsSavingAdminEdit(true);
    try {
      const updatedPayload: Partial<TeacherSubmission> = {
        teacherName: adminEditName.trim(),
        teacherId: adminEditId.trim(),
        submissionDate: adminEditDate,
        schoolYear: adminEditYear,
        rows: adminEditRows,
      };

      await updateSubmission(editingSubmissionAdmin.id, updatedPayload);

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === editingSubmissionAdmin.id ? { ...s, ...updatedPayload } : s
        )
      );

      if (selectedSubmission?.id === editingSubmissionAdmin.id) {
        setSelectedSubmission((prev) => (prev ? { ...prev, ...updatedPayload } : null));
      }

      setEditingSubmissionAdmin(null);
    } catch (err) {
      console.error('Error saving admin edits:', err);
      alert('אירעה שגיאה בשמירת השינויים.');
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  // Fetch all submissions
  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const data = await getAllSubmissions();
      setSubmissions(data);
      setIsLiveSynced(true);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    loadSubmissions();

    // Attach real-time Firestore listener for all mobile & desktop submissions
    const unsubscribe = subscribeToSubmissions(
      (updatedList) => {
        setSubmissions(updatedList);
        setIsLoading(false);
        setIsLiveSynced(true);
      },
      (err) => {
        console.warn('Real-time listener warning, using manual refresh:', err);
        setIsLiveSynced(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.teacherId.includes(searchQuery) ||
      sub.rows.some((r) => r.subject.toLowerCase().includes(searchQuery.toLowerCase()) || r.questionnaireCode.includes(searchQuery));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'approved' && sub.principalApproved) ||
      (statusFilter === 'pending' && !sub.principalApproved);

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalTeachers = submissions.length;
  const approvedCount = submissions.filter((s) => s.principalApproved).length;
  const pendingCount = totalTeachers - approvedCount;
  const totalQuestionnaires = submissions.reduce(
    (acc, s) => acc + s.rows.filter((r) => r.subject || r.questionnaireCode).length,
    0
  );

  const handleCopyTeacherLink = () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDownloadWord = async (sub: TeacherSubmission) => {
    try {
      const blob = await generateWordDocx(sub);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `טופס_גמול_בגרות_${sub.teacherName.replace(/\s+/g, '_')}_${sub.teacherId}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error generating docx:', e);
      alert('שגיאה בהורדת קובץ Word');
    }
  };

  const handlePrintSingle = (sub: TeacherSubmission) => {
    setSelectedSubmission(sub);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleBatchPrint = () => {
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
      setIsBatchPrinting(false);
    }, 500);
  };

  const handleApprove = async () => {
    if (!isApproving || !isApproving.id) return;
    try {
      await updateSubmissionApproval(
        isApproving.id,
        true,
        approvedBonusInput || '100%',
        principalSignInput
      );
      await loadSubmissions();
      setIsApproving(null);
    } catch (e) {
      console.error('Failed to approve submission:', e);
      alert('שגיאה בעדכון אישור מורשה שכר');
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('האם אתה בטוח שברצונך למחוק טופס זה? פעולה זו היא בלתי הפיכה.')) {
      return;
    }
    try {
      await deleteSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    } catch (e) {
      console.error('Failed to delete submission:', e);
      alert('שגיאה במחיקת הטופס');
    }
  };

  // CSV export for municipality
  const exportToCSV = () => {
    const headers = [
      'שם המורה',
      'תעודת זהות',
      'תאריך הגשה',
      'שנת לימודים',
      'מקצוע',
      'כיתה/קבוצה',
      'מספר תלמידים',
      'סמל שאלון',
      'בחינה חיצונית 70%',
      'בחינה בית ספרית 30%',
      'פרויקט',
      'מספר יח"ל',
      'מתוך',
      'זכאי לגמול %',
      'אישור מורשה שכר (עירייה)',
      'גמול מאושר %'
    ];

    const rowsData: string[][] = [];
    submissions.forEach((sub) => {
      const activeRows = sub.rows.filter((r) => r.subject || r.questionnaireCode);
      if (activeRows.length === 0) {
        rowsData.push([
          `"${sub.teacherName}"`,
          `="${sub.teacherId}"`,
          sub.submissionDate,
          sub.schoolYear,
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          sub.principalApproved ? 'מאושר' : 'ממתין',
          sub.approvedBonusPercent || ''
        ]);
      } else {
        activeRows.forEach((r) => {
          rowsData.push([
            `"${sub.teacherName}"`,
            `="${sub.teacherId}"`,
            sub.submissionDate,
            sub.schoolYear,
            `"${r.subject}"`,
            `"${r.gradeGroup}"`,
            r.studentsCount,
            `="${r.questionnaireCode}"`,
            r.externalExamBonus ? `${r.externalExamBonus}%` : '',
            r.schoolExamBonus ? `${r.schoolExamBonus}%` : '',
            r.projectBonus ? `${r.projectBonus}%` : '',
            r.unitsCount,
            r.outOfUnits,
            (r.eligibleBonusPercent || calculateRowEligiblePercent(r)) ? `${r.eligibleBonusPercent || calculateRowEligiblePercent(r)}%` : '',
            sub.principalApproved ? 'מאושר' : 'ממתין',
            sub.approvedBonusPercent || ''
          ]);
        });
      }
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rowsData.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ריכוז_גמולי_בגרות_מקיף_א_מגאר_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 py-6 md:py-8 ${selectedSubmission || isBatchPrinting ? 'print:p-0 print:m-0 print:max-w-full' : ''}`}>
      <div className={`${selectedSubmission || isBatchPrinting ? 'print:hidden' : ''}`}>
        {/* Top Header Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-sky-700" />
              פורטל ניהול ומחלקת שכר
            </span>
            <span className="text-xs text-gray-500 font-medium">
              מקיף א' ע"ש קאסם גאנם מגאר (סמל מוסד: 800136)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-2">
            לוח בקרה ואיסוף נתוני גמול בגרות
          </h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">
            צפייה בכל דיווחי המורים, אישור מחלקת שכר / מורשה שכר, והפקת טפסי Word ו-PDF רשמיים לעירייה.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Cloud Sync status */}
          <div className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            isLiveSynced 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>{isLiveSynced ? 'סנכרון ענן בזמן אמת פעיל' : 'סנכרון מקומי (לחץ רענן)'}</span>
          </div>

          {/* Share teacher link */}
          <button
            onClick={handleCopyTeacherLink}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-xs ${
              copiedLink
                ? 'bg-emerald-600 text-white'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiedLink ? 'הקישור הועתק!' : 'העתק קישור למורים'}
          </button>

          {/* Refresh */}
          <button
            onClick={loadSubmissions}
            disabled={isLoading}
            className="px-3 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 text-gray-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title="רענן נתונים ממאגר הענן של בית הספר"
          >
            <RefreshCw className={`w-4 h-4 text-sky-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>רענן מענן</span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-rose-50 hover:text-rose-600 text-gray-600 text-xs md:text-sm font-semibold transition cursor-pointer"
          >
            יציאה מניהול
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500">סך הכל מורים שהגישו</div>
            <div className="text-2xl font-black text-gray-900">{totalTeachers}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500">שאלוני בגרות שדווחו</div>
            <div className="text-2xl font-black text-gray-900">{totalQuestionnaires}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500">אושר ע"י מורשה שכר</div>
            <div className="text-2xl font-black text-emerald-700">{approvedCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500">ממתינים לאישור מורשה שכר</div>
            <div className="text-2xl font-black text-amber-700">{pendingCount}</div>
          </div>
        </div>
      </div>

      {/* Main Actions Bar (Municipality batch actions) */}
      <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-4 md:p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sky-950 text-base flex items-center gap-2">
            <Building className="w-5 h-5 text-sky-700" />
            הגשה מרוכזת לעיריית מעאר
          </h3>
          <p className="text-xs md:text-sm text-sky-800 mt-0.5">
            הדפסת כל הטפסים בבת אחת בפורמט הרשמי או ייצוא טבלה מרכזת ל-Excel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleBatchPrint}
            disabled={submissions.length === 0}
            className="px-5 py-2.5 bg-sky-800 hover:bg-sky-900 disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            הדפסה מרוכזת לעירייה ({filteredSubmissions.length} טפסים)
          </button>

          <button
            onClick={exportToCSV}
            disabled={submissions.length === 0}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            ייצוא דו"ח מרכז (Excel/CSV)
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש לפי שם מורה, תעודת זהות, מקצוע..."
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-sky-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            הכל ({submissions.length})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            מאושרים ע"י שכר ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ממתינים לאישור ({pendingCount})
          </button>
        </div>
      </div>

      {/* Submissions List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-500">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            טוען רשימת מורים מהענן...
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-700 mb-1">
              לא נמצאו טפסים {searchQuery ? 'התואמים לחיפוש' : 'עדיין'}
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              כאשר מורים ימלאו את הטופס בקישור ששלחת, הנתונים שלהם יופיעו כאן באופן אוטומטי.
            </p>
            <button
              onClick={handleCopyTeacherLink}
              className="mt-4 px-4 py-2 bg-sky-700 text-white text-xs font-bold rounded-lg hover:bg-sky-800 transition cursor-pointer"
            >
              העתק קישור לשליחה למורים
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-700 border-b border-gray-200 font-bold">
                  <th className="p-3.5 pr-6">שם המורה</th>
                  <th className="p-3.5">תעודת זהות</th>
                  <th className="p-3.5">תאריך הגשה</th>
                  <th className="p-3.5">שאלוני בגרות</th>
                  <th className="p-3.5">סטטוס אישור שכר</th>
                  <th className="p-3.5">גמול מאושר</th>
                  <th className="p-3.5 pl-6 text-center">פעולות ומסמכים</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubmissions.map((sub) => {
                  const activeCount = sub.rows.filter(
                    (r) => r.subject || r.questionnaireCode
                  ).length;

                  return (
                    <tr key={sub.id} className="hover:bg-sky-50/30 transition">
                      {/* Name & Signature status */}
                      <td className="p-3.5 pr-6 text-gray-900 text-sm">
                        <div className="font-bold">{sub.teacherName}</div>
                        <div className="mt-0.5">
                          {sub.teacherSignature && sub.teacherSignature.startsWith('data:image/') ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <PenTool className="w-3 h-3 text-emerald-600" />
                              נחתם בכתב יד
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                              <span>חתימה:</span>
                              <span className="font-semibold text-gray-700">
                                {sub.teacherSignature
                                  ? (sub.teacherSignature.includes('חתימה גרפית') || sub.teacherSignature.includes('דיגיטלית')
                                      ? `${sub.teacherName} (מאושר)`
                                      : sub.teacherSignature)
                                  : sub.teacherName}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* ID */}
                      <td className="p-3.5 font-mono text-gray-700">
                        {sub.teacherId}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-gray-600">
                        {sub.submissionDate}
                      </td>

                      {/* Count & sample */}
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                          {activeCount} שאלונים
                        </span>
                        <div className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[200px]">
                          {sub.rows
                            .filter((r) => r.subject)
                            .map((r) => r.subject)
                            .join(', ')}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {sub.principalApproved ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            אושר ע"י מורשה שכר
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            ממתין לאישור מורשה שכר
                          </span>
                        )}
                      </td>

                      {/* Approved bonus */}
                      <td className="p-3.5 font-bold text-gray-900">
                        {sub.approvedBonusPercent || '-'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pl-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* View Official Doc */}
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-1.5 text-gray-700 hover:text-sky-700 hover:bg-sky-100 rounded-lg transition cursor-pointer"
                            title="צפייה בטופס הרשמי"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Details & Questionnaires */}
                          <button
                            onClick={() => handleOpenAdminEdit(sub)}
                            className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title="ערוך פרטי טופס / תקן סמל שאלון"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Hand-drawn touch signature button */}
                          <button
                            onClick={() => {
                              setSigningSubmission(sub);
                              setPadHasDrawn(false);
                            }}
                            className="p-1.5 text-sky-600 hover:text-sky-800 hover:bg-sky-100 rounded-lg transition cursor-pointer"
                            title="הוסף / עדכן חתימת מורה בכתב יד"
                          >
                            <PenTool className="w-4 h-4" />
                          </button>

                          {/* Print / PDF */}
                          <button
                            onClick={() => handlePrintSingle(sub)}
                            className="p-1.5 text-gray-700 hover:text-sky-700 hover:bg-sky-100 rounded-lg transition cursor-pointer"
                            title="הדפס / שמור כ-PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Download Word */}
                          <button
                            onClick={() => handleDownloadWord(sub)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="הורד קובץ Word (.docx)"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Approve Modal Trigger */}
                          <button
                            onClick={() => {
                              setIsApproving(sub);
                              setApprovedBonusInput(sub.approvedBonusPercent || '100%');
                            }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="חתימה ואישור מורשה שכר - עירייה"
                          >
                            <Award className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="מחק טופס"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* SINGLE SUBMISSION VIEW MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto flex items-center justify-center p-4 print:static print:p-0 print:bg-transparent print:overflow-visible print:z-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative animate-scale-up print:max-h-none print:overflow-visible print:shadow-none print:border-none print:w-full print:p-0 print:m-0">
            {/* Modal Header - NO PRINT */}
            <div className="no-print sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 text-sky-800 rounded-full flex items-center justify-center font-bold">
                  {selectedSubmission.teacherName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    טופס רשמי: {selectedSubmission.teacherName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    ת.ז. {selectedSubmission.teacherId} | הוגש בתאריך {selectedSubmission.submissionDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenAdminEdit(selectedSubmission)}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  title="ערוך שאלונים ופרטי מורה / תקן סמל שאלון"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>ערוך שאלונים</span>
                </button>

                <button
                  onClick={() => {
                    setSigningSubmission(selectedSubmission);
                    setPadHasDrawn(false);
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  title="חתום / עדכן באצבע או עכבר"
                >
                  <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {selectedSubmission.teacherSignature?.startsWith('data:image/')
                      ? 'עדכן חתימה גרפית'
                      : 'הוסף חתימת כתב יד'}
                  </span>
                </button>

                <button
                  onClick={() => handlePrintSingle(selectedSubmission)}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  הדפס / שמור כ-PDF
                </button>

                <button
                  onClick={() => handleDownloadWord(selectedSubmission)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  הורד קובץ Word (.docx)
                </button>

                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Document Body */}
            <div className="p-6 md:p-8 bg-gray-50 print:p-0 print:bg-transparent">
              <div className="print-area print:p-0 print:m-0">
                <OfficialDocumentView submission={selectedSubmission} isPrintPreview={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL MODAL */}
      {isApproving && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              אישור מחלקת שכר - עירייה לטופס גמול בגרות
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              עבור המורה: <strong>{isApproving.teacherName}</strong> (ת.ז. {isApproving.teacherId})
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  חתימת מורשה שכר (שם / תפקיד):
                </label>
                <input
                  type="text"
                  value={principalSignInput}
                  onChange={(e) => setPrincipalSignInput(e.target.value)}
                  placeholder={'לדוגמה: מורשה שכר - עיריית מגאר'}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  לשימוש המאשר : זכאי לגמול של:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={approvedBonusInput}
                    onChange={(e) => setApprovedBonusInput(e.target.value)}
                    placeholder="100%"
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 text-center"
                  />
                  <span className="text-xs font-bold text-gray-600">אחוזים</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                נוסח האישור: "הריני לאשר את נכונות הנתונים וזכאות המורה לגמול שכר עירייה."
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsApproving(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleApprove}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                אשר וחתום כמורשה שכר
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIGNATURE PAD MODAL (Touchscreen & Mouse) */}
      {signingSubmission && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-scale-up">
            <div className="flex justify-between items-center mb-3 border-b pb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-sky-600" />
                חתימה בכתב יד: {signingSubmission.teacherName}
              </h3>
              <button
                type="button"
                onClick={() => setSigningSubmission(null)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              חתום/י באצבע על מסך המגע או עם העכבר. החתימה נשמרת בענן ותופיע בכל תצוגה והדפסה כולל שם המורה.
            </p>

            <div className="relative border-2 border-dashed border-sky-300 rounded-xl bg-white p-1 mb-3 shadow-inner overflow-hidden">
              <div className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded-t-lg border-b border-gray-200 text-xs">
                <span className="font-semibold text-gray-700">משטח חתימה דיגיטלי:</span>
                <button
                  type="button"
                  onClick={clearPadCanvas}
                  className="text-rose-600 hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  נקה חתימה
                </button>
              </div>
              <canvas
                ref={signaturePadCanvasRef}
                width={440}
                height={140}
                onPointerDown={handlePadPointerDown}
                onPointerMove={handlePadPointerMove}
                onPointerUp={handlePadPointerUp}
                onPointerCancel={handlePadPointerUp}
                onTouchStart={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  if (touch) {
                    const canvas = signaturePadCanvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    isPadDrawingRef.current = true;
                    const { x, y } = getPadCoordinates(touch.clientX, touch.clientY);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = '#0284c7';
                  }
                }}
                onTouchMove={(e) => {
                  if (!isPadDrawingRef.current) return;
                  e.preventDefault();
                  const touch = e.touches[0];
                  if (touch) {
                    const canvas = signaturePadCanvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    const { x, y } = getPadCoordinates(touch.clientX, touch.clientY);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                    setPadHasDrawn(true);
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handlePadPointerUp();
                }}
                style={{ touchAction: 'none' }}
                className="w-full h-32 touch-none cursor-crosshair bg-sky-50/20 rounded-b-lg block"
              />
              {!padHasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-xs font-medium">
                  ✍️ חתום/י כאן באצבע
                </div>
              )}
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-xs text-sky-900 mb-5 flex items-center justify-between">
              <span className="font-semibold">תופיע במסמך הרשמי:</span>
              <span className="font-bold">חתימה גרפית + ({signingSubmission.teacherName})</span>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSigningSubmission(null)}
                className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                שמור חתימה בטופס
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN EDIT MODAL (FOR DIRECTLY FIXING QUESTIONNAIRE CODES OR TEACHER DETAILS) */}
      {editingSubmissionAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative animate-scale-up">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">
                    עריכת פרטי שאלונים ומורה (תיקון סמלי שאלון)
                  </h3>
                  <p className="text-xs text-gray-500">
                    מורה: {editingSubmissionAdmin.teacherName} | אסמכתא: {editingSubmissionAdmin.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingSubmissionAdmin(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Teacher Info Inputs */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                <h4 className="text-xs font-bold text-gray-700 mb-3">פרטי מורה והגשה</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">שם המורה</label>
                    <input
                      type="text"
                      value={adminEditName}
                      onChange={(e) => setAdminEditName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">תעודת זהות</label>
                    <input
                      type="text"
                      maxLength={9}
                      value={adminEditId}
                      onChange={(e) => setAdminEditId(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 border rounded-lg text-xs font-mono font-semibold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">תאריך הגשה</label>
                    <input
                      type="date"
                      value={adminEditDate}
                      onChange={(e) => setAdminEditDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">שנת לימודים</label>
                    <select
                      value={adminEditYear}
                      onChange={(e) => setAdminEditYear(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-semibold"
                    >
                      {SCHOOL_YEARS.map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Rows / Questionnaires Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900">
                      שאלוני בגרות (תיקון סמלי שאלון ואחוזי גמול)
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      שים לב במיוחד לעמודת "סמל שאלון" – ניתן לתקן כל שאלון ישירות.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAdminAddRow}
                    className="px-3 py-1.5 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-300 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    הוסף שורת שאלון
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-sky-50 text-sky-950 font-bold border-b border-sky-200">
                      <tr>
                        <th className="p-2.5 w-8 text-center">#</th>
                        <th className="p-2.5 min-w-[130px] text-amber-900 bg-amber-50/80">סמל שאלון ✏️</th>
                        <th className="p-2.5 min-w-[140px]">מקצוע</th>
                        <th className="p-2.5 min-w-[100px]">כיתה/קבוצה</th>
                        <th className="p-2.5 w-20 text-center">תלמידים</th>
                        <th className="p-2.5 w-16 text-center">יח"ל</th>
                        <th className="p-2.5 w-16 text-center">מתוך</th>
                        <th className="p-2.5 w-20 text-center">בחינה 70%</th>
                        <th className="p-2.5 w-20 text-center">בחינה 30%</th>
                        <th className="p-2.5 w-20 text-center">פרויקט %</th>
                        <th className="p-2.5 w-20 text-center font-black">זכאי %</th>
                        <th className="p-2.5 w-12 text-center">מחיקה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {adminEditRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70">
                          <td className="p-2 text-center font-bold text-gray-500">{idx + 1}</td>
                          {/* Questionnaire Code Input */}
                          <td className="p-2 bg-amber-50/40">
                            <input
                              type="text"
                              value={row.questionnaireCode}
                              onChange={(e) => handleAdminRowChange(idx, 'questionnaireCode', e.target.value)}
                              placeholder="סמל שאלון"
                              className="w-full px-2 py-1.5 border border-amber-300 rounded font-mono font-bold text-amber-950 bg-white focus:ring-2 focus:ring-amber-500 text-xs"
                            />
                          </td>
                          {/* Subject */}
                          <td className="p-2">
                            <input
                              type="text"
                              list={`subjects_list_${idx}`}
                              value={row.subject}
                              onChange={(e) => handleAdminRowChange(idx, 'subject', e.target.value)}
                              placeholder="בחר או הקלד מקצוע"
                              className="w-full px-2 py-1.5 border rounded text-xs bg-white"
                            />
                            <datalist id={`subjects_list_${idx}`}>
                              {COMMON_SUBJECTS.map((s) => (
                                <option key={s} value={s} />
                              ))}
                            </datalist>
                          </td>
                          {/* Grade / Group */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.gradeGroup}
                              onChange={(e) => handleAdminRowChange(idx, 'gradeGroup', e.target.value)}
                              placeholder="למשל יא1"
                              className="w-full px-2 py-1.5 border rounded text-xs"
                            />
                          </td>
                          {/* Students Count */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.studentsCount}
                              onChange={(e) => handleAdminRowChange(idx, 'studentsCount', e.target.value.replace(/\D/g, ''))}
                              className="w-full px-1.5 py-1.5 border rounded text-center text-xs"
                            />
                          </td>
                          {/* Units count */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.unitsCount}
                              onChange={(e) => handleAdminRowChange(idx, 'unitsCount', e.target.value)}
                              className="w-full px-1.5 py-1.5 border rounded text-center text-xs"
                            />
                          </td>
                          {/* Out of units */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.outOfUnits}
                              onChange={(e) => handleAdminRowChange(idx, 'outOfUnits', e.target.value)}
                              className="w-full px-1.5 py-1.5 border rounded text-center text-xs"
                            />
                          </td>
                          {/* 70% */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.externalExamBonus}
                              onChange={(e) => handleAdminRowChange(idx, 'externalExamBonus', e.target.value)}
                              className="w-full px-1 py-1.5 border rounded text-center text-xs"
                              placeholder="%"
                            />
                          </td>
                          {/* 30% */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.schoolExamBonus}
                              onChange={(e) => handleAdminRowChange(idx, 'schoolExamBonus', e.target.value)}
                              className="w-full px-1 py-1.5 border rounded text-center text-xs"
                              placeholder="%"
                            />
                          </td>
                          {/* Project */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.projectBonus}
                              onChange={(e) => handleAdminRowChange(idx, 'projectBonus', e.target.value)}
                              className="w-full px-1 py-1.5 border rounded text-center text-xs"
                              placeholder="%"
                            />
                          </td>
                          {/* Eligible Percent */}
                          <td className="p-2 text-center font-bold text-sky-900 bg-sky-50/50">
                            <input
                              type="text"
                              value={row.eligibleBonusPercent}
                              onChange={(e) => handleAdminRowChange(idx, 'eligibleBonusPercent', e.target.value)}
                              className="w-full px-1 py-1.5 border rounded text-center text-xs font-bold"
                              placeholder="%"
                            />
                          </td>
                          {/* Remove button */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleAdminRemoveRow(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                              title="מחק שורה זו"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setEditingSubmissionAdmin(null)}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                ביטול ללא שמירה
              </button>

              <button
                type="button"
                disabled={isSavingAdminEdit}
                onClick={handleSaveAdminEdit}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                {isSavingAdminEdit ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                שמור שינויים ותקן בענן
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HIDDEN BATCH PRINT CONTAINER (Visible only in print mode when batch printing) */}
      {isBatchPrinting && (
        <div className="print-only-batch hidden">
          {filteredSubmissions.map((sub, i) => (
            <div key={sub.id || i} className="page-break mb-12">
              <OfficialDocumentView submission={sub} isPrintPreview={true} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
