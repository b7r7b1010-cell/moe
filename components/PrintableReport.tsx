
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

  // دالة تحويل الدرجة المئوية إلى نقاط صحيحة (1-5) بناءً على المعايير الرسمية
  const getRating = (score: number) => {
    let points = 1;
    let label = 'غير مرضي';
    
    if (score >= 90) { points = 5; label = 'ممتاز'; }
    else if (score >= 80) { points = 4; label = 'جيد جداً'; }
    else if (score >= 70) { points = 3; label = 'جيد'; }
    else if (score >= 60) { points = 2; label = 'مرضي'; }
    else { points = 1; label = 'غير مرضي'; }

    return { label, points: points.toString() };
  };

  const rating = getRating(evaluation.total_score);

  return (
    <div className="printable-area font-official text-black bg-white" style={{ fontSize: '11pt', lineHeight: '1.4' }}>
      
      {/* الترويسة العلوية */}
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

      {/* بيانات الموظف والنتيجة النهائية بالنقاط الصحيحة */}
      <div className="border-2 border-black p-4 mb-6 flex justify-between items-center rounded-sm">
        <div className="space-y-2">
          <p><span className="font-bold">اسم الموظف:</span> {staff.full_name}</p>
          <p><span className="font-bold">المسمى الوظيفي:</span> {staff.role}</p>
          <p><span className="font-bold">المقيّم:</span> {principalName}</p>
        </div>
        <div className="flex items-center">
          <div className="text-center px-6">
            <p className="text-xs font-bold text-gray-500 mb-1">الدرجة المئوية</p>
            <div className="text-4xl font-bold font-sans">{Math.round(evaluation.total_score)}</div>
          </div>
          <div className="w-px h-16 bg-black"></div>
          <div className="text-center px-6">
            <p className="text-xs font-bold text-gray-500 mb-1">التقدير (النقاط)</p>
            <div className="text-4xl font-bold font-sans">{rating.points}</div>
            <p className="text-sm font-bold mt-1">{rating.label}</p>
          </div>
        </div>
      </div>

      {/* جدول العناصر - نقاط صحيحة لكل معيار */}
      <table className="w-full border-collapse border-2 border-black mb-6" style={{ fontSize: '10pt' }}>
        <thead>
          <tr className="bg-gray-50 border-b-2 border-black">
            <th className="border-l-2 border-black p-2 w-10 text-center">م</th>
            <th className="border-l-2 border-black p-2 text-right">معايير التقييم والواجبات الوظيفية</th>
            <th className="border-l-2 border-black w-20 text-center">الوزن</th>
            <th className="p-2 w-32 text-center">الدرجة (1-5)</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, idx) => {
            const rawScore = evaluation.scores[c.id] || 0;
            const percentage = (rawScore / c.weight) * 100;
            // تحويل درجة المعيار الفردي أيضاً لنقاط صحيحة للتناسق
            let rowPoints = 1;
            if (percentage >= 90) rowPoints = 5;
            else if (percentage >= 80) rowPoints = 4;
            else if (percentage >= 70) rowPoints = 3;
            else if (percentage >= 60) rowPoints = 2;
            else rowPoints = 1;

            return (
              <tr key={c.id} className="border-b border-black">
                <td className="border-l-2 border-black p-1.5 text-center font-sans">{idx + 1}</td>
                <td className="border-l-2 border-black p-1.5 pr-3 font-bold">{c.text}</td>
                <td className="border-l-2 border-black p-1.5 text-center font-sans">{c.weight}</td>
                <td className="p-1.5 text-center">
                  <div className="flex justify-center gap-1.5" dir="ltr">
                    {[1, 2, 3, 4, 5].map(v => (
                      <span key={v} className={`inline-block border border-black w-5 h-5 flex items-center justify-center text-[9pt] font-bold ${v === rowPoints ? 'bg-black text-white' : ''}`}>
                        {v}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-gray-100 font-bold">
            <td colSpan={2} className="border-l-2 border-black p-2 pr-3">المجموع النهائي لدرجة الأداء الوظيفي</td>
            <td className="border-l-2 border-black p-2 text-center font-sans">100</td>
            <td className="p-2 text-center text-xl font-sans">{Math.round(evaluation.total_score)}</td>
          </tr>
        </tbody>
      </table>

      {/* التوجيهات والتوصيات */}
      <div className="border-2 border-black p-3 mb-8 min-h-[80px]">
        <p className="font-bold text-sm mb-2 underline">التوصيات والملحوظات المهنية:</p>
        <p className="text-sm">{evaluation.comments || 'يؤدي الموظف مهامه وفق المعايير المهنية المعتمدة.'}</p>
      </div>

      {/* منطقة التواقيع */}
      <div className="flex justify-between items-start px-12 mt-auto pb-10">
        <div className="text-center w-64">
          <p className="font-bold mb-14 text-sm">توقيع الموظف/ة</p>
          <p className="border-t-2 border-black pt-2 font-bold">{staff.full_name}</p>
        </div>
        <div className="text-center w-64">
          <p className="font-bold mb-14 text-sm">مدير المدرسة (يعتمد)</p>
          <p className="border-t-2 border-black pt-2 font-bold">{principalName}</p>
        </div>
      </div>

      {/* تذييل الصفحة */}
      <div className="absolute bottom-4 left-0 right-0 text-center opacity-40 text-[7pt] font-sans tracking-widest">
        * OFFICIAL DIGITAL DOCUMENT - PRINCE MAJID SCHOOL PERFORMANCE SYSTEM *
      </div>
    </div>
  );
};

export default PrintableReport;
