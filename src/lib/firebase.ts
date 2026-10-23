import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously, 
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { TeacherSubmission } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged, signOut, signInWithPopup, signInAnonymously };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Initial connection test
testConnection();

// Ensure user session exists (either Google user or Anonymous session for teachers)
const LOCAL_STORAGE_KEY = 'maghar_bagrut_submissions_cache';

export function getLocalSubmissions(): TeacherSubmission[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to read localStorage:', e);
    return [];
  }
}

export function saveLocalSubmission(sub: TeacherSubmission): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const list = getLocalSubmissions();
    const existingIndex = list.findIndex(
      (s) => (s.id && sub.id && s.id === sub.id) || 
             (s.teacherId === sub.teacherId && s.createdAt === sub.createdAt)
    );
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...sub };
    } else {
      list.unshift(sub);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function deleteLocalSubmission(id: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const list = getLocalSubmissions();
    const updated = list.filter((s) => s.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete from localStorage:', e);
  }
}

export function sanitizeSubmission(sub: Partial<TeacherSubmission>): Record<string, any> {
  const cleanRows = (sub.rows || []).map((row, idx) => ({
    rowNum: Number(row.rowNum) || (idx + 1),
    subject: String(row.subject || '').trim(),
    gradeGroup: String(row.gradeGroup || '').trim(),
    studentsCount: String(row.studentsCount || '').trim(),
    questionnaireCode: String(row.questionnaireCode || '').trim(),
    externalExamBonus: String(row.externalExamBonus || '').trim(),
    schoolExamBonus: String(row.schoolExamBonus || '').trim(),
    projectBonus: String(row.projectBonus || '').trim(),
    unitsCount: String(row.unitsCount || '').trim(),
    outOfUnits: String(row.outOfUnits || '').trim(),
    eligibleBonusPercent: String(row.eligibleBonusPercent || '').trim(),
  }));

  const cleanData: Record<string, any> = {
    teacherName: String(sub.teacherName || '').trim(),
    teacherId: String(sub.teacherId || '').trim(),
    submissionDate: String(sub.submissionDate || '').trim(),
    schoolYear: String(sub.schoolYear || '').trim(),
    rows: cleanRows,
    status: sub.status || 'submitted',
    createdBy: String(sub.createdBy || (auth.currentUser?.uid || `teacher_${sub.teacherId || 'guest'}`)),
    createdAt: String(sub.createdAt || new Date().toISOString()),
  };

  if (sub.secretPin) {
    cleanData.secretPin = String(sub.secretPin).trim();
  }
  if (sub.teacherSignature) {
    cleanData.teacherSignature = String(sub.teacherSignature);
  }
  if (sub.notes) {
    cleanData.notes = String(sub.notes);
  }
  if (sub.principalApproved !== undefined) {
    cleanData.principalApproved = Boolean(sub.principalApproved);
  }
  if (sub.principalSignature) {
    cleanData.principalSignature = String(sub.principalSignature);
  }
  if (sub.principalApprovalDate) {
    cleanData.principalApprovalDate = String(sub.principalApprovalDate);
  }
  if (sub.approvedBonusPercent) {
    cleanData.approvedBonusPercent = String(sub.approvedBonusPercent);
  }

  return cleanData;
}

// Ensure user session exists if available
export async function ensureAuthSession(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    const anonCred = await signInAnonymously(auth);
    return anonCred.user;
  } catch (err) {
    // Normal when anonymous auth is not enabled
    return null;
  }
}

// Firestore Service Functions
export async function createSubmission(submissionData: Omit<TeacherSubmission, 'id'>): Promise<string> {
  const path = 'submissions';
  const cleanData = sanitizeSubmission(submissionData);
  const localId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const localRecord: TeacherSubmission = {
    id: localId,
    ...(cleanData as any)
  };
  // Always save locally first so the teacher never loses their submission
  saveLocalSubmission(localRecord);

  try {
    const docRef = await addDoc(collection(db, path), cleanData);
    const serverId = docRef.id;
    // Replace temporary local ID with real Firestore server ID
    deleteLocalSubmission(localId);
    saveLocalSubmission({ ...localRecord, id: serverId });
    return serverId;
  } catch (error) {
    console.warn('Firestore write warning:', error);
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch {
      // Local copy saved safely
    }
    return localId;
  }
}

