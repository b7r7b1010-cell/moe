import React from 'react';
import { SchoolTask, TaskSubmission, Profile } from '../types';
import { Printer, X, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Props {
  task: SchoolTask;
  staffList?: Profile[];
  items?: Array<{ teacher: Profile; submission?: TaskSubmission }>;
  submissions?: TaskSubmission[];
  stats?: {
    total: number;
    submittedCount: number;
    approvedCount: number;
    pendingCount: number;
    percent: number;
  };
  filterTitle: string;
  principalProfile?: Profile;
  principalName?: string;
  onClose: () => void;
}

export const PrintableTaskReport: React.FC<Props> = ({
  task,
  staffList = [],
  items: directItems,
  submissions = [],
  stats: directStats,
  filterTitle,
  principalProfile,
  principalName: propPrincipalName,
  onClose,
}) => {
  const currentDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate items safely if staffList was passed
  const reportItems = directItems || staffList.map(teacher => {
    const sub = submissions.find(s => s.task_id === task.id && s.teacher_id === teacher.id);
    return { teacher, submission: sub };
  });

  // Calculate stats safely if not provided
  const reportStats = directStats || (() => {
    const total = reportItems.length;
    const submittedCount = reportItems.filter(i => i.submission?.drive_link && i.submission?.status !== 'pending').length;
    const approvedCount = reportItems.filter(i => i.submission?.status === 'approved').length;
    const pendingCount = reportItems.filter(i => !i.submission?.drive_link || i.submission?.status === 'pending').length;
    const percent = total > 0 ? Math.round((submittedCount / total) * 100) : 0;
    return { total, submittedCount, approvedCount, pendingCount, percent };
  })();

  const effectivePrincipalName = principalProfile?.full_name || propPrincipalName || 'أ. عبدالله علي الشهري';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-cairo text-right print:static print:bg-white print:p-0 print:overflow-visible print:block printable-modal-overlay" dir="rtl">
      {/* Floating Action Bar (Hidden on Print) */}
      <div className="fixed top-4 left-4 right-4 z-50 flex justify-between items-center bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-slate-200 print:hidden max-w-5xl mx-auto no-print">
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-slate-800">معاينة التقرير الإشرافي للطباعة (A4)</span>
          <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
            عدد السجلات: {reportItems.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-[#0f4c4c] hover:bg-[#164e63] text-white px-5 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            طباعة الكشف الآن
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* The Printable Page Canvas */}
      <div className="printable-area bg-white w-full max-w-5xl min-h-[90vh] my-16 print:my-0 p-8 md:p-12 rounded-3xl shadow-2xl print:shadow-none print:rounded-none print:w-full print:p-2 text-slate-900 border print:border-none border-slate-200">
        {/* Official Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5 mb-6">
          <div className="text-right space-y-1 text-xs md:text-sm font-black text-slate-800">
            <p>المملكة العربية السعودية</p>
            <p>وزارة التعليم</p>
            <p>الإدارة العامة للتعليم بمحافظة جدة</p>
            <p className="text-emerald-800 font-black">ثانوية الأمير عبدالمجيد الأولى</p>
            <p className="text-[11px] text-slate-500 font-bold">العام الدراسي: 1448هـ</p>
          </div>

          <div className="text-center space-y-1.5 flex flex-col items-center">
            <img 
              src="/moe_logo.png" 
              onError={(e) => { e.currentTarget.src = "https://up6.cc/2026/01/176840436497671.png"; }}
              className="h-14 md:h-16 object-contain mx-auto drop-shadow-xs" 
              alt="شعار وزارة التعليم" 
            />
            <h1 className="text-base md:text-lg font-black text-slate-900">
              كشف حصر ومتابعة تسليمات المهام والشواهد
            </h1>
            <p className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-0.5 rounded-full inline-block border border-slate-200">
              {filterTitle}
            </p>
          </div>

          <div className="text-left space-y-1 text-xs font-bold text-slate-600">
            <p>تاريخ الحصر: <span className="font-mono text-slate-900">{currentDate}</span></p>
            <p>آخر موعد للتسليم: <span className="font-mono text-slate-900">{task.due_date || 'غير محدد'}</span></p>
            <p>المستهدفون: <span className="text-emerald-800 font-black">{task.target_role || 'كافة منسوبي المدرسة'}</span></p>
            <p className="text-[10px] text-slate-400">نظام إتقان 2.0 لإدارة الأداء الوظيفي</p>
          </div>
        </div>

        {/* Task Details Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase">المهمة / المتطلب الفصلي:</span>
            <h2 className="text-base md:text-lg font-black text-slate-900">{task.title}</h2>
            {task.description && (
              <p className="text-xs text-slate-600 mt-0.5">{task.description}</p>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-center min-w-[70px]">
              <span className="text-[10px] text-slate-500 block font-bold">المستهدفون</span>
              <span className="text-sm font-black text-slate-800">{reportStats.total}</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-xl border border-blue-200 text-center min-w-[70px]">
              <span className="text-[10px] text-blue-600 block font-bold">سلّموا</span>
              <span className="text-sm font-black text-blue-700">{reportStats.submittedCount}</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-xl border border-emerald-200 text-center min-w-[70px]">
              <span className="text-[10px] text-emerald-600 block font-bold">اعتمدوا</span>
              <span className="text-sm font-black text-emerald-700">{reportStats.approvedCount}</span>
            </div>
            <div className="bg-white px-3 py-2 rounded-xl border border-rose-200 text-center min-w-[70px]">
              <span className="text-[10px] text-rose-600 block font-bold">لم يسلموا</span>
              <span className="text-sm font-black text-rose-700">{reportStats.pendingCount}</span>
            </div>
            <div className="bg-[#0f4c4c] text-white px-3 py-2 rounded-xl text-center min-w-[75px]">
              <span className="text-[10px] text-emerald-200 block font-bold">نسبة الإنجاز</span>
              <span className="text-sm font-black">{reportStats.percent}%</span>
            </div>
          </div>
        </div>

        {/* Records Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-right border-collapse text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                <th className="py-2.5 px-3 w-10 text-center border-l border-slate-300">م</th>
                <th className="py-2.5 px-3 border-l border-slate-300">اسم المعلم / الموظف</th>
                <th className="py-2.5 px-3 border-l border-slate-300">التخصص / المادة</th>
                <th className="py-2.5 px-3 border-l border-slate-300">الوظيفة التعليمية</th>
                <th className="py-2.5 px-3 text-center border-l border-slate-300">حالة التسليم</th>
                <th className="py-2.5 px-3 text-center border-l border-slate-300">تاريخ التسليم</th>
                <th className="py-2.5 px-3 border-l border-slate-300">ملاحظات المعلم / رابط الشاهد</th>
                <th className="py-2.5 px-3 text-center w-28">توقيع المعلم / الاعتماد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-bold">
              {reportItems.map((item, idx) => {
                const isSubmitted = !!item.submission?.drive_link;
                const status = item.submission?.status || 'pending';

                return (
                  <tr key={item.teacher.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-center border-l border-slate-200 font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 font-black text-slate-900">
                      {item.teacher.full_name}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 text-slate-600">
                      {item.teacher.subject || '—'}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 text-slate-600 text-[11px]">
                      {item.teacher.role}
                    </td>
                    <td className="py-2 px-3 text-center border-l border-slate-200">
                      {status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-black text-[10px]">
                          <CheckCircle2 className="w-3 h-3" /> معتمد
                        </span>
                      ) : isSubmitted ? (
                        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-black text-[10px]">
                          <Clock className="w-3 h-3" /> تم التسليم
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-black text-[10px]">
                          <AlertCircle className="w-3 h-3" /> لم يسلّم
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center border-l border-slate-200 font-mono text-[10px] text-slate-500">
                      {item.submission?.submitted_at
                        ? new Date(item.submission.submitted_at).toLocaleDateString('ar-SA')
                        : '—'}
                    </td>
                    <td className="py-2 px-3 border-l border-slate-200 text-[11px] text-slate-600 max-w-[200px] truncate">
                      {item.submission?.teacher_notes || (item.submission?.drive_link ? 'تم إرفاق رابط الشاهد' : '—')}
                    </td>
                    <td className="py-2 px-3 text-center border-slate-200">
                      <div className="h-6 border-b border-dotted border-slate-300 w-full" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Official Footer and Signatures */}
        <div className="pt-6 border-t-2 border-slate-800 flex justify-end">
          <div className="text-center min-w-[240px] space-y-3">
            <p className="text-xs font-black text-slate-900">يعتمد مدير المدرسة</p>
            <p className="text-sm font-black text-[#0f4c4c]">{effectivePrincipalName}</p>
            <div className="pt-6">
              <div className="border-b border-dotted border-slate-400 w-44 mx-auto" />
              <p className="text-[10px] text-slate-400 font-bold mt-1">التوقيع والاعتماد</p>
            </div>
          </div>
        </div>

        {/* System Watermark */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-bold">
          <span>نظام إتقان 2.0 لإدارة الأداء الوظيفي والإشراف المدرسي — ثانوية الأمير عبدالمجيد الأولى</span>
          <span>صفحة مطبوعة إلكترونياً من المنصة الرسمية</span>
        </div>
      </div>
    </div>
  );
};
