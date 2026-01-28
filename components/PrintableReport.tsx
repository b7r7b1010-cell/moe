
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
  // تكثيف التنسيق إذا كان عدد المعايير > 10
  const isCondensed = criteria.length > 10;

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
    <div className={`printable-area font-official text-black bg-white flex flex-col`} style={{ border: '1.5pt solid black', padding: isCondensed ? '5mm' : '8mm' }}>
      
      {/* الترويسة المدمجة */}
      <table className={`w-full border-none ${isCondensed ? 'mb-2' : 'mb-4'}`}>
        <tbody>
          <tr>
            <td className="w-1/3 text-right align-top space-y-0 text-[10pt]">
              <p className="font-bold">المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>تعليم جدة</p>
              <p className="font-bold text-[11pt]">ثانوية الأمير عبدالمجيد الأولى</p>
            </td>
            <td className="w-1/3 text-center align-middle">
              <img src="https://up6.cc/2026/01/176840436497671.png" className={`${isCondensed ? 'h-14' : 'h-18'} mb-1 mx-auto`} alt="Logo" />
              <h1 className={`${isCondensed ? 'text-base' : 'text-lg'} font-bold border-b-2 border-black inline-block px-4 pb-0.5`}>بطاقة الأداء الوظيفي</h1>
            </td>
            <td className="w-1/3 text-left align-top font-sans text-[8pt] space-y-0.5">
              <p>التاريخ: {new Date(evaluation.created_at).toLocaleDateString('ar-SA')}</p>
              <p>العام الدراسي: 1447هـ</p>
              <p className="text-gray-400">ID: {evaluation.id.split('-')[0].toUpperCase()}</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* بوكس النتيجة المئوية ومن 5 */}
      <div className={`border-y-2 border-black ${isCondensed ? 'p-2 mb-2' : 'p-4 mb-4'} flex justify-between items-center bg-gray-50/20`}>
        <div className={`${isCondensed ? 'text-[10pt] space-y-0.5' : 'text-[11pt] space-y-1.5'} flex-1`}>
          <p><span className="font-bold">اسم الموظف:</span> {staff.full_name}</p>
          <p><span className="font-bold">المسمى الوظيفي:</span> {staff.role}</p>
          <p><span className="font-bold">المقيّم:</span> {principalName}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`text-center ${isCondensed ? 'px-4' : 'px-8'} border-l-2 border-black/10`}>
            <p className="text-[8px] font-bold text-gray-500 uppercase">الدرجة النهائية</p>
            <div className={`${isCondensed ? 'text-2xl' : 'text-4xl'} font-bold font-sans`}>{finalFrom5.toFixed(2)} <span className="text-[10pt] opacity-40">/ 5</span></div>
          </div>
          <div className={`text-center ${isCondensed ? 'px-4' : 'px-8'}`}>
            <p className="text-[8px] font-bold text-gray-500 uppercase">النسبة المئوية</p>
            <div className={`${isCondensed ? 'text-2xl' : 'text-4xl'} font-bold font-sans`}>{Math.round(evaluation.total_score)}%</div>
            <p className={`${isCondensed ? 'text-[9pt]' : 'text-[10pt]'} font-bold mt-0.5`}>{rating.label}</p>
          </div>
        </div>
      </div>

      {/* جدول البيانات المدمج */}
      <div className="flex-grow">
        <table className="w-full border-collapse border-black" style={{ border: '1pt solid black' }}>
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black text-[9pt]">
              <th className="border-l border-black p-1 w-8 text-center">م</th>
              <th className="border-l border-black p-1 text-right pr-2">عناصر التقييم</th>
              <th className="border-l border-black w-20 text-center">الوزن</th>
              <th className="p-1 w-32 text-center">التقدير (1-5)</th>
            </tr>
          </thead>
          <tbody className={isCondensed ? 'text-[9.5pt]' : 'text-[10.5pt]'}>
            {criteria.map((c, idx) => {
              const rawRating = evaluation.scores[c.id] || 1;
              return (
                <tr key={c.id} className="border-b border-black">
                  <td className="border-l border-black p-1 text-center font-sans">{idx + 1}</td>
                  <td className="border-l border-black p-1 pr-2 font-bold leading-tight">{c.text}</td>
                  <td className="border-l border-black p-1 text-center font-sans">{(c.weight * 100).toFixed(0)}%</td>
                  <td className="p-1 text-center">
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
            <tr className="bg-gray-100 font-bold border-t-2 border-black">
              <td colSpan={2} className={`border-l border-black ${isCondensed ? 'p-1.5' : 'p-2'} pr-2`}>التقدير العام للأداء</td>
              <td className="border-l border-black text-center font-sans">100%</td>
              <td className="text-center font-sans text-xl underline underline-offset-4">{finalFrom5.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* الملحوظات والتواقيع */}
      <div className={`mt-2 ${isCondensed ? 'pt-2' : 'pt-4'} border-t-2 border-black`}>
        <div className="mb-4">
          <p className="font-bold text-[9pt] underline mb-1">توصيات القيادة المدرسية:</p>
          <p className={`${isCondensed ? 'text-[9.5pt]' : 'text-[10.5pt]'} italic leading-snug px-2`}>
            "{evaluation.comments || 'نثمن التزامكم المهني، ونحثكم على مواصلة التطوير المستمر للأداء.'}"
          </p>
        </div>
        
        <div className={`flex justify-between ${isCondensed ? 'mt-4' : 'mt-10'} px-12`}>
          <div className="text-center w-64">
            <p className={`font-bold ${isCondensed ? 'mb-6' : 'mb-14'} text-[10pt]`}>توقيع الموظف</p>
            <p className="border-t-2 border-black pt-1 font-bold text-[10pt]">{staff.full_name}</p>
          </div>
          <div className="text-center w-64">
            <p className={`font-bold ${isCondensed ? 'mb-6' : 'mb-14'} text-[10pt]`}>يعتمد: مدير المدرسة</p>
            <p className="border-t-2 border-black pt-1 font-bold text-[10pt]">{principalName}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-2 text-center opacity-40 text-[6pt] font-sans tracking-[0.2em]">
        * PRINCE MAJID SCHOOL PERFORMANCE SYSTEM - DIGITAL VERSION *
      </div>
    </div>
  );
};

export default PrintableReport;
