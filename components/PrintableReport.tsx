
import React from 'react';
import { Profile, Evaluation } from '../types';
import { CRITERIA_MAP } from '../constants';
// Import ShieldCheck for the footer certification icon
import { ShieldCheck } from 'lucide-react';

interface Props {
  staff: Profile;
  evaluation: Evaluation;
  principalName: string;
}

const PrintableReport: React.FC<Props> = ({ staff, evaluation, principalName }) => {
  const criteria = CRITERIA_MAP[staff.role];

  return (
    <div className="bg-white font-official text-slate-900 printable-document min-h-[1050px]" dir="rtl">
      {/* Official Header Section (Ministry Style) */}
      <div className="flex justify-between items-start mb-10 pb-6 border-b-4 border-[#0f4c4c]">
        <div className="text-right space-y-1 min-w-[200px]">
          <p className="text-base font-bold">المملكة العربية السعودية</p>
          <p className="text-base">وزارة التعليم</p>
          <p className="text-base">الإدارة العامة للتعليم بمحافظة جدة</p>
          <p className="text-lg font-black mt-2 text-[#0f4c4c]">ثانوية الأمير عبدالمجيد الأولى</p>
        </div>
        <div className="text-center flex flex-col items-center">
           <img 
             src="https://up6.cc/2026/01/176840436497671.png" 
             className="h-28 mb-4 drop-shadow-lg" 
             alt="Logo" 
           />
           <div className="border-2 border-slate-900 px-12 py-2 rounded-2xl bg-slate-50 shadow-sm">
             <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase">بطاقة الأداء الوظيفي</h2>
           </div>
        </div>
        <div className="text-left space-y-1 min-w-[200px]">
          <p className="text-xs font-sans font-bold">التاريخ: {new Date(evaluation.created_at).toLocaleDateString('ar-SA')}</p>
          <p className="text-xs font-sans font-bold">العام الدراسي: 1446هـ</p>
          <p className="text-[10px] font-sans text-slate-400 mt-2 uppercase tracking-widest">Digital ID: {evaluation.id.split('-')[0]}</p>
        </div>
      </div>

      {/* Profile Info Summary Box */}
      <div className="flex border-4 border-slate-900 rounded-[2rem] mb-10 overflow-hidden shadow-xl bg-white">
        <div className="flex-1 p-8 border-l-4 border-slate-900 space-y-5 bg-white">
          <div className="flex justify-between items-center group">
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
        <div className="w-72 bg-slate-50 flex flex-col items-center justify-center p-8 border-r-4 border-slate-900">
          <span className="text-sm font-black mb-2 text-slate-400 uppercase tracking-widest">الدرجة النهائية</span>
          <div className="text-7xl font-black text-slate-900 mb-2 leading-none">{evaluation.total_score}</div>
          <div className="bg-[#0f4c4c] text-white px-6 py-2 rounded-full text-base font-black shadow-lg">
            {evaluation.total_score >= 90 ? 'ممتاز' : evaluation.total_score >= 80 ? 'جيد جداً' : evaluation.total_score >= 70 ? 'جيد' : 'مرضي'}
          </div>
        </div>
      </div>

      {/* Evaluation Detailed Table */}
      <table className="w-full border-4 border-slate-900 mb-10 shadow-lg">
        <thead className="bg-[#0f4c4c] text-white">
          <tr className="border-b-4 border-slate-900">
            <th className="p-4 border-l-4 border-slate-900 text-center w-16 text-base">م</th>
            <th className="p-4 border-l-4 border-slate-900 text-right text-base">معيار التقييم الفني والتربوي</th>
            <th className="p-4 border-l-4 border-slate-900 text-center w-32 text-base">الوزن</th>
            <th className="p-4 text-center w-32 text-base">الدرجة</th>
          </tr>
        </thead>
        <tbody className="divide-y-4 divide-slate-900">
          {criteria.map((c, idx) => (
            <tr key={c.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="p-3 border-l-4 border-slate-900 text-center text-base font-sans font-bold">{idx + 1}</td>
              <td className="p-3 border-l-4 border-slate-900 text-right text-base leading-snug font-bold pr-6">{c.text}</td>
              <td className="p-3 border-l-4 border-slate-900 text-center text-base font-sans">{c.weight}</td>
              <td className="p-3 text-center text-2xl font-black font-sans text-[#0f4c4c]">
                {evaluation.scores[c.id] || 0}
              </td>
            </tr>
          ))}
          <tr className="bg-slate-100 font-black border-t-4 border-slate-900">
            <td colSpan={2} className="p-4 border-l-4 border-slate-900 text-left text-lg pr-10 uppercase tracking-widest">المجموع التراكمي</td>
            <td className="p-4 border-l-4 border-slate-900 text-center text-lg font-sans">100</td>
            <td className="p-4 text-center text-3xl font-black font-sans text-[#0f4c4c]">{evaluation.total_score}</td>
          </tr>
        </tbody>
      </table>

      {/* Remarks Section */}
      <div className="border-4 border-slate-900 rounded-[2rem] p-8 mb-16 bg-slate-50/50 shadow-inner">
        <h3 className="text-xl font-black mb-4 underline decoration-4 underline-offset-8 text-[#0f4c4c]">مرئيات الإدارة المدرسية وملاحظات التحسين:</h3>
        <p className="text-lg leading-relaxed text-justify min-h-[150px] font-bold">
          {evaluation.comments || 'بعد مراجعة الأدلة والشواهد الرقمية المرفوعة، تم تقييم أداء الموظف وفق معايير الجودة المعتمدة. نوصي بالاستمرار في العطاء المتميز وتعزيز نواتج التعلم بما يحقق أهداف الخطة الدراسية السنوية للمؤسسة التعليمية.'}
        </p>
      </div>

      {/* Footer / Signatures */}
      <div className="grid grid-cols-2 gap-32 mt-20 px-12">
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
            <div className="flex items-center justify-center gap-2 mt-2">
               <ShieldCheck className="w-4 h-4 text-emerald-600" />
               <p className="text-[10px] text-slate-400 font-sans tracking-widest uppercase">Certified Digital Document</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Print-only Security Footer */}
      <div className="mt-24 pt-10 border-t-2 border-slate-100 flex justify-between items-center opacity-30 no-screen">
         <p className="text-[10px] font-sans">© 1446 إتقان - نظام الأداء الوظيفي الرقمي</p>
         <p className="text-[10px] font-sans">Generated: {new Date().toISOString()}</p>
      </div>
    </div>
  );
};

export default PrintableReport;