export function subscribeToSubmissions(
  onUpdate: (submissions: TeacherSubmission[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'submissions';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const serverDocs = snapshot.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
          } as TeacherSubmission)
      );

      // Merge server documents with any pending un-synced local documents
      const localDocs = getLocalSubmissions();
      const mergedMap = new Map<string, TeacherSubmission>();

      serverDocs.forEach((s) => {
        if (s.id) mergedMap.set(s.id, s);
      });

      localDocs.forEach((s) => {
        if (s.id && !mergedMap.has(s.id)) {
          // Check if this submission is already in serverDocs by teacherId and date
          const isDuplicate = serverDocs.some(
            (srv) => srv.teacherId === s.teacherId && srv.submissionDate === s.submissionDate
          );
          if (!isDuplicate) {
            mergedMap.set(s.id, s);
          }
        }
      });

      const result = Array.from(mergedMap.values());
      // Keep local storage synchronized with server documents
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result));
      } catch (e) {
        // ignore
      }

      onUpdate(result);
    },
    (error) => {
      console.warn('Real-time listener warning:', error);
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch {
        // ignore
      }
    }
  );
}

export async function getAllSubmissions(): Promise<TeacherSubmission[]> {
  const path = 'submissions';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const serverDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TeacherSubmission));

    const localDocs = getLocalSubmissions();
    const mergedMap = new Map<string, TeacherSubmission>();

    serverDocs.forEach(s => {
      if (s.id) mergedMap.set(s.id, s);
    });

    localDocs.forEach(s => {
      if (s.id && !mergedMap.has(s.id)) {
        const isDuplicate = serverDocs.some(
          (srv) => srv.teacherId === s.teacherId && srv.submissionDate === s.submissionDate
        );
        if (!isDuplicate) {
          mergedMap.set(s.id, s);
        }
      }
    });

    const result = Array.from(mergedMap.values());
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result));
    } catch (e) {
      // ignore
    }
    return result;
  } catch (error) {
    console.warn('Firestore read failed, falling back to local cache:', error);
    const local = getLocalSubmissions();
    if (local.length > 0) {
      return local;
    }
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
}

