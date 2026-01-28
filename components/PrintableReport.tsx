
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
    if (percentage >= 90) return { label: 'مثالي', points: '5' };
    if (percentage >= 80) return { label: 'تخطى التوقعات', points: '4' };
    if (percentage >= 70) return { label: 'وافق التوقعات', points: '3' };
    if (percentage >= 60) return { label: 'بحاجة إلى تطوير', points: '2' };
    return { label: 'غير مرضي', points: '1' };
  };

  const rating = getRating(evaluation.total_score);
  const finalFrom5 = (evaluation.total_score / 100) * 5;

  return (
    <div className={`printable-area font-official text-black bg-white ${isCondensed ? 'text-[9.5pt]' : 'text-[11pt]'}`} style={{ border: '2px solid black', margin: '10mm' }}>
      
      {/* الترويسة الرسمية */}
      <table className="w-full border-none mb-6 p-4">
        <tbody>
          <tr>
            <td className="w-1/3 text-right align-top space-y-0.5">
              <p className="font-bold">المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>الإدارة العامة للتعليم بجدة</p>
              <p className="font-bold">ثانوية الأمير عبدالمجيد الأولى</p>
            </td>
            <td className="w-1/3 text-center align-middle">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-20 mb-1 mx-auto" alt="Logo" />
              <h1 className="text-lg font-bold border-b-2 border-black inline-block pb-0.5 uppercase tracking-tighter">بطاقة الأداء الوظيفي</h1>
            </td>
            <td className="w-1/3 text-left align-top font-sans text-[9pt]">
              <p>التاريخ: {new Date(evaluation.created_at).toLocaleDateString('ar-SA')}</p>
              <p>العام الدراسي: 1447هـ</p>
              <p className="text-gray-400">ID: {evaluation.id.split('-')[0].toUpperCase()}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* بوكس النتيجة المئوية ومن 5 */}
      <div className="border-y-2 border-black p-4 mb-6 flex justify-between items-center bg-gray-50/30">
        <div className="space-y-2 pr-4">
          <p><span className="font-bold">اسم الموظف:</span> {staff.full_name}</p>
          <p><span className="font-bold">المسمى الوظيفي:</span> {staff.role}</p>
          <p><span className="font-bold">المقيّم:</span> {principalName}</p>
        </div>
        <div className="flex items-center pl-4">
          <div className="text-center px-8 border-l border-black">
            <p className="text-[9px] font-bold text-gray-500 mb-0.5 uppercase">الدرجة النهائية</p>
            <div className="text-4xl font-bold font-sans">{finalFrom5.toFixed(2)} <span className="text-xs opacity-40">/ 5</span></div>
          </div>
          <div className="text-center px-8">
            <p className="text-[9px] font-bold text-gray-500 mb-0.5 uppercase">النسبة المئوية</p>
            <div className="text-4xl font-bold font-sans">{Math.round(evaluation.total_score)}%</div>
            <p className="text-[10px] font-bold mt-0.5">{rating.label}</p>
          </div>
        </div>
      </div>

      {/* جدول البيانات الرئيسي */}
      <table className="w-full border-collapse border-black mb-2" style={{ border: '1px solid black' }}>
        <thead>
          <tr className="bg-gray-100 border-b border-black">
            <th className="border-l border-black p-2 w-8 text-center">م</th>
            <th className="border-l border-black p-2 text-right">عناصر التقييم</th>
            <th className="border-l border-black w-24 text-center">الوزن</th>
            <th className="p-2 w-28 text-center">التقدير (1-5)</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((c, idx) => {
            const rawRating = evaluation.scores[c.id] || 1;
            return (
              <tr key={c.id} className="border-b border-black">
                <td className="border-l border-black p-2 text-center font-sans">{idx + 1}</td>
                <td className="border-l border-black p-2 pr-2 font-bold">{c.text}</td>
                <td className="border-l border-black p-2 text-center font-sans">{(c.weight * 100).toFixed(0)}%</td>
                <td className="p-2 text-center">
                  <div className="flex justify-center gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map(v => (
                      <span key={v} className={`inline-block border border-black w-5 h-5 flex items-center justify-center font-bold ${v === rawRating ? 'bg-black text-white' : ''}`}>
                        {v}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-gray-100 font-bold border-t-2 border-black">
            <td colSpan={2} className="border-l border-black p-3 pr-2">التقدير العام للأداء</td>
            <td className="border-l border-black p-3 text-center">100%</td>
            <td className="p-3 text-center text-xl font-sans underline">{finalFrom5.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* الملحوظات والتواقيع */}
      <div className="p-4 border-t-2 border-black">
        <p className="font-bold text-[9pt] mb-2 underline">التوصيات:</p>
        <p className="text-[10pt] italic min-h-[60px]">"{evaluation.comments || 'نثمن التزامكم المهني.'}"</p>
        
        <div className="flex justify-between mt-10 px-10">
          <div className="text-center">
            <p className="font-bold mb-10">توقيع الموظف</p>
            <p className="border-t border-black pt-1">_________________</p>
          </div>
          <div className="text-center">
            <p className="font-bold mb-10">يعتمد: مدير المدرسة</p>
            <p className="border-t border-black pt-1">{principalName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableReport;
