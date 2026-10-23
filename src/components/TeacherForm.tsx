import React, { useState, useRef, useEffect } from 'react';
import { 
  FormRow, 
  TeacherSubmission, 
  COMMON_SUBJECTS, 
  EMPTY_ROW, 
  SCHOOL_YEARS,
  calculateRowEligiblePercent,
  parseBonusNumber
} from '../types';
import { validateIsraeliId } from '../lib/idValidator';
import { createSubmission, updateSubmission, findSubmissionsByTeacherId } from '../lib/firebase';
import { OfficialDocumentView } from './OfficialDocumentView';
import { generateWordDocx } from '../lib/generateDocx';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Calendar, 
  User, 
  CreditCard, 
  PenTool, 
  Info, 
  Search, 
  Edit3, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  History,
  Lock,
  Key,
  ShieldAlert
} from 'lucide-react';

export const TeacherForm: React.FC = () => {
  const [teacherName, setTeacherName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [secretPin, setSecretPin] = useState('');
  const [submissionDate, setSubmissionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [schoolYear, setSchoolYear] = useState('תשפ"ז (2026-2027)');
  const [teacherSignature, setTeacherSignature] = useState('');
  const [signatureMode, setSignatureMode] = useState<'text' | 'draw'>('draw');

  // Existing submission editing state (with secret PIN security)
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupIdInput, setLookupIdInput] = useState('');
  const [lookupPinInput, setLookupPinInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResults, setLookupResults] = useState<TeacherSubmission[] | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Canvas ref for drawing signature on mobile touchscreens and desktop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  // Initialize with 1 row, teacher can add more rows dynamically with (+)
  const [rows, setRows] = useState<FormRow[]>([
    {
      rowNum: 1,
      ...EMPTY_ROW,
    },
  ]);

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        rowNum: prev.length + 1,
        ...EMPTY_ROW,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      handleClearRow(0);
      return;
    }
    setRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((r, i) => ({ ...r, rowNum: i + 1 }));
    });
  };

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<TeacherSubmission | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check if at least one row has data
  const hasAtLeastOneRow = rows.some(
    (r) => r.subject.trim() || r.questionnaireCode.trim()
  );

  // Total statistics for payroll and municipality accuracy
  const totalStudentsCount = rows.reduce((sum, r) => {
    const val = parseInt(r.studentsCount || '', 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalBonusPercent = rows.reduce((sum, r) => {
    const val = parseBonusNumber(r.eligibleBonusPercent);
    return sum + val;
  }, 0);

  // Auto-calculate eligible bonus % across external exam, school exam, project, and units
  const handleRowChange = (index: number, field: keyof FormRow, value: string) => {
    setRows((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [field]: value };

      // When user updates external exam 70%, school exam 30%, project, or units:
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

  const handleClearRow = (index: number) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        rowNum: index + 1,
        ...EMPTY_ROW,
      };
      return updated;
    });
  };

  // Canvas drawing handlers with robust touchscreen, stylus, and mouse pointer support
  const getCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawingRef.current = true;
    setIsDrawing(true);

    const { x, y } = getCoordinates(e.clientX, e.clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0284c7';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e.clientX, e.clientY);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const handlePointerUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setTeacherSignature(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
    setTeacherSignature('');
  };

  // Helper functions for loading and updating existing submissions (e.g. fixing questionnaire codes)
  const handleLoadSubmissionForEditing = (sub: TeacherSubmission) => {
    if (!sub.id) return;
    setEditingSubmissionId(sub.id);
    setTeacherName(sub.teacherName || '');
    setTeacherId(sub.teacherId || '');
    setSecretPin(sub.secretPin || '');
    setSubmissionDate(sub.submissionDate || new Date().toISOString().split('T')[0]);
    setSchoolYear(sub.schoolYear || 'תשפ"ז (2026-2027)');
    if (sub.rows && sub.rows.length > 0) {
      setRows(sub.rows.map((r, i) => ({ ...EMPTY_ROW, ...r, rowNum: i + 1 })));
    }
    if (sub.teacherSignature) {
      setTeacherSignature(sub.teacherSignature);
      if (sub.teacherSignature.startsWith('data:image')) {
        setSignatureMode('draw');
        setHasDrawnSignature(true);
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const img = new Image();
              img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
              };
              img.src = sub.teacherSignature!;
            }
          }
        }, 100);
      } else {
        setSignatureMode('text');
      }
    }
    setIsLookupOpen(false);
    setActiveTab('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEditing = () => {
    setEditingSubmissionId(null);
    setTeacherName('');
    setTeacherId('');
    setSecretPin('');
    setTeacherSignature('');
    setRows([{ rowNum: 1, ...EMPTY_ROW }]);
    clearCanvas();
  };

  const handleSearchExistingSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = lookupIdInput.trim();
    const cleanPin = lookupPinInput.trim();

    if (!cleanId) {
      setLookupMessage('נא להזין מספר תעודת זהות');
      return;
    }

    if (!cleanPin) {
      setLookupMessage('נא להזין את הקוד האישי הסודי (4 ספרות) שקבעת בעת ההגשה');
      return;
    }

    if (cleanPin.length !== 4) {
      setLookupMessage('הקוד האישי הסודי חייב להכיל 4 ספרות בדיוק');
      return;
    }

    setLookupLoading(true);
    setLookupMessage(null);
    setPinError(null);
    setLookupResults(null);

    try {
      const results = await findSubmissionsByTeacherId(cleanId);
      if (results.length === 0) {
        setLookupMessage('לא נמצאו טפסים שהוגשו עבור מספר תעודת זהות זו במערכת.');
      } else {
        // Validate PIN security against the existing submission
        const sub = results[0];
        if (sub.secretPin && sub.secretPin !== cleanPin) {
          setPinError('❌ קוד אישי שגוי! למען אבטחת המידע ומניעת שינויים זרים, הגישה לטופס נחסמה. אם שכחת את הקוד האישי שלך, פנה למרכז השכר עמאר פאעור.');
          setLookupResults(null);
          return;
        }
        setLookupResults(results);
      }
    } catch (err) {
      console.error('Lookup error:', err);
      setLookupMessage('אירעה שגיאה באיתור הטופס. אנא נסה שנית.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Build current submission object
  const currentSubmission: TeacherSubmission = {
    id: editingSubmissionId || undefined,
    teacherName: teacherName.trim(),
    teacherId: teacherId.trim(),
    secretPin: secretPin.trim() || undefined,
    submissionDate,
    schoolYear,
    rows,
    teacherSignature: teacherSignature.trim() || teacherName.trim(),
    status: 'submitted',
    createdBy: '',
    createdAt: new Date().toISOString(),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!teacherName.trim()) {
      setErrorMsg('יש להזין שם מלא (שם פרטי ושם משפחה)');
      return;
    }

    if (!teacherId.trim() || !validateIsraeliId(teacherId)) {
      setErrorMsg('נא להזין מספר תעודת זהות ישראלית תקין (7 עד 9 ספרות)');
      return;
    }

    if (!secretPin.trim() || secretPin.trim().length !== 4) {
      setErrorMsg('חובה לקבוע קוד אישי סודי בן 4 ספרות בדיוק (למשל: 4821) כדי להבטיח שרק אתה תוכל לערוך את הטופס בעתיד');
      return;
    }

    if (!submissionDate) {
      setErrorMsg('יש לבחור תאריך מלוח השנה');
      return;
    }

    if (!hasAtLeastOneRow) {
      setErrorMsg('יש למלא לפחות שורת שאלון אחת בטבלה');
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionPayload: Omit<TeacherSubmission, 'id'> = {
        teacherName: teacherName.trim(),
        teacherId: teacherId.trim(),
        secretPin: secretPin.trim(),
        submissionDate,
        schoolYear,
        rows,
        teacherSignature: teacherSignature.trim() || teacherName.trim(),
        status: 'submitted',
        createdBy: '',
        createdAt: new Date().toISOString(),
      };

      if (editingSubmissionId) {
        // Update the existing submission document directly without creating duplicates
        await updateSubmission(editingSubmissionId, submissionPayload);
        setSubmittedData({ ...submissionPayload, id: editingSubmissionId });
      } else {
        const docId = await createSubmission(submissionPayload);
        setSubmittedData({ ...submissionPayload, id: docId });
      }
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setErrorMsg(
        'אירעה שגיאה בעת שמירת הטופס. אנא ודא/י חיבור לאינטרנט ונסה/י שנית.'
      );
    } finally {
      setIsSubmitting(false);
    }
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
      console.error('Error exporting docx:', e);
      alert('אירעה שגיאה ביצירת קובץ Word');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // SUCCESS VIEW
  if (submittedData) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in print:p-0 print:m-0 print:max-w-full">
        <div className="no-print bg-white rounded-2xl shadow-xl border border-emerald-100 p-6 md:p-10 text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            הטופס נשלח ונשמר בהצלחה במערכת!
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-xl mx-auto mb-6">
            שלום <strong>{submittedData.teacherName}</strong>, פרטיך ושאלוני הבגרות שמילאת נשמרו בצורה מאובטחת בענן בבית הספר מקיף א' ע"ש קאסם גאנם מגאר עבור הגשה לעירייה.
          </p>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 max-w-md mx-auto text-sm text-emerald-900 mb-8 text-right">
            <div className="flex justify-between py-1 border-b border-emerald-200">
              <span className="text-emerald-700">שם מורה:</span>
              <span className="font-bold">{submittedData.teacherName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-200">
              <span className="text-emerald-700">תעודת זהות:</span>
              <span className="font-mono font-bold">{submittedData.teacherId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-200">
              <span className="text-emerald-700">תאריך הגשה:</span>
              <span>{submittedData.submissionDate}</span>
            </div>
            {submittedData.secretPin && (
              <div className="flex justify-between items-center py-2 border-b border-emerald-200 bg-amber-50/80 -mx-4 px-4 rounded-lg my-1">
                <span className="text-amber-900 font-bold flex items-center gap-1.5 text-xs">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>קוד אישי סודי להגנה ועריכה:</span>
                </span>
                <span className="font-mono font-black text-base text-amber-950 bg-white border border-amber-300 px-3 py-0.5 rounded-md shadow-2xs">
                  {submittedData.secretPin}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-emerald-700">מספר אסמכתא:</span>
              <span className="font-mono text-xs text-emerald-800">{submittedData.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => {
                setEditingSubmissionId(submittedData.id || null);
                setSubmittedData(null);
                setActiveTab('edit');
              }}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Edit3 className="w-5 h-5" />
              נפלה טעות? חזור לעריכה ותיקון שאלונים
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white font-medium rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              הדפס / שמור כ-PDF
            </button>
            <button
              onClick={() => handleDownloadWord(submittedData)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-5 h-5" />
              הורד עותק Word (.docx)
            </button>
            <button
              onClick={() => {
                setSubmittedData(null);
                handleCancelEditing();
              }}
              className="px-5 py-3 border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium rounded-xl transition cursor-pointer"
            >
              מילוי טופס חדש
            </button>
          </div>
        </div>

        <div className="print:m-0 print:p-0">
          <div className="no-print border-t border-gray-200 pt-6 mb-4 text-center">
            <h3 className="text-sm font-bold text-gray-700">תצוגת הטופס הרשמי שנשלח:</h3>
          </div>
          <OfficialDocumentView submission={submittedData} isPrintPreview />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 print:p-0 print:m-0 print:max-w-full">
      {/* Top Banner - NO PRINT */}
      <div className="no-print bg-gradient-to-l from-sky-800 to-sky-950 text-white rounded-2xl p-6 md:p-8 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 bg-sky-700/60 px-3 py-1 rounded-full text-xs font-medium text-sky-200 mb-3">
              <Sparkles className="w-4 h-4 text-amber-300" />
              טופס רשמי לשנה"ל {schoolYear} | מקיף א' ע"ש קאסם גאנם מגאר
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              הודעה על זכאות לגמול הכנה לבגרות
            </h1>
            <p className="text-sky-200 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
              מורה יקר/ה, אנא מלא/י את הפרטים והשאלונים אליהם ניגשים תלמידיך בשנה"ל הנוכחית לפי הטבלה המדויקת. הנתונים יישמרו בצורה מאובטחת ויועברו לבדיקה ואישור מורשה שכר בעירייה.
            </p>
          </div>

          {/* Quick tab switcher */}
          <div className="flex bg-sky-900/80 p-1.5 rounded-xl border border-sky-700/60 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'edit'
                  ? 'bg-white text-sky-900 shadow-md'
                  : 'text-sky-200 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              מילוי הטופס
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'preview'
                  ? 'bg-white text-sky-900 shadow-md'
                  : 'text-sky-200 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              תצוגה מקדימה רשמית
            </button>
          </div>
        </div>
      </div>

      {/* Lookup / Edit existing submission section - DIRECTLY VISIBLE FOR TEACHERS */}
      <div id="teacher-lookup-section" className="no-print mb-8 scroll-mt-20">
        {editingSubmissionId ? (
          <div className="bg-gradient-to-l from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl p-5 md:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 bg-amber-200 text-amber-900 rounded-2xl flex items-center justify-center shrink-0 shadow-xs">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-300/80 text-amber-950 text-xs font-black mb-1.5 shadow-2xs">
                  ✏️ מצב עריכה ותיקון פעיל
                </div>
                <h4 className="text-base md:text-lg font-black text-amber-950">
                  הנך עורך כעת את הטופס הקיים של: {teacherName || 'מורה'} (ת.ז. {teacherId})
                </h4>
                <p className="text-xs md:text-sm text-amber-900 mt-1 leading-relaxed">
                  באפשרותך לתקן סמל שאלון, מקצוע, כמות תלמידים או אחוזי גמול. בעת לחיצה על "שמירה והגשה", הטופס הקיים בענן יתעדכן ישירות ללא יצירת כפילויות.
                </p>
                <div className="text-[11px] font-mono text-amber-800 mt-1">
                  אסמכתא: {editingSubmissionId}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCancelEditing}
              className="px-5 py-2.5 bg-white hover:bg-amber-100 border-2 border-amber-300 text-amber-950 rounded-xl text-xs md:text-sm font-bold transition flex items-center gap-2 cursor-pointer shadow-xs shrink-0 self-stretch md:self-auto justify-center"
            >
              <RotateCcw className="w-4 h-4 text-amber-800" />
              ביטול עריכה ומילוי טופס חדש
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-sky-400 shadow-md overflow-hidden">
            {/* Header banner of lookup card */}
            <div className="bg-gradient-to-l from-sky-100 via-sky-50 to-blue-50 px-5 py-4 border-b border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Lock className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm md:text-base font-black text-sky-950">
                      הגשת כבר טופס וברצונך לתקן טעות (סמל שאלון, שעות או מקצוע)?
                    </span>
                    <span className="bg-amber-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      איתור מוגן בקוד סודי
                    </span>
                  </div>
                  <p className="text-xs text-sky-800 mt-0.5 font-medium">
                    הזן את מספר תעודת הזהות שלך ואת הקוד האישי (4 ספרות) שקבעת בעת ההגשה לאימות וטעינת הטופס:
                  </p>
                </div>
              </div>
            </div>

            {/* Direct inputs: ID + Secret PIN */}
            <div className="p-5 md:p-6 bg-white">
              <form onSubmit={handleSearchExistingSubmission} className="flex flex-col sm:flex-row items-center gap-3">
                {/* ID input */}
                <div className="relative flex-1 w-full">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    מספר תעודת זהות (7-9 ספרות)
                  </label>
                  <input
                    id="teacher-lookup-input"
                    type="text"
                    maxLength={9}
                    value={lookupIdInput}
                    onChange={(e) => setLookupIdInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="הקלד כאן ת.ז. ישראלית..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-200 text-sm font-mono tracking-wider bg-gray-50/50 focus:bg-white text-gray-900 placeholder:text-gray-400 font-bold transition"
                  />
                  {lookupIdInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setLookupIdInput('');
                        setLookupResults(null);
                        setLookupMessage(null);
                        setPinError(null);
                      }}
                      className="absolute left-3 top-8 text-gray-400 hover:text-gray-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Secret PIN input */}
                <div className="relative w-full sm:w-56">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3 text-amber-600" />
                    <span>קוד אישי סודי (4 ספרות)</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={lookupPinInput}
                    onChange={(e) => setLookupPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="4 ספרות..."
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-mono tracking-widest bg-amber-50/30 focus:bg-white text-gray-900 placeholder:text-gray-400 font-bold transition text-center"
                  />
                </div>

                <div className="w-full sm:w-auto pt-5">
                  <button
                    type="submit"
                    disabled={lookupLoading || !lookupIdInput.trim() || lookupPinInput.trim().length !== 4}
                    className="w-full sm:w-auto px-6 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md hover:shadow-lg shrink-0"
                  >
                    {lookupLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    אימות ואיתור טופס
                  </button>
                </div>
              </form>

              {/* Error messages */}
              {lookupMessage && (
                <div className="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs md:text-sm text-amber-900 font-semibold flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{lookupMessage}</span>
                </div>
              )}

              {pinError && (
                <div className="mt-4 p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs md:text-sm text-rose-900 font-bold flex items-center gap-3 animate-shake">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Results display */}
              {lookupResults && lookupResults.length > 0 && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-100 animate-fade-in">
                  <div className="text-xs md:text-sm font-bold text-gray-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-800 font-black">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>זהות אומתה בהצלחה! נמצא טופס עבור ת.ז. {lookupIdInput}:</span>
                    </span>
                    <span className="text-[11px] text-gray-500 font-normal">לחץ על הכפתור כדי לערוך</span>
                  </div>
                  {lookupResults.map((res) => {
                    const isApproved = res.principalApproved || res.status === 'approved';

                    return (
                      <div
                        key={res.id}
                        className="p-4 rounded-xl border-2 border-sky-100 hover:border-sky-400 bg-sky-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-xs"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-gray-900 text-sm md:text-base">
                              {res.teacherName}
                            </span>
                            <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-mono font-bold">
                              ת.ז. {res.teacherId}
                            </span>
                            <span className="text-xs text-gray-500">
                              תאריך הגשה: <strong>{res.submissionDate}</strong>
                            </span>
                            <span className="text-xs text-gray-500">
                              שנה"ל: {res.schoolYear}
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-800">שאלונים שדווחו בטופס זה:</span>
                            {res.rows && res.rows.length > 0 ? (
                              res.rows
                                .filter((r) => r.questionnaireCode || r.subject)
                                .map((r, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-white border border-gray-300 px-2.5 py-0.5 rounded text-[11px] text-sky-900 font-mono font-bold shadow-2xs"
                                  >
                                    {r.subject || 'שאלון'} (סמל: {r.questionnaireCode || 'ללא'})
                                  </span>
                                ))
                            ) : (
                              <span className="text-gray-400">אין שורות שדווחו</span>
                            )}
                          </div>
                        </div>

                        {isApproved ? (
                          <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-bold flex items-center gap-2">
                            <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>הטופס נבדק ואושר סופית ע"י ההנהלה ונעול לעריכה</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleLoadSubmissionForEditing(res)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md hover:shadow-lg shrink-0"
                          >
                            <Edit3 className="w-4 h-4" />
                            טען וערוך טופס זה
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'preview' ? (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-200 print:p-0 print:border-none print:shadow-none print:bg-transparent print:m-0">
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                תצוגה מקדימה של הטופס הרשמי (אחד לאחד לטופס המקורי)
              </h3>
              <p className="text-xs md:text-sm text-gray-500">
                הטופס מוצג בדיוק בפורמט הרשמי להגשה לעירייה. ניתן להדפיס או להוריד עותק לגיבוי אישי.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                הדפס / שמור כ-PDF לגיבוי
              </button>
              <button
                type="button"
                onClick={() => handleDownloadWord(currentSubmission)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                הורד קובץ Word (.docx)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs md:text-sm font-semibold transition cursor-pointer"
              >
                חזור למילוי הטופס
              </button>
            </div>
          </div>
          <OfficialDocumentView submission={currentSubmission} isPrintPreview />
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-8 no-print">
          {errorMsg && (
            <div className="bg-rose-50 border-r-4 border-rose-500 p-4 rounded-xl flex items-center gap-3 text-rose-800 animate-shake">
              <AlertCircle className="w-6 h-6 shrink-0 text-rose-600" />
              <div className="text-sm font-semibold">{errorMsg}</div>
            </div>
          )}

          {/* Teacher Details Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3">
              <User className="w-5 h-5 text-sky-600" />
              פרטי המורה והגשה
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {/* Teacher Name */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-800 mb-1.5">
                  שם המורה (שם מלא) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="שם פרטי ושם משפחה"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs md:text-sm font-semibold transition"
                  />
                </div>
              </div>

              {/* Teacher ID */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-800 mb-1.5">
                  תעודת זהות (7-9 ספרות) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={9}
                    value={teacherId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setTeacherId(val);
                    }}
                    placeholder="מספר ת.ז. ישראלית"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs md:text-sm font-mono tracking-wider transition ${
                      teacherId && !validateIsraeliId(teacherId)
                        ? 'border-rose-400 bg-rose-50/30 focus:ring-rose-400'
                        : 'border-gray-300 focus:ring-2 focus:ring-sky-500'
                    }`}
                  />
                  {teacherId && validateIsraeliId(teacherId) && (
                    <span className="absolute left-2.5 top-3 text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      תקין
                    </span>
                  )}
                </div>
                {teacherId && !validateIsraeliId(teacherId) && (
                  <p className="text-rose-600 text-[11px] mt-1">
                    ספרת ביקורת אינה תקינה לפי ת.ז. ישראלית
                  </p>
                )}
              </div>

              {/* Secret PIN - Personal Protection */}
              <div className="bg-amber-50/60 border-2 border-amber-300 rounded-xl p-3">
                <label className="block text-xs md:text-sm font-bold text-amber-950 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-700" />
                    <span>קוד אישי סודי (4 ספרות)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={secretPin}
                    onChange={(e) => setSecretPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="4 ספרות..."
                    className="w-full px-3.5 py-2 rounded-lg border-2 border-amber-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-200 text-sm font-mono tracking-widest text-center bg-white font-bold text-gray-900 transition"
                  />
                  {secretPin.length === 4 && (
                    <span className="absolute left-2.5 top-2.5 text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-amber-900 mt-1 leading-snug">
                  קוד זה מונע מזרים לערוך את הטופס, ויאפשר רק לך לעדכן בעתיד.
                </p>
              </div>

              {/* Date from Calendar */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-800 mb-1.5">
                  תאריך (בחירה מלוח שנה) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={submissionDate}
                    onChange={(e) => setSubmissionDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs md:text-sm font-medium transition"
                  />
                </div>
              </div>

              {/* School Year Selector (Current & Future Years) */}
              <div>
                <label className="block text-xs md:text-sm font-bold text-gray-800 mb-1.5">
                  שנת לימודים <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-xs md:text-sm font-bold text-gray-900 bg-white transition cursor-pointer"
                  >
                    {SCHOOL_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* School Info Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-[11px] md:text-xs text-gray-500">
              <div>
                עיריית מעאר | בית ספר מקיף א' ע"ש קאסם גאנם | סמל מוסד: <strong>800136</strong>
              </div>
              <div className="text-sky-700 font-medium">
                הטופס נשמר ישירות בענן ומוכן לחתימת מורשה שכר בעירייה
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b pb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-600" />
                  להלן סמלי שאלוני הבגרות שהתלמידים ניגשים אליהן בשנה"ל הנוכחית
                </h2>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  מלא/י את שאלוני הבגרות הרלוונטיים עבורך (ניתן להוסיף שורות נוספות לפי הצורך):
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                  <Info className="w-4 h-4 text-sky-600 shrink-0" />
                  ניתן לבחור מקצוע או להקליד חופשי
                </span>
              </div>
            </div>

            {/* Responsive Table Form */}
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full min-w-[950px] border-collapse text-right text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-800 border-y border-gray-300">
                    <th rowSpan={2} className="p-2 border border-gray-300 text-center w-8">
                      #
                    </th>
                    <th rowSpan={2} className="p-2 border border-gray-300 min-w-[130px]">
                      מקצוע
                    </th>
                    <th rowSpan={2} className="p-2 border border-gray-300 min-w-[95px]">
                      כיתה/קבוצה
                    </th>
                    <th rowSpan={2} className="p-2 border border-gray-300 min-w-[65px] text-center">
                      מס' תלמידים
                    </th>
                    <th rowSpan={2} className="p-2 border border-gray-300 min-w-[90px] text-center">
                      סמל שאלון
                    </th>
                    {/* Super header */}
                    <th colSpan={3} className="p-1 border border-gray-300 text-center bg-sky-50 font-bold text-sky-950">
                      גמולי הכנה לבגרות
                    </th>
                    <th rowSpan={2} className="p-2 border border-gray-300 min-w-[85px] text-center">
                      מספר יח"ל
                    </th>
                    <th rowSpan={2} className="p-2 border border-gray-300 min-w-[65px] text-center">
                      מתוך
                    </th>
                    <th rowSpan={2} className="p-2 border border-gray-300 min-w-[85px] text-center bg-amber-50/80 font-bold text-amber-950">
                      זכאי לגמול %
                    </th>
                    <th rowSpan={2} className="p-2 border border-gray-300 text-center w-10">
                      פעולות
                    </th>
                  </tr>
                  <tr className="bg-sky-50/70 border-b border-gray-300 text-[11px]">
                    <th className="p-1 border border-gray-300 text-center">
                      בחינה חיצונית 70%
                    </th>
                    <th className="p-1 border border-gray-300 text-center">
                      בחינה בית ספרית 30%
                    </th>
                    <th className="p-1 border border-gray-300 text-center">
                      פרויקט
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.rowNum}
                      className={`border-b border-gray-200 transition ${
                        row.subject || row.questionnaireCode
                          ? 'bg-sky-50/30'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Row index */}
                      <td className="p-1.5 border border-gray-200 text-center font-bold text-gray-700 bg-gray-50">
                        .{row.rowNum}
                      </td>

                      {/* Subject */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="text"
                          list={`subjects-list-${row.rowNum}`}
                          value={row.subject}
                          onChange={(e) =>
                            handleRowChange(idx, 'subject', e.target.value)
                          }
                          placeholder="בחר או הקלד מקצוע"
                          className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white"
                        />
                        <datalist id={`subjects-list-${row.rowNum}`}>
                          {COMMON_SUBJECTS.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </td>

                      {/* Class / Group */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="text"
                          value={row.gradeGroup}
                          onChange={(e) =>
                            handleRowChange(idx, 'gradeGroup', e.target.value)
                          }
                          placeholder={'י"ב 1 / 5 יח'}
                          className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-sky-500 text-center bg-white"
                        />
                      </td>

                      {/* Students count */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="number"
                          min="0"
                          value={row.studentsCount}
                          onChange={(e) =>
                            handleRowChange(idx, 'studentsCount', e.target.value)
                          }
                          placeholder="25"
                          className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs focus:ring-1 focus:ring-sky-500 text-center bg-white"
                        />
                      </td>

                      {/* Questionnaire Code */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="text"
                          value={row.questionnaireCode}
                          onChange={(e) =>
                            handleRowChange(idx, 'questionnaireCode', e.target.value)
                          }
                          placeholder="035581"
                          className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs font-mono text-center focus:ring-1 focus:ring-sky-500 bg-white"
                        />
                      </td>

                      {/* External Exam 70% Bonus */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="text"
                          value={row.externalExamBonus}
                          onChange={(e) =>
                            handleRowChange(idx, 'externalExamBonus', e.target.value)
                          }
                          placeholder="%"
                          className="w-full px-1.5 py-1.5 rounded border border-gray-300 text-xs text-center focus:ring-1 focus:ring-sky-500 bg-white"
                        />
                      </td>

                      {/* School Exam 30% Bonus */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="text"
                          value={row.schoolExamBonus}
                          onChange={(e) =>
                            handleRowChange(idx, 'schoolExamBonus', e.target.value)
                          }
                          placeholder="%"
                          className="w-full px-1.5 py-1.5 rounded border border-gray-300 text-xs text-center focus:ring-1 focus:ring-sky-500 bg-white"
                        />
                      </td>

                      {/* Project Bonus */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="text"
                          value={row.projectBonus}
                          onChange={(e) =>
                            handleRowChange(idx, 'projectBonus', e.target.value)
                          }
                          placeholder="%"
                          className="w-full px-1.5 py-1.5 rounded border border-gray-300 text-xs text-center focus:ring-1 focus:ring-sky-500 bg-white"
                        />
                      </td>

                      {/* Units count */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="text"
                          value={row.unitsCount}
                          onChange={(e) =>
                            handleRowChange(idx, 'unitsCount', e.target.value)
                          }
                          placeholder="3"
                          className="w-full px-1.5 py-1.5 rounded border border-gray-300 text-xs text-center focus:ring-1 focus:ring-sky-500 bg-white"
                        />
                      </td>

                      {/* Out of units */}
                      <td className="p-1 border border-gray-200">
                        <input
                          type="text"
                          value={row.outOfUnits}
                          onChange={(e) =>
                            handleRowChange(idx, 'outOfUnits', e.target.value)
                          }
                          placeholder="5"
                          className="w-full px-1.5 py-1.5 rounded border border-gray-300 text-xs text-center focus:ring-1 focus:ring-sky-500 bg-white"
                        />
                      </td>

                      {/* Eligible Bonus % */}
                      <td className="p-1 border border-gray-200 bg-amber-50/50">
                        <input
                          type="text"
                          value={row.eligibleBonusPercent}
                          onChange={(e) =>
                            handleRowChange(idx, 'eligibleBonusPercent', e.target.value)
                          }
                          placeholder="%"
                          className="w-full px-1.5 py-1.5 rounded border border-amber-300 text-xs text-center font-bold text-gray-900 focus:ring-1 focus:ring-amber-500 bg-white"
                        />
                      </td>

                      {/* Delete / remove row action */}
                      <td className="p-1 border border-gray-200 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          title={rows.length > 1 ? "מחק שורה זו" : "רוקן שורה"}
                          className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-sky-50 font-bold text-gray-900 border-t-2 border-sky-300">
                    <td colSpan={3} className="p-2 border border-gray-300 text-center text-xs text-sky-950 font-extrabold">
                      סה"כ כללי לטופס:
                    </td>
                    <td className="p-2 border border-gray-300 text-center text-xs font-mono font-bold text-sky-900">
                      {totalStudentsCount > 0 ? totalStudentsCount : '-'}
                    </td>
                    <td colSpan={6} className="p-2 border border-gray-300 text-left pl-2 text-xs text-gray-600 font-semibold">
                      סה"כ אחוז גמול מחושב לשכר:
                    </td>
                    <td className="p-2 border border-gray-300 text-center text-xs font-extrabold text-amber-950 bg-amber-100/80 font-mono">
                      {totalBonusPercent > 0 ? `${parseFloat(totalBonusPercent.toFixed(2))}%` : '-'}
                    </td>
                    <td className="p-2 border border-gray-300 bg-gray-50"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Add row (+) button */}
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-sky-50/60 p-3.5 rounded-xl border border-sky-200">
              <button
                type="button"
                onClick={handleAddRow}
                className="w-full sm:w-auto px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white stroke-[3]" />
                הוסף מקצוע / שאלון נוסף (+)
              </button>

              <div className="text-xs text-sky-900 font-semibold">
                ניתן להוסיף שורות נוספות לפי הצורך
              </div>
            </div>
          </div>

          {/* Teacher Signature & Confirmation Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 border-b pb-3">
              <PenTool className="w-5 h-5 text-sky-600" />
              חתימת המורה והצהרה
            </h2>

            <p className="text-xs md:text-sm text-gray-600 mb-6">
              בהגשת טופס זה, הנני מצהיר/ה כי כל הפרטים, סמלי השאלונים ונתוני הגמול שמולאו לעיל נכונים ומדויקים.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Signature Input Mode */}
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <label className="text-xs font-bold text-gray-700">סוג חתימה:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('text')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                        signatureMode === 'text'
                          ? 'bg-sky-700 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      חתימה בהקלדת שם
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`px-3 py-1 text-xs rounded-lg font-semibold transition cursor-pointer ${
                        signatureMode === 'draw'
                          ? 'bg-sky-700 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      חתימה בכתב יד (ציור)
                    </button>
                  </div>
                </div>

                {signatureMode === 'draw' ? (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-sky-600" />
                        חתום/י באצבע על מסך המגע או עם העכבר:
                      </span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        נקה חתימה
                      </button>
                    </div>

                    <div className="relative rounded-xl border-2 border-dashed border-sky-300 bg-white p-1 shadow-inner overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={460}
                        height={140}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          const touch = e.touches[0];
                          if (touch) {
                            const canvas = canvasRef.current;
                            if (!canvas) return;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            isDrawingRef.current = true;
                            setIsDrawing(true);
                            const { x, y } = getCoordinates(touch.clientX, touch.clientY);
                            ctx.beginPath();
                            ctx.moveTo(x, y);
                            ctx.lineWidth = 2.5;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.strokeStyle = '#0284c7';
                          }
                        }}
                        onTouchMove={(e) => {
                          if (!isDrawingRef.current) return;
                          e.preventDefault();
                          const touch = e.touches[0];
                          if (touch) {
                            const canvas = canvasRef.current;
                            if (!canvas) return;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) return;
                            const { x, y } = getCoordinates(touch.clientX, touch.clientY);
                            ctx.lineTo(x, y);
                            ctx.stroke();
                            setHasDrawnSignature(true);
                          }
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          handlePointerUp();
                        }}
                        style={{ touchAction: 'none' }}
                        className="w-full h-32 md:h-36 bg-sky-50/20 touch-none cursor-crosshair rounded-lg block"
                      />
                      {!hasDrawnSignature && !teacherSignature.startsWith('data:image/') && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-400 text-xs font-medium">
                          ✍️ כאן חותמים באצבע / עכבר
                        </div>
                      )}
                    </div>

                    {/* Signature Preview & Name confirmation */}
                    {teacherSignature && teacherSignature.startsWith('data:image/') && (
                      <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-emerald-900">חתימתך נקלטה:</span>
                          <img
                            src={teacherSignature}
                            alt="תצוגת חתימה"
                            className="h-8 max-w-[120px] object-contain bg-white border border-gray-200 rounded px-1.5"
                          />
                        </div>
                        <span className="font-bold text-emerald-800">
                          {teacherName ? `עבור: ${teacherName}` : 'חתימה מוכנה'}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      חתימת המורה (שם מלא):
                    </label>
                    <input
                      type="text"
                      value={teacherSignature || teacherName}
                      onChange={(e) => setTeacherSignature(e.target.value)}
                      placeholder="הקלד את שמך המלא לחתימה"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-serif text-base focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                )}
              </div>

              {/* Summary box */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs text-gray-700 space-y-2">
                <div className="font-bold text-gray-900 text-sm mb-2">סיכום לפני שליחה:</div>
                <div className="flex justify-between">
                  <span>מורה:</span>
                  <span className="font-bold">{teacherName || 'טרם הוזן'}</span>
                </div>
                <div className="flex justify-between">
                  <span>תעודת זהות:</span>
                  <span className="font-mono font-bold">{teacherId || 'טרם הוזן'}</span>
                </div>
                <div className="flex justify-between">
                  <span>תאריך:</span>
                  <span>{submissionDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>חתימת המורה:</span>
                  {teacherSignature && teacherSignature.startsWith('data:image/') ? (
                    <div className="flex items-center gap-1.5 font-bold text-sky-800">
                      <img
                        src={teacherSignature}
                        alt="חתימה"
                        className="h-6 max-w-[90px] object-contain bg-white border border-gray-200 rounded px-1"
                      />
                      <span>({teacherName || 'שם מורה'})</span>
                    </div>
                  ) : (
                    <span className="font-bold text-sky-800">
                      {teacherSignature || teacherName || 'טרם נחתם'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>שאלוני בגרות שנרשמו:</span>
                  <span className="font-bold text-sky-800">
                    {rows.filter((r) => r.subject.trim() || r.questionnaireCode.trim()).length} שאלונים
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>סה"כ תלמידים:</span>
                  <span className="font-bold text-gray-900">
                    {totalStudentsCount > 0 ? `${totalStudentsCount} תלמידים` : '-'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sky-900">
                  <span>סה"כ אחוז גמול מחושב לעירייה ולשכר:</span>
                  <span className="text-sm bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-lg font-mono font-bold">
                    {totalBonusPercent > 0 ? `${parseFloat(totalBonusPercent.toFixed(2))}%` : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="w-full sm:w-auto px-5 py-3 border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs text-xs md:text-sm"
              >
                <Eye className="w-4 h-4 text-sky-700" />
                תצוגה מקדימה של המסמך הרשמי
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto px-5 py-3 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs text-xs md:text-sm"
              >
                <Printer className="w-4 h-4 text-sky-700" />
                הדפס לגיבוי אצלך
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-10 py-4 ${
                editingSubmissionId
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } disabled:bg-gray-400 text-white font-extrabold text-base rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-98 flex items-center justify-center gap-3 cursor-pointer`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {editingSubmissionId ? 'מעדכן שינויים בענן...' : 'שומר בענן ושולח...'}
                </>
              ) : (
                <>
                  {editingSubmissionId ? <Save className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  {editingSubmissionId ? 'שמור ועדכן שינויים בטופס' : 'שלח טופס למערכת בית הספר'}
                </>
              )}
            </button>
          </div>

          {/* Under form security & copyright note */}
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>הטופס מאובטח ונשמר ישירות בשרת המוסדי של תיכון מקיף א' מע'אר</span>
            </div>
            <div className="font-semibold text-gray-600">
              כל הזכויות שמורות בלעדית לעמאר פאעור © 2026 | All Rights Reserved to Amar Faour
            </div>
          </div>
        </form>
        {/* Printable fallback if teacher triggers print while on edit tab */}
        <div className="hidden print:block">
          <OfficialDocumentView submission={currentSubmission} isPrintPreview />
        </div>
      </>
      )}
    </div>
  );
};