export async function getSubmissionById(id: string): Promise<TeacherSubmission | null> {
  const path = `submissions/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'submissions', id));
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as TeacherSubmission;
    }
  } catch (error) {
    console.warn('Firestore get failed, checking local cache:', error);
  }

  // Fallback to local cache
  const localList = getLocalSubmissions();
  const found = localList.find(s => s.id === id);
  return found || null;
}

export async function updateSubmissionApproval(
  id: string, 
  approved: boolean, 
  approvedBonusPercent: string,
  principalSignature?: string
): Promise<void> {
  const path = `submissions/${id}`;
  const updateData: Partial<TeacherSubmission> = {
    status: approved ? 'approved' : 'rejected',
    principalApproved: approved,
    approvedBonusPercent,
    principalApprovalDate: new Date().toISOString().split('T')[0],
    ...(principalSignature ? { principalSignature } : {})
  };

  // Update local storage first
  const localList = getLocalSubmissions();
  const existingIndex = localList.findIndex(s => s.id === id);
  if (existingIndex >= 0) {
    localList[existingIndex] = { ...localList[existingIndex], ...updateData };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
  }

  // Then attempt server update
  try {
    await updateDoc(doc(db, 'submissions', id), updateData);
  } catch (error) {
    console.warn('Firestore update warning:', error);
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch {
      // Local copy was already updated
    }
  }
}

export async function updateSubmissionSignature(
  id: string,
  teacherSignature: string
): Promise<void> {
  const path = `submissions/${id}`;
  const updateData: Partial<TeacherSubmission> = {
    teacherSignature,
  };

  // Update local storage first
  const localList = getLocalSubmissions();
  const existingIndex = localList.findIndex(s => s.id === id);
  if (existingIndex >= 0) {
    localList[existingIndex] = { ...localList[existingIndex], ...updateData };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
  }

  // Then attempt server update
  try {
    await updateDoc(doc(db, 'submissions', id), updateData);
  } catch (error) {
    console.warn('Firestore signature update warning:', error);
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch {
      // Local copy was already updated
    }
  }
}

export async function updateSubmission(
  id: string,
  updatedFields: Partial<TeacherSubmission>
): Promise<void> {
  const path = `submissions/${id}`;
  const cleanData: Record<string, any> = {};

  if (updatedFields.teacherName !== undefined) cleanData.teacherName = String(updatedFields.teacherName).trim();
  if (updatedFields.teacherId !== undefined) cleanData.teacherId = String(updatedFields.teacherId).trim();
  if (updatedFields.submissionDate !== undefined) cleanData.submissionDate = String(updatedFields.submissionDate).trim();
  if (updatedFields.schoolYear !== undefined) cleanData.schoolYear = String(updatedFields.schoolYear).trim();
  if (updatedFields.rows !== undefined) {
    cleanData.rows = (updatedFields.rows || []).map((row, idx) => ({
      rowNum: Number(row.rowNum) || (idx + 1),
      subject: String(row.subject || '').trim(),
      gradeGroup: String(row.gradeGroup || '').trim(),
      studentsCount: String(row.studentsCount || '').trim(),
      questionnaireCode: String(row.questionnaireCode || '').trim(),
      externalExamBonus: String(row.externalExamBonus || '').trim(),
      schoolExamBonus: String(row.schoolExamBonus || '').trim(),
      projectBonus: String(row.projectBonus || '').trim(),
      unitsCount: String(row.unitsCount || '').trim(),
      outOfUnits: String(row.outOfUnits || '').trim(),
      eligibleBonusPercent: String(row.eligibleBonusPercent || '').trim(),
    }));
  }
  if (updatedFields.teacherSignature !== undefined) {
    cleanData.teacherSignature = String(updatedFields.teacherSignature);
  }
  if (updatedFields.status !== undefined) {
    cleanData.status = updatedFields.status;
  }
  if (updatedFields.notes !== undefined) {
    cleanData.notes = String(updatedFields.notes);
  }
  if (updatedFields.secretPin !== undefined) {
    cleanData.secretPin = String(updatedFields.secretPin).trim();
  }

  // Update local storage first
  const localList = getLocalSubmissions();
  const existingIndex = localList.findIndex(s => s.id === id);
  if (existingIndex >= 0) {
    localList[existingIndex] = { ...localList[existingIndex], ...cleanData };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localList));
  }

  // Then attempt server update
  try {
    await updateDoc(doc(db, 'submissions', id), cleanData);
  } catch (error) {
    console.warn('Firestore update warning:', error);
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch {
      // Local copy was already updated
    }
  }
}

export async function findSubmissionsByTeacherId(searchId: string): Promise<TeacherSubmission[]> {
  const cleanId = searchId.trim();
  if (!cleanId) return [];

  // Generate variants: original, 9-digit padded, and without leading zeroes
  const variants = Array.from(new Set([
    cleanId,
    cleanId.padStart(9, '0'),
    cleanId.replace(/^0+/, '')
  ])).filter(Boolean);

  const map = new Map<string, TeacherSubmission>();

  // Check server for each variant
  for (const variant of variants) {
    try {
      const q = query(collection(db, 'submissions'), where('teacherId', '==', variant));
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(d => {
        map.set(d.id, {
          id: d.id,
          ...d.data()
        } as TeacherSubmission);
      });
    } catch (err) {
      console.warn(`Server search error for variant ${variant}:`, err);
    }
  }

  // Also check local cache for each variant
  const localDocs = getLocalSubmissions();
  for (const docItem of localDocs) {
    const docTeacherId = (docItem.teacherId || '').trim();
    if (variants.includes(docTeacherId) || variants.includes(docTeacherId.padStart(9, '0'))) {
      if (docItem.id && !map.has(docItem.id)) {
        map.set(docItem.id, docItem);
      }
    }
  }

  const results = Array.from(map.values());
  return results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function deleteSubmission(id: string): Promise<void> {
  const path = `submissions/${id}`;
  deleteLocalSubmission(id);
  try {
    await deleteDoc(doc(db, 'submissions', id));
  } catch (error) {
    console.warn('Firestore delete warning:', error);
    try {
      handleFirestoreError(error, OperationType.DELETE, path);
    } catch {
      // Local copy was already deleted
    }
  }
}
