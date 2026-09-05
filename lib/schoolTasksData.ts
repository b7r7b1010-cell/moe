import { SchoolTask } from '../types';

export const INITIAL_SCHOOL_TASKS: SchoolTask[] = [
  {
    id: 'task_curriculum_1448',
    title: 'توزيع المنهج والخطة التدريسية الفصلية (1448هـ)',
    description: 'يرجى رفع رابط توزيع المنهج المعتمد للفصل الدراسي مع الخطط الأسبوعية وتأكيد صلاحية المشاركة (عرض).',
    due_date: '1448/02/15',
    academic_year: '1448هـ',
    is_active: true,
    target_role: 'الكل',
    created_at: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'task_diagnostic_1448',
    title: 'تحليل نتائج الاختبار التشخيصي وتحديد الفاقد التعليمي',
    description: 'رفع تقرير رصد وتحليل نتائج الاختبار التشخيصي للطلاب والمهارات الأساسية المستهدفة بالمعالجة.',
    due_date: '1448/02/30',
    academic_year: '1448هـ',
    is_active: true,
    target_role: 'الكل',
    created_at: '2026-09-02T08:00:00.000Z'
  },
  {
    id: 'task_enrichment_1448',
    title: 'خطة معالجة الفاقد التعليمي والأنشطة الإثرائية',
    description: 'إرفاق شواهد الخطط العلاجية لمعالجة التعثر وأوراق العمل المنفذة والأنشطة الإثرائية للمتفوقين.',
    due_date: '1448/03/15',
    academic_year: '1448هـ',
    is_active: true,
    target_role: 'الكل',
    created_at: '2026-09-03T08:00:00.000Z'
  }
];
