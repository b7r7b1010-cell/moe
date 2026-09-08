import { Profile, SchoolTask, UserRole } from '../types';

/**
 * Checks whether a given role string represents any teacher role
 * (including standard teaching, activity-assigned, and health-assigned).
 */
export const isTeacherRole = (role?: string): boolean => {
  if (!role) return false;
  const r = role.trim();
  return (
    r === UserRole.TEACHER ||
    r === UserRole.TEACHER_ACTIVITY ||
    r === UserRole.TEACHER_HEALTH ||
    r.includes('معلم') ||
    r.includes('تدريس')
  );
};

/**
 * Checks whether a staff member is targeted by a given task.
 * Handles the "three types of teachers" seamlessly.
 */
export const isStaffTargetedByTask = (staffMember: Profile, task?: SchoolTask): boolean => {
  if (!staffMember) return false;
  // Principal is never the submitter of staff tasks
  if (staffMember.role === UserRole.PRINCIPAL) return false;
  // Only approved staff
  if (!staffMember.is_approved) return false;

  if (!task || !task.target_role || task.target_role === 'الكل' || task.target_role === 'كافة منسوبي المدرسة') {
    return true;
  }

  const tRole = task.target_role.trim();
  const sRole = (staffMember.role || '').trim();

  // If task targets all teachers (any of the 3 models/types)
  if (
    tRole === 'معلم' ||
    tRole === 'المعلمون' ||
    tRole === 'كافة المعلمين' ||
    tRole === 'المعلمون (يشمل التدريس العام والنشاط والتوجيه الصحي)' ||
    tRole === UserRole.TEACHER
  ) {
    return isTeacherRole(sRole);
  }

  // Exact match
  if (sRole === tRole) return true;

  // Specific assignment matching
  if (tRole.includes('نشاط') && sRole.includes('نشاط')) return true;
  if (tRole.includes('صحي') && sRole.includes('صحي')) return true;
  if (tRole.includes('موجه') && sRole.includes('موجه')) return true;
  if (tRole.includes('مختبر') && sRole.includes('مختبر')) return true;
  if (tRole.includes('وكيل') && sRole.includes('وكيل')) return true;

  return false;
};

/**
 * Generates a valid UUID v4 compliant string for database compatibility.
 */
export const generateSafeUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // fallback
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Wraps any promise with a timeout so mobile networks never freeze.
 */
export const withTimeout = <T>(promise: Promise<T>, timeoutMs = 2500): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('انتهت مهلة انتظار الاتصال السحابي')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

/**
 * Predefined target role options for the Principal when creating a task.
 */
export const TARGET_ROLE_OPTIONS = [
  { value: 'الكل', label: 'كافة منسوبي المدرسة (معلمون وإداريون وكوادر)' },
  { value: 'المعلمون', label: 'كافة المعلمين (يشمل التدريس العام، رائد النشاط، الموجه الصحي)' },
  { value: UserRole.TEACHER, label: 'معلم (نموذج التدريس العام فقط)' },
  { value: UserRole.TEACHER_ACTIVITY, label: 'معلم مسند له نشاط طلابي' },
  { value: UserRole.TEACHER_HEALTH, label: 'معلم مسند له توجيه صحي' },
  { value: UserRole.COUNSELOR, label: 'الموجه الطلابي' },
  { value: UserRole.LAB_ASSISTANT, label: 'محضر المختبر' },
  { value: UserRole.VICE_PRINCIPAL, label: 'وكيل المدرسة' },
];
