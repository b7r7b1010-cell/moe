export enum UserRole {
  TEACHER = 'معلم',
  TEACHER_ACTIVITY = 'معلم مسند له نشاط طلابي',
  TEACHER_HEALTH = 'معلم مسند له توجيه صحي',
  COUNSELOR = 'موجه طلابي',
  LAB_ASSISTANT = 'محضر مختبر',
  VICE_PRINCIPAL = 'وكيل مدرسة',
  PRINCIPAL = 'مدير مدرسة'
}

export type EvaluationPeriod = 'midterm' | 'final';

export interface CriterionLevel {
  level: number;
  description: string;
}

export interface Criterion {
  id: number;
  text: string;
  weight: number;
  category?: 'مشتركة' | 'تخصصية' | 'إضافية';
  explanation?: string;
  levels?: Record<number, string>;
}

export interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  role: UserRole;
  subject?: string;
  drive_link?: string; // رابط شواهد التقييم النصف سنوي
  drive_link_v2?: string; // رابط شواهد التقييم النهائي
  is_approved: boolean; 
  is_ready_for_eval?: boolean; // إشعار بجاهزية ملف التقييم النصفي
  is_ready_for_final?: boolean; // إشعار بجاهزية ملف التقييم النهائي
  created_at: string;
}

export interface Evaluation {
  id: string;
  staff_id: string;
  evaluator_id: string;
  period?: EvaluationPeriod;
  scores: Record<number, number>; 
  total_score: number;
  comments?: string;
  idp_notes?: string; // خطة التطوير الفردية وسد الفجوات
  created_at: string;
}

export interface SchoolTimeline {
  midtermStartDate: string;
  midtermEndDate: string;
  isMidtermOpen: boolean;
  finalStartDate: string;
  finalEndDate: string;
  isFinalOpen: boolean;
  activeAnnouncement: string;
  academicYear: string;
}
