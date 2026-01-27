
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
    <div className="bg-white font-official text-slate-900 printable-document min-h-[1050px] p-6" dir="rtl">
      <div className="flex justify-between items-start mb-10 pb-6 border-b-4 border-[#0f4c4c]">
        <div className="text-right space-y-1 min-w-[200px]">
          <p className="text-base font-bold">المملكة العربية السعودية</p>
          <p className="text-base">وزارة التعليم</p>
          <p className="text-base">الإدارة العامة للتعليم بمحافظة جدة</p>
          <p className="text-lg font-black mt-2 text-[#0f4c4c]">ثانوية الأمير عبدالمجيد الأولى</p>
        </div>
        <div className="text-center flex flex-col items-center">
           <img src="https://up6.cc/2026/01/176840436497671.png" className="h-28 mb-4 drop-shadow-lg" alt="Logo" />
           <div className="border-2 border-slate-900 px-12 py-2 rounded-2xl bg-slate-50 shadow-sm">
             <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">بطاقة الأداء الوظيفي</h2>
           </div>
        </div>
        <div className="text-left space-y-1 min-w-[200px]">
          <p className="text-xs font-sans font-bold">التاريخ: {new Date(evaluation.created_at).toLocaleDateString('ar-SA')}</p>
          <p className="text-xs font-sans font-bold">العام الدراسي: 1446هـ</p>
          <p className="text-[10px] font-sans text-slate-400 mt-2 uppercase tracking-widest">REF: {evaluation.id.split('-')[0]}</p>
        </div>
      </div>

      <div className="flex border-4 border-slate-900 rounded-[2rem] mb-6 overflow-hidden shadow-xl bg-white">
        <div className="flex-1 p-8 border-l-4 border-slate-900 space-y-5">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg min-w-[120px]">اسم الموظف:</span>
            <span className="flex-1 border-b-2 border-dotted border-slate-300 mr-6 text-2xl font-black text-[#0f4c4c]">{staff.full_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg min-w-[120px]">المسمى المهني:</span>
            <span className="flex-1 border-b-2 border-dotted border-slate-300 mr-6 text-xl">{staff.role}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg min-w-[120px]">اسم المقيّم:</span>
            <span className="flex-1 border-b-2 border-dotted border-slate-300 mr-6 text-xl">{principalName}</span>
          </div>
        </div>
        <div className="w-80 bg-slate-50 flex flex-col items-center justify-center p-8">
          <span className="text-sm font-black mb-2 text-slate-400 uppercase tracking-widest">الدرجة والتقدير</span>
          <div className="text-7xl font-black text-slate-900 leading-none font-sans mb-1">{evaluation.total_score}</div>
          <div className="bg-[#0f4c4c] text-white px-8 py-2 rounded-full text-xl font-black shadow-lg">
            {gradeInfo.label} ({gradeInfo.rating})
          </div>
        </div>
      </div>

      <table className="w-full border-4 border-slate-900 mb-8 shadow-lg">
        <thead className="bg-[#0f4c4c] text-white">
          <tr className="border-b-4 border-slate-900">
            <th className="p-3 border-l-4 border-slate-900 text-center w-16 text-base">م</th>
            <th className="p-3 border-l-4 border-slate-900 text-right text-base">عناصر التقييم</th>
            <th className="p-3 border-l-4 border-slate-900 text-center w-24 text-base">الوزن</th>
            <th className="p-3 text-center w-48 text-base">سلم التقدير (1-5)</th>
          </tr>
        </thead>
        <tbody className="divide-y-4 divide-slate-900">
          {criteria.map((c, idx) => {
             const score = evaluation.scores[c.id] || 0;
             const rating = Math.round((score / c.weight) * 5);
             return (
              <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="p-3 border-l-4 border-slate-900 text-center text-sm font-bold font-sans">{idx + 1}</td>
                <td className="p-3 border-l-4 border-slate-900 text-right text-base font-bold pr-4">{c.text}</td>
                <td className="p-3 border-l-4 border-slate-900 text-center text-sm font-bold font-sans">%{c.weight}</td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-1" dir="ltr">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className={`w-7 h-7 border-2 border-slate-900 flex items-center justify-center text-xs font-black ${rating === n ? 'bg-[#0f4c4c] text-white' : ''}`}>
                        {n}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          <tr className="bg-slate-100 font-black border-t-4 border-slate-900">
            <td colSpan={2} className="p-4 border-l-4 border-slate-900 text-left text-lg pr-6 uppercase tracking-widest">التقدير العام النهائي</td>
            <td className="p-4 border-l-4 border-slate-900 text-center text-lg font-sans">100%</td>
            <td className="p-4 text-center text-3xl font-black font-sans text-[#0f4c4c]">{evaluation.total_score}</td>
          </tr>
        </tbody>
      </table>

      <div className="border-4 border-slate-900 rounded-[2.5rem] p-8 mb-12 bg-slate-50/50 shadow-inner min-h-[150px] relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-[#0f4c4c] text-white px-6 py-2 rounded-bl-[1.5rem] font-black text-sm">التوصيات والوصف الوظيفي</div>
        <div className="mt-8 space-y-4">
           <div className="flex items-center gap-3">
              <span className="font-black text-xl text-[#0f4c4c] border-b-2 border-[#0f4c4c]">{gradeInfo.label}:</span>
              <span className="text-lg font-bold text-slate-600 italic">"{gradeInfo.desc}"</span>
           </div>
           <p className="text-xl leading-relaxed font-bold text-slate-800">
            {evaluation.comments || 'يُنصح بالاستمرار في تطوير الممارسات التعليمية بما يتوافق مع أحدث الاستراتيجيات التربوية المعتمدة.'}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-32 mt-16 px-12">
        <div className="text-center space-y-12">
          <p className="font-black text-xl border-b-4 border-slate-900 inline-block px-8 pb-2">توقيع الموظف/ة</p>
          <div className="pt-2">
            <p className="text-lg font-black text-slate-800">{staff.full_name}</p>
          </div>
        </div>
        <div className="text-center space-y-12">
          <p className="font-black text-xl border-b-4 border-slate-900 inline-block px-8 pb-2">اعتماد مدير المدرسة</p>
          <div className="pt-2">
            <p className="text-lg font-black text-slate-800">{principalName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableReport;
