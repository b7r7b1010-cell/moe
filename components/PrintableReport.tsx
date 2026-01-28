
import React from 'react';
import { Profile, Evaluation } from '../types';
import { CRITERIA_MAP } from '../constants';

interface Props {
  staff: Profile;
  evaluation: Evaluation;
  principalName: string;
}

const PrintableReport: React.FC<Props> = ({ staff, evaluation, principalName }) => {
  const criteria = CRITERIA_MAP[staff.role] || [];
  const isCondensed = criteria.length > 14;

  const getRating = (percentage: number) => {
    let points = 1;
    let label = 'غير مرضي';
    if (percentage >= 90) { points = 5; label = 'مثالي'; }
    else if (percentage >= 80) { points = 4; label = 'تخطى التوقعات'; }
    else if (percentage >= 70) { points = 3; label = 'وافق التوقعات'; }
    else if (percentage >= 60) { points = 2; label = 'بحاجة إلى تطوير'; }
    else { points = 1; label = 'غير مرضي'; }
    return { label, points: points.toString() };
  };

  const rating = getRating(evaluation.total_score);
  const finalFrom5 = (evaluation.total_score / 100) * 5;

  return (
    <div className={`printable-area font-official text-black bg-white ${isCondensed ? 'text-[9.5pt]' : 'text-[11pt]'}`} style={{ lineHeight: isCondensed ? '1.15' : '1.4' }}>
      
      {/* الترويسة الرسمية */}
      <table className={`w-full border-none ${isCondensed ? 'mb-2' : 'mb-6'}`}>
        <tbody>
          <tr>
            <td className="w-1/3 text-right align-top space-y-0.5">
              <p className="font-bold">المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>الإدارة العامة للتعليم بجدة</p>
              <p className="font-bold">ثانوية الأمير عبدالمجيد الأولى</p>
            </td>
            <td className="w-1/3 text-center align-middle">
              <img src="https://up6.cc/2026/01/176840436497671.png" className={`${isCondensed ? 'h-14' : 'h-20'} mb-1 mx-auto`} alt="Logo" />
              <h1 className={`${isCondensed ? 'text-base' : 'text-lg'} font-bold border-b-2 border-black inline-block pb-0.5 uppercase tracking-tighter`}>بطاقة الأداء الوظيفي</h1>
            </td>
            <td className="w-1/3 text-left align-top font-sans" style={{ fontSize: isCondensed ? '8pt' : '9pt' }}>
              <p>التاريخ: {new Date(evaluation.created_at).toLocaleDateString('ar-SA')}</p>
              <p>العام الدراسي: 1446هـ</p>
              <p className="text-gray-400">ID: {evaluation.id.split('-')[0].toUpperCase()}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* بوكس النتيجة المئوية ومن 5 */}
      <div className={`border-2 border-black ${isCondensed ? 'p-2 mb-2' : 'p-4 mb-6'} flex justify-between items-center rounded-sm bg-gray-50/30`}>
        <div className={isCondensed ? 'space-y-0.5' : 'space-y-2'}>
          <p><span className="font-bold">اسم الموظف:</span> {staff.full_name}</p>
          <p><span className="font-bold">المسمى الوظيفي:</span> {staff.role}</p>
          <p><span className="font-bold">المقيّم:</span> {principalName}</p>
        </div>
        <div className="flex items-center">
          <div className={`text-center ${isCondensed ? 'px-4' : 'px-8'}`}>
            <p className="text-[9px] font-bold text-gray-500 mb-0.5 uppercase">الدرجة النهائية</p>
            <div className={`${isCondensed ? 'text-2xl' : 'text-4xl'} font-bold font-sans`}>{finalFrom5.toFixed(2)} <span className="text-xs opacity-40">/ 5</span></div>
          </div>
          <div className={`w-px ${isCondensed ? 'h-10' : 'h-16'} bg-black`}></div>
          <div className={`text-center ${isCondensed ? 'px-4' : 'px-8'}`}>
            <p className="text-[9px] font-bold text-gray-500 mb-0.5 uppercase">النسبة المئوية</p>
            <div className={`${isCondensed ? 'text-2xl' : 'text-4xl'} font-bold font-sans`}>{Math.round(evaluation.total_score)}%</div>
            <p className="text-[10px] font-bold mt-0.5">{rating.label}</p>
          </div>
        </div>
      </div>

      {/* جدول البيانات الرئيسي */}
      <table className="w-full border-collapse border-2 border-black mb-2" style={{ fontSize: isCondensed ? '9pt' : '10pt' }}>
        <thead>
          <tr className="bg-gray-100 border-b-2 border-black">
            <th className="border-l-2 border-black p-1.5 w-8 text-center">م</th>
            <th className="border-l-2 border-black p-1.5 text-right">عناصر التقييم (المعايير والواجبات)</th>
            <th className="border-l-2 border-black w-24 text-center">الوزن النسبي</th>
            <th className="p-1.5 w-28 text-center">سلم التقدير (1-5)</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, idx) => {
            // استرجاع التقدير الخام (1-5) من مصفوفة الدرجات
            const rawRating = evaluation.scores[c.id] || 1;

            return (
              <tr key={c.id} className="border-b border-black">
                <td className={`border-l-2 border-black ${isCondensed ? 'p-1' : 'p-1.5'} text-center font-sans`}>{idx + 1}</td>
                <td className={`border-l-2 border-black ${isCondensed ? 'p-1' : 'p-1.5'} pr-2 font-bold`}>{c.text}</td>
                <td className={`border-l-2 border-black ${isCondensed ? 'p-1' : 'p-1.5'} text-center font-bold font-sans`}>
                  {(c.weight * 100).toFixed(0)}%
                </td>
                <td className={`${isCondensed ? 'p-1' : 'p-1.5'} text-center`}>
                  <div className="flex justify-center gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map(v => (
                      <span key={v} className={`inline-block border border-black ${isCondensed ? 'w-4 h-4 text-[8pt]' : 'w-5 h-5 text-[9pt]'} flex items-center justify-center font-bold ${v === rawRating ? 'bg-black text-white' : ''}`}>
                        {v}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-gray-100 font-bold">
            <td colSpan={2} className={`border-l-2 border-black ${isCondensed ? 'p-2' : 'p-3'} pr-2 text-base`}>التقدير العام للأداء (الدرجة النهائية)</td>
            <td className={`border-l-2 border-black ${isCondensed ? 'p-2' : 'p-3'} text-center font-sans text-base`}>100%</td>
            <td className={`${isCondensed ? 'p-2' : 'p-3'} text-center text-xl font-sans underline decoration-double`}>
              {finalFrom5.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* الملحوظات المهنية */}
      <div className={`border-2 border-black p-3 mb-4 ${isCondensed ? 'min-h-[50px]' : 'min-h-[80px]'} relative`}>
        <p className="font-bold text-[8.5pt] mb-1 underline">توصيات وملاحظات القيادة المدرسية:</p>
        <p className="text-[9.5pt] leading-snug italic">"{evaluation.comments || 'نثمن التزامكم المهني، ونحثكم على مواصلة التطوير المستمر للأداء.'}"</p>
      </div>

      {/* منطقة التواقيع */}
      <div className={`flex justify-between items-start px-12 ${isCondensed ? 'mt-4' : 'mt-auto pb-14'}`}>
        <div className="text-center w-64">
          <p className={`font-bold ${isCondensed ? 'mb-10' : 'mb-16'} text-xs uppercase tracking-widest`}>توقيع الموظف</p>
          <p className="border-t-2 border-black pt-1.5 font-bold text-sm">{staff.full_name}</p>
        </div>
        <div className="text-center w-64">
          <p className={`font-bold ${isCondensed ? 'mb-10' : 'mb-16'} text-xs uppercase tracking-widest`}>يعتمد: مدير المدرسة</p>
          <p className="border-t-2 border-black pt-1.5 font-bold text-sm">{principalName}</p>
        </div>
      </div>

      {/* تذييل الصفحة الرسمي */}
      <div className="absolute bottom-4 left-0 right-0 text-center opacity-40 text-[6pt] font-sans tracking-[0.3em] font-bold">
        * PRINCE MAJID SCHOOL PERFORMANCE SYSTEM - OFFICIAL DIGITAL RECORD *
      </div>
    </div>
  );
};

export default PrintableReport;
