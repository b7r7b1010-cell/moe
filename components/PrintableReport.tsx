import React from 'react';
import { Profile, Evaluation, UserRole } from '../types';
import { CRITERIA_MAP } from '../constants';

interface Props {
  staff: Profile;
  evaluation: Evaluation;
  principalName: string;
}

const PrintableReport: React.FC<Props> = ({ staff, evaluation, principalName }) => {
  const criteria = CRITERIA_MAP[staff.role] || CRITERIA_MAP[UserRole.TEACHER] || [];
  const isCondensed = criteria.length > 12;
  const isMidterm = evaluation.period === 'midterm';

  const getGradeInfo = (score: number) => {
    if (score >= 90) return { label: 'مثالي', points: 5 };
    if (score >= 80) return { label: 'تخطى التوقعات', points: 4 };
    if (score >= 70) return { label: 'وافق التوقعات', points: 3 };
    if (score >= 60) return { label: 'بحاجة إلى تطوير', points: 2 };
    return { label: 'غير مرضي', points: 1 };
  };

  const grade = getGradeInfo(evaluation.total_score);
  const finalFrom5 = (evaluation.total_score / 100) * 5;

  return (
    <div 
      className="printable-area font-official text-black bg-white flex flex-col justify-between" 
      style={{ border: '1.5pt solid black', padding: isCondensed ? '4mm' : '7mm', minHeight: '275mm' }}
    >
      <div>
        {/* الترويسة المدمجة للتقرير الرسمي */}
        <table className={`w-full border-none ${isCondensed ? 'mb-2' : 'mb-3'}`}>
          <tbody>
            <tr>
              <td className="w-1/3 text-right align-top space-y-0.5 text-[9.5pt]">
                <p className="font-bold">المملكة العربية السعودية</p>
                <p>وزارة التعليم</p>
                <p>الإدارة العامة للتعليم بمحافظة جدة</p>
                <p className="font-bold text-[10.5pt] text-black">ثانوية الأمير عبدالمجيد الأولى (بنين)</p>
              </td>
              <td className="w-1/3 text-center align-middle">
                <img 
                  src="https://up6.cc/2026/01/176840436497671.png" 
                  className={`${isCondensed ? 'h-12' : 'h-16'} mb-1 mx-auto`} 
                  alt="Logo" 
                />
                <h1 className={`${isCondensed ? 'text-sm' : 'text-base'} font-bold border-b-2 border-black inline-block px-3 pb-0.5`}>
                  بطاقة تقييم الأداء الوظيفي {isMidterm ? '(المراجعة نصف السنوية)' : '(التقييم النهائي المعتمد)'}
                </h1>
              </td>
              <td className="w-1/3 text-left align-top font-sans text-[8pt] space-y-0.5">
                <p>التاريخ: {new Date(evaluation.created_at || Date.now()).toLocaleDateString('ar-SA')}</p>
                <p>العام الدراسي: 1448هـ</p>
                <p className="text-gray-500">ID: {(evaluation.id || 'EV').split('-')[0].toUpperCase()}</p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* صندوق بيانات الموظف والنتيجة */}
        <div className={`border-y-2 border-black ${isCondensed ? 'p-2 mb-2' : 'p-3 mb-3'} flex justify-between items-center bg-gray-50/40`}>
          <div className={`${isCondensed ? 'text-[9.5pt] space-y-0.5' : 'text-[10.5pt] space-y-1'} flex-1`}>
            <p><span className="font-bold">اسم الموظف:</span> {staff.full_name}</p>
            <p>
              <span className="font-bold">المسمى الوظيفي / التكليف:</span> {staff.role} 
              {staff.subject ? ` (تخصص: ${staff.subject})` : ''}
            </p>
            <p><span className="font-bold">المدير المباشر المقيّم:</span> {principalName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-center ${isCondensed ? 'px-3' : 'px-6'} border-l-2 border-black/20`}>
              <p className="text-[7.5pt] font-bold text-gray-600 uppercase">الدرجة الموزونة</p>
              <div className={`${isCondensed ? 'text-xl' : 'text-3xl'} font-bold font-sans`}>
                {finalFrom5.toFixed(2)} <span className="text-[9pt] opacity-50">/ 5</span>
              </div>
            </div>
            <div className={`text-center ${isCondensed ? 'px-3' : 'px-6'}`}>
              <p className="text-[7.5pt] font-bold text-gray-600 uppercase">التقدير العام</p>
              <div className={`${isCondensed ? 'text-xl' : 'text-3xl'} font-bold font-sans`}>
                {Math.round(evaluation.total_score)}%
              </div>
              <p className={`${isCondensed ? 'text-[8.5pt]' : 'text-[9.5pt]'} font-bold mt-0.5`}>
                {grade.label} ({grade.points} من 5)
              </p>
            </div>
          </div>
        </div>

        {/* جدول عناصر ومعايير التقييم */}
        <table className="w-full border-collapse border-black" style={{ border: '1pt solid black' }}>
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black text-[8.5pt]">
              <th className="border-l border-black p-1 w-7 text-center">م</th>
              <th className="border-l border-black p-1 text-right pr-2">عناصر ومعايير التقييم</th>
              <th className="border-l border-black w-16 text-center">الوزن</th>
              <th className="p-1 w-28 text-center">سلم التقدير (1-5)</th>
            </tr>
          </thead>
          <tbody className={isCondensed ? 'text-[8.5pt]' : 'text-[9.5pt]'}>
            {criteria.map((c, idx) => {
              const rawRating = evaluation.scores?.[c.id] || 0;
              return (
                <tr key={c.id} className="border-b border-black">
                  <td className="border-l border-black p-1 text-center font-sans">{idx + 1}</td>
                  <td className="border-l border-black p-1 pr-2 font-bold leading-tight">
                    {c.text}
                    {c.category && (
                      <span className="font-normal text-[7.5pt] text-gray-600 mr-1.5">
                        [{c.category}]
                      </span>
                    )}
                  </td>
                  <td className="border-l border-black p-1 text-center font-sans">
                    {(c.weight * 100).toFixed(0)}%
                  </td>
                  <td className="p-1 text-center">
                    <div className="flex justify-center gap-1" dir="ltr">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <span 
                          key={v} 
                          className={`inline-block border border-black ${
                            isCondensed ? 'w-3.5 h-3.5 text-[7pt]' : 'w-4.5 h-4.5 text-[8pt]'
                          } flex items-center justify-center font-bold ${
                            v === rawRating ? 'bg-black text-white' : ''
                          }`}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-100 font-bold border-t-2 border-black">
              <td colSpan={2} className={`border-l border-black ${isCondensed ? 'p-1' : 'p-1.5'} pr-2`}>
                المجموع الكلي للتقدير الموزون للأداء
              </td>
              <td className="border-l border-black text-center font-sans">100%</td>
              <td className="text-center font-sans text-lg underline underline-offset-4">
                {finalFrom5.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* الملاحظات، خطة التطوير، والتواقيع */}
      <div className={`mt-2 ${isCondensed ? 'pt-2' : 'pt-3'} border-t-2 border-black`}>
        <div className="mb-2">
          <p className="font-bold text-[8.5pt] underline mb-0.5">توصيات وملاحظات مدير المدرسة:</p>
          <p className={`${isCondensed ? 'text-[8.5pt]' : 'text-[9.5pt]'} italic leading-snug px-2 text-gray-800`}>
            "{evaluation.comments || 'نثمن التزامكم المهني وعطاءكم المتميز، ونحثكم على مواصلة التطوير المستمر للأداء.'}"
          </p>
        </div>

        {evaluation.idp_notes && (
          <div className="mb-2 bg-gray-50 p-1.5 border border-black/40 text-[8pt]">
            <p className="font-bold underline mb-0.5">خطة التطوير الفردية وسد الفجوات (IDP):</p>
            <p className="leading-tight">{evaluation.idp_notes}</p>
          </div>
        )}
        
        <div className={`flex justify-between ${isCondensed ? 'mt-3' : 'mt-6'} px-8`}>
          <div className="text-center w-56">
            <p className={`font-bold ${isCondensed ? 'mb-4' : 'mb-8'} text-[9.5pt]`}>توقيع الموظف بالعلم</p>
            <p className="border-t border-black pt-1 font-bold text-[9pt]">{staff.full_name}</p>
          </div>
          <div className="text-center w-56">
            <p className={`font-bold ${isCondensed ? 'mb-4' : 'mb-8'} text-[9.5pt]`}>اعتماد مدير المدرسة</p>
            <p className="border-t border-black pt-1 font-bold text-[9pt]">{principalName}</p>
          </div>
        </div>

        <div className="pt-2 text-center opacity-40 text-[5.5pt] font-sans tracking-[0.2em]">
          * PRINCE MAJID FIRST HIGH SCHOOL - ITQAN PERFORMANCE SYSTEM 2026 *
        </div>
      </div>
    </div>
  );
};

export default PrintableReport;
