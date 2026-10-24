import React from 'react';
import { TeacherSubmission, calculateRowEligiblePercent } from '../types';
import { SCHOOL_LOGO_DATA_URL } from '../lib/schoolLogoBase64';

interface OfficialDocumentViewProps {
  submission: TeacherSubmission;
  isPrintPreview?: boolean;
}

export const OfficialDocumentView: React.FC<OfficialDocumentViewProps> = ({
  submission,
  isPrintPreview = false,
}) => {
  // Ensure we display at least 10 rows matching the official document, or all rows if teacher has more
  const rowCount = Math.max(10, submission.rows?.length || 10);
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const rowNum = index + 1;
    return (
      submission.rows?.find((r) => r.rowNum === rowNum) || {
        rowNum,
        subject: '',
        gradeGroup: '',
        studentsCount: '',
        questionnaireCode: '',
        externalExamBonus: '',
        schoolExamBonus: '',
        projectBonus: '',
        unitsCount: '',
        outOfUnits: '',
        eligibleBonusPercent: '',
      }
    );
  });

  // Extract clean Hebrew year for the document title (e.g. תשפ"ז)
  const displayYear = submission.schoolYear
    ? submission.schoolYear.split(' ')[0]
    : 'תשפ"ז';

  const formatPercent = (val?: string) => {
    if (!val || !val.trim()) return '';
    const clean = val.trim();
    return clean.includes('%') ? clean : `${clean}%`;
  };

  return (
    <div
      className={`official-document bg-white text-black leading-tight mx-auto transition-all ${
        isPrintPreview
          ? 'p-0 w-full'
          : 'p-6 md:p-12 max-w-4xl shadow-xl border border-gray-400 rounded-sm my-4'
      } print:p-0 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-full`}
      style={{
        direction: 'rtl',
        fontFamily: "'Assistant', 'David Libre', 'Arial', sans-serif",
      }}
    >
      {/* Top 3-Section Header */}
      <div className="grid grid-cols-3 items-center text-xs md:text-sm border-b-2 border-black pb-3">
        {/* Right - Hebrew School Header */}
        <div className="text-right leading-tight">
          <p className="font-bold text-sm md:text-base text-black">עיריית מעאר</p>
          <p className="font-semibold text-black">מקיף א' ע"ש קאסם גאנם</p>
          <p className="text-gray-800 text-[11px] md:text-xs">בפיקוח משרד החינוך והתרבות</p>
          <p className="text-gray-800 text-[11px] md:text-xs">ת.ד. 873 מג'אר מי. 20128</p>
        </div>

        {/* Center - Authentic Original School Logo and Details */}
        <div className="flex flex-col items-center justify-center text-center">
          <img
            src={SCHOOL_LOGO_DATA_URL}
            alt="סמל בית ספר מקיף א' ע&quot;ש קאסם גאנם"
            className="w-28 md:w-36 h-auto object-contain mx-auto"
          />
        </div>

        {/* Left - Arabic School Header */}
        <div className="text-left leading-tight" dir="rtl">
          <p className="font-bold text-sm md:text-base text-black">بلدية المغار</p>
          <p className="font-semibold text-black">الشاملة أ على اسم قاسم غانم</p>
          <p className="text-gray-800 text-[11px] md:text-xs">بإشراف وزارة المعارف والثقافة</p>
          <p className="text-gray-800 text-[11px] md:text-xs">ص.ب. 873 المغار - 20128</p>
        </div>
      </div>

      {/* Title Section */}
      <div className="text-center my-4">
        <h1 className="text-base md:text-lg font-bold text-black tracking-tight">
          הודעה על זכאות לגמול הכנה לבגרות לשנה"ל {displayYear}
        </h1>
        <h2 className="text-sm md:text-base font-bold text-black mt-0.5">
          בית ספר מקיף א' ע"ש קאסם גאנם מגאר
        </h2>
      </div>

      {/* Teacher Info Row */}
      <div className="flex flex-wrap items-center justify-between text-xs md:text-sm font-semibold mb-3 px-1 text-black">
        <div className="flex items-center gap-2">
          <span className="font-bold">שם המורה:</span>
          <span className="border-b-2 border-black min-w-[180px] md:min-w-[240px] pb-0.5 px-2 font-bold text-black text-sm">
            {submission.teacherName || ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold">תעודת זהות:</span>
          <span className="border-b-2 border-black min-w-[140px] md:min-w-[180px] pb-0.5 px-2 font-mono font-bold text-black text-sm tracking-widest">
            {submission.teacherId || ''}
          </span>
        </div>
      </div>

      {/* Subheading */}
      <div className="text-right text-xs md:text-sm font-bold text-black underline mb-2 px-1">
        להלן סמלי שאלוני הבגרות שהתלמידים ניגשים אליהן בשנה"ל הנוכחית:
      </div>

      {/* Official Table */}
      <div className="w-full overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border border-black text-center text-[11px] md:text-xs print:text-[10px] text-black print:table-fixed">
          <thead>
            {/* Top Header Row with Grouped Bonus Headers */}
            <tr className="border-b border-black bg-gray-50/80 print:bg-transparent text-black">
              <th rowSpan={2} className="border border-black p-1 w-7 print:w-[4%] font-bold text-center">
                &nbsp;
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[90px] print:min-w-0 print:w-[17%] font-bold">
                מקצוע
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[75px] print:min-w-0 print:w-[11%] font-bold">
                כיתה/קבוצה
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[50px] print:min-w-0 print:w-[8%] font-bold leading-tight">
                מס'
                <br />
                תלמידים
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[70px] print:min-w-0 print:w-[11%] font-bold">
                סמל שאלון
              </th>
              {/* Grouped Header */}
              <th className="border border-black p-1 min-w-[72px] print:min-w-0 print:w-[8%] font-bold leading-tight">
                בחינה חיצונית
                <br />
                70%
              </th>
              <th className="border border-black p-1 min-w-[72px] print:min-w-0 print:w-[8%] font-bold leading-tight">
                בחינה בית
                <br />
                ספרית 30%
              </th>
              <th className="border border-black p-1 min-w-[65px] print:min-w-0 print:w-[7%] font-bold">
                פרויקט
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[80px] print:min-w-0 print:w-[11%] font-bold leading-tight">
                מספר יח"ל של
                <br />
                השאלון/הפרויקט
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[50px] print:min-w-0 print:w-[7%] font-bold">
                מתוך
              </th>
              <th rowSpan={2} className="border border-black p-1 min-w-[65px] print:min-w-0 print:w-[8%] font-bold leading-tight">
                זכאי
                <br />
                לגמול %
              </th>
            </tr>
            {/* Sub-Header Row */}
            <tr className="border-b border-black bg-gray-50/80 print:bg-transparent text-black">
              <th className="border border-black p-0.5 text-[10px] md:text-[11px] print:text-[9px] font-bold">
                גמול ב %
              </th>
              <th className="border border-black p-0.5 text-[10px] md:text-[11px] print:text-[9px] font-bold">
                גמול ב %
              </th>
              <th className="border border-black p-0.5 text-[10px] md:text-[11px] print:text-[9px] font-bold">
                גמול ב %
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rowNum} className="border-b border-black h-7 md:h-8 print:h-[22px] hover:bg-amber-50/20 text-black">
                <td className="border border-black font-bold text-center text-black print:p-0">
                  .{row.rowNum}
                </td>
                <td className="border border-black text-right px-1.5 print:px-1 font-semibold text-black">
                  {row.subject}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-semibold text-black">
                  {row.gradeGroup}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-semibold text-black">
                  {row.studentsCount}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-mono font-bold text-black">
                  {row.questionnaireCode}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-semibold text-black">
                  {formatPercent(row.externalExamBonus)}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-semibold text-black">
                  {formatPercent(row.schoolExamBonus)}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-semibold text-black">
                  {formatPercent(row.projectBonus)}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-semibold text-black">
                  {row.unitsCount}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-semibold text-black">
                  {row.outOfUnits}
                </td>
                <td className="border border-black text-center px-1 print:px-0.5 font-bold text-black">
                  {formatPercent(calculateRowEligiblePercent(row) || row.eligibleBonusPercent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Official Footers & Signature Lines */}
      <div className="mt-6 print:mt-3 space-y-4 print:space-y-2 text-xs md:text-sm print:text-[11px] text-black">
        {/* Teacher Signature & Date */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">חתימת המורה:</span>
            <div className="border-b-2 border-black min-w-[200px] md:min-w-[280px] print:min-w-[170px] min-h-[38px] print:min-h-[32px] px-2 flex items-center">
              {submission.teacherSignature && submission.teacherSignature.startsWith('data:image/') ? (
                <div className="flex items-center gap-2 py-0.5">
                  <img
                    src={submission.teacherSignature}
                    alt={`חתימת ${submission.teacherName}`}
                    className="h-9 md:h-11 print:h-8 max-w-[170px] object-contain"
                  />
                  <span className="font-bold text-xs md:text-sm print:text-[11px] text-black">
                    ({submission.teacherName})
                  </span>
                </div>
              ) : (
                <span className="font-serif text-sm print:text-xs font-bold text-black">
                  {submission.teacherSignature
                    ? (submission.teacherSignature.includes('חתימה גרפית') || submission.teacherSignature.includes('דיגיטלית')
                        ? `${submission.teacherName} (חתימה מאושרת)`
                        : submission.teacherSignature)
                    : (submission.teacherName || '________________________')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">תאריך:</span>
            <span className="border-b-2 border-black min-w-[120px] md:min-w-[170px] print:min-w-[100px] pb-0.5 px-2 font-mono font-bold text-black print:text-xs">
              {submission.submissionDate || '________________'}
            </span>
          </div>
        </div>

        {/* Municipality Payroll Department Approval & Date */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 pt-1 print:pt-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold">אישור מחלקת שכר:</span>
            <span className="font-medium">הריני לאשר את נכונות הנתונים וזכאות הגמול .</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">חתימת מורשה שכר:</span>
            <span className="border-b-2 border-black min-w-[130px] md:min-w-[180px] print:min-w-[130px] pb-0.5 px-2 font-serif font-bold text-black print:text-xs">
              {submission.principalSignature || '________________________'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold">תאריך:</span>
            <span className="border-b-2 border-black min-w-[100px] md:min-w-[140px] print:min-w-[90px] pb-0.5 px-2 font-mono font-bold text-black print:text-xs">
              {submission.principalApprovalDate || '________________'}
            </span>
          </div>
        </div>

        {/* Bonus Approval Note */}
        <div className="flex items-center gap-2 pt-1 print:pt-0.5 font-bold">
          <span>לשימוש המאשר :</span>
          <span>זכאי לגמול של :</span>
          <span className="border-b-2 border-black min-w-[160px] md:min-w-[220px] print:min-w-[160px] pb-0.5 px-3 text-center text-sm md:text-base print:text-xs font-extrabold text-black">
            {submission.approvedBonusPercent ? `${submission.approvedBonusPercent}` : '____________________'}
          </span>
          <span>אחוזים</span>
        </div>
      </div>
    </div>
  );
};
