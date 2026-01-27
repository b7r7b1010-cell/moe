
export enum UserRole {
  TEACHER = 'معلم',
  VICE_PRINCIPAL = 'وكيل مدرسة',
  COUNSELOR = 'موجه طلابي',
  LAB_ASSISTANT = 'محضر مختبر',
  PRINCIPAL = 'مدير مدرسة'
}

export interface Criterion {
  id: number;
  text: string;
  weight: number;
}

export interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  role: UserRole;
  drive_link?: string;
  drive_link_v2?: string; 
  is_approved: boolean; // الحقل الجديد للتحكم في الاعتماد
  created_at: string;
}

export interface Evaluation {
  id: string;
  staff_id: string;
  evaluator_id: string;
  scores: Record<number, number>; 
  total_score: number;
  comments?: string;
  created_at: string;
}
