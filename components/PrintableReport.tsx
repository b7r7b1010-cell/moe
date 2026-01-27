
import React from 'react';
import { Profile, Evaluation } from '../types';
import { CRITERIA_MAP } from '../constants';

interface Props {
  staff: Profile;
  evaluation: Evaluation;
  principalName: string;
}

const PrintableReport: React.FC<Props> = ({ staff, evaluation, principalName }) => {
  const criteria = CRITERIA_MAP[staff.role];

  // دالة تصنيف الأداء الرسمية
  const getRating = (score: number) => {
    if (score >= 90) return { label: 'ممتاز', scale: (score/20).toFixed(1) + '/5' };
    if (score >= 80) return { label: 'جيد جداً', scale: (score/20).toFixed(1) + '/5' };
    if (score >= 70) return { label: 'جيد', scale: (score/20).toFixed(1) + '/5' };
    if (score >= 60) return { label: 'مرضي', scale: (score/20).toFixed(1) + '/5' };
    return { label: 'غير مرضي', scale: (score/20).toFixed(1) + '/5' };
  };

  const rating = getRating(evaluation.total_score);

  return (
    <div className="printable-area font-official text-black bg-white" style={{ fontSize: '11pt', lineHeight: '1.4' }}>
      
      {/* الترويسة العلوية - تصميم كلاسيكي نظيف */}
      <table className="w-full mb-6 border-none">
        <tbody>
          <tr>
            <td className="w-1/3 text-right align-top space-y-1">
              <p className="font-bold">المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>الإدارة العامة للتعليم بجدة</p>
              <p className="font-bold">ثانوية الأمير عبدالمجيد الأولى</p>
            </td>
            <td className="w-1/3 text-center align-middle">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-20 mb-2 mx-auto" alt="Logo" />
              <h1 className="text-lg font-bold border-b-2 border-black inline-block pb-1">بطاقة الأداء الوظيفي</h1>
            </td>
            <td className="w-1/3 text-left align-top font-sans" style={{ fontSize: '9pt' }}>
              <p>التاريخ: {new Date(evaluation.created_at).toLocaleDateString('ar-SA')}</p>
              <p>العام الدراسي: 1446هـ</p>
              <p className="text-gray-400">ID: {evaluation.id.split('-')[0].toUpperCase()}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* بيانات الموظف والنتيجة */}
      <div className="border border-black p-4 mb-6 flex justify-between items-center rounded-sm">
        <div className="space-y-2">
          <p><span className="font-bold">اسم الموظف:</span> {staff.full_name}</p>
          <p><span className="font-bold">المسمى الوظيفي:</span> {staff.role}</p>
          <p><span className="font-bold">المقيّم:</span> {principalName}</p>
        </div>
        <div className="text-center border-r-2 border-black pr-8">
          <p className="text-xs font-bold text-gray-500 mb-1">الدرجة النهائية</p>
          <div className="text-5xl font-bold font-sans">{evaluation.total_score}</div>
          <p className="text-sm font-bold mt-1">{rating.label} ({rating.scale})</p>
        </div>
      </div>

      {/* جدول العناصر - HTML نظيف جداً */}
      <table className="w-full border-collapse border border-black mb-6" style={{ fontSize: '10pt' }}>
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-black p-2 w-10 text-center">م</th>
            <th className="border border-black p-2 text-right">معايير التقييم والواجبات الوظيفية</th>
            <th className="border border-black p-2 w-20 text-center">الوزن</th>
            <th className="border border-black p-2 w-32 text-center">الدرجة (1-5)</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, idx) => {
            const score = evaluation.scores[c.id] || 0;
            const rVal = Math.round((score / c.weight) * 5);
            return (
              <tr key={c.id}>
                <td className="border border-black p-1.5 text-center font-sans">{idx + 1}</td>
                <td className="border border-black p-1.5 pr-3 font-bold">{c.text}</td>
                <td className="border border-black p-1.5 text-center font-sans">{c.weight}</td>
                <td className="border border-black p-1.5 text-center font-sans font-bold">
                  <div className="flex justify-center gap-2" dir="ltr">
                    {[1, 2, 3, 4, 5].map(v => (
                      <span key={v} className={`inline-block border border-black px-1.5 ${v === rVal ? 'bg-black text-white' : ''}`}>
                        {v}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-gray-100 font-bold">
            <td colSpan={2} className="border border-black p-2 pr-3">المجموع النهائي لدرجة الأداء</td>
            <td className="border border-black p-2 text-center font-sans">100</td>
            <td className="border border-black p-2 text-center text-xl font-sans">{evaluation.total_score}</td>
          </tr>
        </tbody>
      </table>

      {/* التوجيهات والتوصيات */}
      <div className="border border-black p-3 mb-8 min-h-[80px]">
        <p className="font-bold text-sm mb-2 underline">التوصيات والملحوظات:</p>
        <p className="text-sm">{evaluation.comments || 'يؤدي الموظف مهامه وفق المعايير المطلوبة، ويُنصح بمواكبة مستجدات التخصص.'}</p>
      </div>

      {/* منطقة التواقيع */}
      <div className="flex justify-between items-start px-12 mt-auto pb-10">
        <div className="text-center w-64">
          <p className="font-bold mb-12">توقيع الموظف/ة</p>
          <p className="border-t border-black pt-2 font-bold">{staff.full_name}</p>
        </div>
        <div className="text-center w-64">
          <p className="font-bold mb-12">مدير المدرسة (يعتمد)</p>
          <p className="border-t border-black pt-2 font-bold">{principalName}</p>
        </div>
      </div>

      {/* ختم النظام */}
      <div className="absolute bottom-4 left-0 right-0 text-center opacity-40 text-[8pt] font-sans">
        * مستند إلكتروني معتمد من نظام إتقان - ثانوية الأمير عبدالمجيد الأولى *
      </div>
    </div>
  );
};

export default PrintableReport;
