
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

  const getGradeInfo = (score: number) => {
    const ratingFromFive = (score / 20).toFixed(1);
    if (score >= 90) return { label: 'ممتاز', rating: `${ratingFromFive}/5`, desc: 'أداء يفوق التوقعات بشكل استثنائي.' };
    if (score >= 80) return { label: 'جيد جداً', rating: `${ratingFromFive}/5`, desc: 'أداء يتجاوز التوقعات في معظم الأحيان.' };
    if (score >= 70) return { label: 'جيد', rating: `${ratingFromFive}/5`, desc: 'أداء يلبي التوقعات المطلوبة.' };
    if (score >= 60) return { label: 'مرضي', rating: `${ratingFromFive}/5`, desc: 'أداء أقل من التوقعات، يحتاج إلى تحسين.' };
    return { label: 'غير مرضي', rating: `${ratingFromFive}/5`, desc: 'أداء ضعيف جداً ولا يلبي المعايير الدنيا.' };
  };

  const gradeInfo = getGradeInfo(evaluation.total_score);

  return (
    <div className="bg-white font-official text-slate-900 printable-document mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '10mm' }} dir="rtl">
      {/* Header Section - More Compact */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-[#0f4c4c]">
        <div className="text-right space-y-0.5 min-w-[180px]">
          <p className="text-sm font-bold">المملكة العربية السعودية</p>
          <p className="text-sm">وزارة التعليم</p>
          <p className="text-sm">الإدارة العامة للتعليم بمحافظة جدة</p>
          <p className="text-base font-black mt-1 text-[#0f4c4c]">ثانوية الأمير عبدالمجيد الأولى</p>
        </div>
        <div className="text-center flex flex-col items-center flex-1">
           <img src="https://up6.cc/2026/01/176840436497671.png" className="h-20 mb-2" alt="Logo" />
           <div className="border border-slate-900 px-8 py-1 rounded-xl bg-slate-50 shadow-sm">
             <h2 className="text-xl font-black tracking-tight uppercase">بطاقة الأداء الوظيفي</h2>
           </div>
        </div>
        <div className="text-left space-y-0.5 min-w-[180px]">
          <p className="text-[10px] font-sans font-bold">التاريخ: {new Date(evaluation.created_at).toLocaleDateString('ar-SA')}</p>
          <p className="text-[10px] font-sans font-bold">العام الدراسي: 1446هـ</p>
          <p className="text-[9px] font-sans text-slate-400 mt-1 uppercase tracking-widest">DIGITAL ID: {evaluation.id.split('-')[0].toUpperCase()}</p>
        </div>
      </div>

      {/* Info Grid - Fits better */}
      <div className="flex border-2 border-slate-900 rounded-2xl mb-6 overflow-hidden bg-white">
        <div className="flex-1 p-5 border-l-2 border-slate-900 space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm min-w-[100px]">اسم الموظف:</span>
            <span className="flex-1 border-b border-dotted border-slate-300 mr-4 text-lg font-black text-[#0f4c4c]">{staff.full_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm min-w-[100px]">المسمى المهني:</span>
            <span className="flex-1 border-b border-dotted border-slate-300 mr-4 text-base">{staff.role}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm min-w-[100px]">اسم المقيّم:</span>
            <span className="flex-1 border-b border-dotted border-slate-300 mr-4 text-base">{principalName}</span>
          </div>
        </div>
        <div className="w-56 bg-slate-50 flex flex-col items-center justify-center p-4">
          <span className="text-[10px] font-black mb-1 text-slate-400 uppercase tracking-widest">الدرجة النهائية</span>
          <div className="text-5xl font-black text-slate-900 leading-none font-sans mb-2">{evaluation.total_score}</div>
          <div className="bg-[#0f4c4c] text-white px-6 py-1 rounded-full text-sm font-black shadow-md">
            {gradeInfo.label} ({gradeInfo.rating})
          </div>
        </div>
      </div>

      {/* Criteria Table - Reduced padding for A4 */}
      <table className="w-full border-2 border-slate-900 mb-6 text-sm">
        <thead className="bg-[#0f4c4c] text-white">
          <tr className="border-b-2 border-slate-900">
            <th className="p-2 border-l-2 border-slate-900 text-center w-12 font-black">م</th>
            <th className="p-2 border-l-2 border-slate-900 text-right font-black">معايير التقييم الفني والتربوي</th>
            <th className="p-2 border-l-2 border-slate-900 text-center w-20 font-black">الوزن</th>
            <th className="p-2 text-center w-40 font-black">الدرجة (1-5)</th>
          </tr>
        </thead>
        <tbody className="divide-y-2 divide-slate-900">
          {criteria.map((c, idx) => {
             const score = evaluation.scores[c.id] || 0;
             const rating = Math.round((score / c.weight) * 5);
             return (
              <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="p-1.5 border-l-2 border-slate-900 text-center font-sans font-bold text-xs">{idx + 1}</td>
                <td className="p-1.5 border-l-2 border-slate-900 text-right font-bold pr-3">{c.text}</td>
                <td className="p-1.5 border-l-2 border-slate-900 text-center font-sans font-bold text-xs">{c.weight}</td>
                <td className="p-1.5 text-center">
                  <div className="flex justify-center gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className={`w-6 h-6 border border-slate-900 flex items-center justify-center text-[10px] font-black ${rating === n ? 'bg-[#0f4c4c] text-white' : ''}`}>
                        {n}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-slate-100 font-black border-t-2 border-slate-900">
            <td colSpan={2} className="p-2.5 border-l-2 border-slate-900 text-left text-sm pr-4 uppercase tracking-widest">إجمالي درجة الأداء الوظيفي</td>
            <td className="p-2.5 border-l-2 border-slate-900 text-center font-sans text-sm">100</td>
            <td className="p-2.5 text-center text-2xl font-black font-sans text-[#0f4c4c]">{evaluation.total_score}</td>
          </tr>
        </tbody>
      </table>

      {/* Recommendations - More compact */}
      <div className="border-2 border-slate-900 rounded-2xl p-5 mb-10 bg-slate-50/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#0f4c4c] text-white px-4 py-1 rounded-bl-xl font-black text-[10px]">التوصيات والوصف المهني</div>
        <div className="mt-4 space-y-2">
           <div className="flex items-center gap-3">
              <span className="font-black text-base text-[#0f4c4c] border-b border-[#0f4c4c]">{gradeInfo.label}:</span>
              <span className="text-sm font-bold text-slate-600 italic">"{gradeInfo.desc}"</span>
           </div>
           <p className="text-sm leading-relaxed font-bold text-slate-800">
            {evaluation.comments || 'يُنصح بالاستمرار في تطوير الممارسات التعليمية بما يتوافق مع أحدث الاستراتيجيات التربوية المعتمدة.'}
           </p>
        </div>
      </div>

      {/* Signatures - Better placement for A4 bottom */}
      <div className="grid grid-cols-2 gap-20 mt-8 px-10">
        <div className="text-center space-y-10">
          <p className="font-black text-sm border-b-2 border-slate-900 inline-block px-6 pb-1">توقيع الموظف/ة</p>
          <div className="pt-1">
            <p className="text-base font-black text-slate-800">{staff.full_name}</p>
          </div>
        </div>
        <div className="text-center space-y-10">
          <p className="font-black text-sm border-b-2 border-slate-900 inline-block px-6 pb-1">اعتماد مدير المدرسة</p>
          <div className="pt-1">
            <p className="text-base font-black text-slate-800">{principalName}</p>
          </div>
        </div>
      </div>

      {/* Footer stamp-like text */}
      <div className="mt-12 text-center">
         <p className="text-[9px] text-slate-300 font-sans tracking-[0.3em] uppercase">This is an electronically generated document - PRINCE MAJID SCHOOL SYSTEM</p>
      </div>
    </div>
  );
};

export default PrintableReport;
