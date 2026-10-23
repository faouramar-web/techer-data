export interface FormRow {
  rowNum: number;
  subject: string;               // מקצוע
  gradeGroup: string;            // כיתה/קבוצה
  studentsCount: string;         // מס' תלמידים
  questionnaireCode: string;     // סמל שאלון
  externalExamBonus: string;     // בחינה חיצונית 70% - גמול ב %
  schoolExamBonus: string;       // בחינה בית ספרית 30% - גמול ב %
  projectBonus: string;          // פרויקט - גמול ב %
  unitsCount: string;            // מספר יח"ל של השאלון/הפרויקט
  outOfUnits: string;            // מתוך
  eligibleBonusPercent: string;  // זכאי לגמול %
}

export interface TeacherSubmission {
  id?: string;
  teacherName: string;
  teacherId: string;
  submissionDate: string;
  schoolYear: string;
  rows: FormRow[];
  teacherSignature?: string;
  status: 'submitted' | 'approved' | 'rejected';
  principalApproved?: boolean;
  principalSignature?: string;
  principalApprovalDate?: string;
  approvedBonusPercent?: string;
  createdBy: string;
  createdAt: string;
  notes?: string;
}

export const EMPTY_ROW: Omit<FormRow, 'rowNum'> = {
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
};

export const COMMON_SUBJECTS = [
  'מתמטיקה',
  'אנגלית',
  'עברית',
  'ערבית',
  'היסטוריה',
  'היסטוריה מוגבר',
  'אזרחות',
  'פיזיקה',
  'כימיה',
  'ביולוגיה',
  'מדעי המחשב',
  'פרויקט מדעי מחשב',
  'גיאוגרפיה',
  'דת נוצרית',
  'דת מוסלמית',
  'מורשת דרוזית',
  'ניהול משאבי אנוש',
  'מנהל וכלכלה',
  'תקשוב',
  'תורת הבנייה',
  'אדריכלות',
  'תחבורה מתקדמת',
  'חינוך תעבורתי',
  'מוט"ל'
];

export const SCHOOL_YEARS = [
  'תשפ"ד (2023-2024)',
  'תשפ"ה (2024-2025)',
  'תשפ"ו (2025-2026)',
  'תשפ"ז (2026-2027)',
  'תשפ"ח (2027-2028)',
  'תשפ"ט (2028-2029)',
  'תש"ץ (2029-2030)',
  'תשצ"א (2030-2031)',
  'תשצ"ב (2031-2032)'
];

export const parseBonusNumber = (val?: string | number): number => {
  if (val === undefined || val === null || val === '') return 0;
  const cleaned = val.toString().replace(/%/g, '').replace(/,/g, '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export const calculateRowEligiblePercent = (row: Partial<FormRow>): string => {
  const hasExternal = (row.externalExamBonus || '').toString().trim() !== '';
  const hasSchool = (row.schoolExamBonus || '').toString().trim() !== '';
  const hasProject = (row.projectBonus || '').toString().trim() !== '';

  if (!hasExternal && !hasSchool && !hasProject) {
    return '';
  }

  const ext = parseBonusNumber(row.externalExamBonus);
  const sch = parseBonusNumber(row.schoolExamBonus);
  const prj = parseBonusNumber(row.projectBonus);
  const totalBonus = ext + sch + prj;

  const u = parseFloat((row.unitsCount || '').toString().replace(/,/g, '.').trim());
  const out = parseFloat((row.outOfUnits || '').toString().replace(/,/g, '.').trim());

  let ratio = 1;
  if (!isNaN(u) && !isNaN(out) && out > 0) {
    ratio = u / out;
  }

  const calculated = totalBonus * ratio;
  return parseFloat(calculated.toFixed(2)).toString();
};
