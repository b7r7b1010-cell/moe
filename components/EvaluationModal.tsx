
import React, { useState, useEffect } from 'react';
import { Profile, Evaluation, UserRole } from '../types';
import { CRITERIA_MAP } from '../constants';
import { supabase } from '../supabase';
import { 
  X, Save, ExternalLink, 
  Award, Lightbulb, Info, Sparkles, FileText, Calculator, Folder, CheckCircle2, Loader2
} from 'lucide-react';

interface Props {
  staff: Profile;
  onClose: () => void;
}

// مكون التقييم الرئيسي للتعامل مع رصد درجات الموظفين
const EvaluationModal: React.FC<Props> = ({ staff, onClose }) => {
  const criteria = CRITERIA_MAP[staff.role] || [];
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingEvalId, setExistingEvalId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOldEval = async () => {
      const { data } = await supabase
        .from('evaluations')
        .select('*')
        .eq('staff_id', staff.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data && data.scores) {
        const cleanScores: Record<number, number> = {};
        Object.entries(data.scores).forEach(([id, val]) => {
          const numVal = Number(val);
          cleanScores[Number(id)] = numVal > 5 ? 5 : numVal;
        });
        setRatings(cleanScores);
        setComments(data.comments || '');
        setExistingEvalId(data.id);
      }
    };
    fetchOldEval();
  }, [staff.id]);

  const calculateTotalFrom5 = () => {
    let total = 0;
    criteria.forEach(c => {
      const rating = ratings[c.id] || 0;
      total += rating * c.weight;
    });
    return Number(total.toFixed(2));
  };

  const calculatePercentage = (totalFrom5: number) => {
    return Math.round((totalFrom5 / 5) * 100);
  };

  const getGradeInfo = (percentage: number) => {
    if (percentage >= 90) return { label: 'مثالي', color: 'text-emerald-600' };
    if (percentage >= 80) return { label: 'تخطى التوقعات', color: 'text-blue-600' };
    if (percentage >= 70) return { label: 'وافق التوقعات', color: 'text-amber-600' };
    if (percentage >= 60) return { label: 'بحاجة إلى تطوير', color: 'text-orange-600' };
    return { label: 'غير مرضي', color: 'text-red-600' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(ratings).length < criteria.length) {
      alert('الرجاء تعبئة كافة بنود التقييم قبل الحفظ');
      return;
    }
    
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const totalFrom5 = calculateTotalFrom5();
    const finalPercentage = calculatePercentage(totalFrom5);

    const payload: any = {
      staff_id: staff.id,
      evaluator_id: user?.id,
      scores: ratings,
      total_score: finalPercentage,
      comments
    };

    if (existingEvalId) payload.id = existingEvalId;

    const { error } = await supabase.from('evaluations').upsert(payload);

    if (error) {
      alert('خطأ أثناء الحفظ: ' + error.message);
    } else {
      alert('تم اعتماد التقييم بنجاح');
      onClose();
    }
    setSubmitting(false);
  };

  const totalFrom5 = calculateTotalFrom5();
  const percentage = calculatePercentage(totalFrom5);
  const grade = getGradeInfo(percentage);

  return (
    <div className="fixed inset-0 bg-[#0f4c4c]/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[1300px] h-[95vh] rounded-[4rem] overflow-hidden flex flex-col shadow-2xl border-4 border-white/20">
        
        {/* الهيدر العلوي */}
        <div className="bg-[#0f4c4c] p-10 text-white flex justify-between items-center relative border-b-8 border-[#00a18e]">
          <div className="flex items-center gap-8">
            <button onClick={onClose} className="p-5 bg-white/10 hover:bg-red-500 rounded-[2rem] transition-all group">
              <X className="w-8 h-8 group-hover:rotate-90 transition-transform" />
            </button>
            <div>
              <h2 className="text-3xl font-black">نموذج تقييم الأداء</h2>
              <p className="text-emerald-400 font-bold tracking-widest uppercase text-sm mt-1">{staff.full_name} — {staff.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="bg-black/30 px-10 py-4 rounded-[2.5rem] border border-white/10 text-center shadow-inner">
               <p className="text-[10px] font-black opacity-50 mb-1 uppercase tracking-tighter">الدرجة النهائية من 5</p>
               <span className="text-5xl font-black font-sans">{totalFrom5.toFixed(2)}</span>
            </div>
            <div className="bg-emerald-500 px-10 py-4 rounded-[2.5rem] text-center shadow-xl ring-4 ring-emerald-500/20">
               <p className="text-[10px] font-black text-emerald-900 mb-1 uppercase tracking-tighter">النسبة المئوية</p>
               <span className="text-5xl font-black font-sans text-white">{percentage}%</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-10 bg-slate-50/50">
            {/* قسم مجلدات الشواهد */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {staff.drive_link ? (
                <a href={staff.drive_link} target="_blank" rel="noreferrer" 
                   className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-[#0f4c4c] hover:shadow-md transition-all group">
                  <div className="bg-slate-100 p-3 rounded-2xl group-hover:bg-[#0f4c4c] group-hover:text-white transition-colors">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase">مجلد الشواهد الأساسي</p>
                    <p className="text-sm font-bold text-slate-700">فتح ملفات الموظف للمراجعة</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-300" />
                </a>
              ) : (
                <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-100 opacity-60">
                   <div className="bg-slate-200 p-3 rounded-2xl"><Folder className="w-6 h-6 text-slate-400" /></div>
                   <p className="text-xs font-bold text-slate-400 text-right">لا يوجد رابط مجلد أساسي</p>
                </div>
              )}

              {staff.drive_link_v2 ? (
                <a href={staff.drive_link_v2} target="_blank" rel="noreferrer" 
                   className="flex items-center gap-4 bg-emerald-50 p-5 rounded-3xl border-2 border-emerald-200 shadow-md hover:border-emerald-500 hover:shadow-lg transition-all group">
                  <div className="bg-emerald-500 p-3 rounded-2xl text-white">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center gap-2 justify-start flex-row-reverse">
                      <p className="text-[10px] font-black text-emerald-600 uppercase">ملف الشواهد المحدث (V2)</p>
                      <span className="bg-emerald-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black">جديد</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-900">الموظف قام بتحسين ملفه وإرساله</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-emerald-400" />
                </a>
              ) : null}
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
               <table className="w-full text-right">
                 <thead>
                   <tr className="bg-[#1a3a3a] text-white">
                     <th className="px-10 py-6 text-sm font-black">عنصر التقييم</th>
                     <th className="px-10 py-6 text-sm font-black text-center w-40">الوزن النسبي</th>
                     <th className="px-10 py-6 text-sm font-black text-center w-80">سلم التقدير (1-5)</th>
                   </tr>
                 </thead>
                 <tbody>
                   {criteria.map((c, idx) => (
                     <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                       <td className="px-10 py-6 text-sm font-bold text-slate-700 leading-relaxed">{c.text}</td>
                       <td className="px-10 py-6 text-center text-xs font-black text-[#0f4c4c] bg-[#0f4c4c]/5">{(c.weight * 100).toFixed(0)}%</td>
                       <td className="px-10 py-6">
                         <div className="flex justify-center gap-3" dir="ltr">
                           {[1, 2, 3, 4, 5].map((v) => (
                             <button
                               key={v}
                               type="button"
                               onClick={() => setRatings(prev => ({ ...prev, [c.id]: v }))}
                               className={`w-10 h-10 rounded-xl font-black text-sm transition-all shadow-sm ${
                                 ratings[c.id] === v
                                   ? 'bg-[#0f4c4c] text-white scale-110 shadow-lg'
                                   : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                               }`}
                             >
                               {v}
                             </button>
                           ))}
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>

          {/* الشريط الجانبي للملاحظات والإجراءات */}
          <div className="w-[400px] border-r border-slate-200 p-10 bg-white flex flex-col gap-8">
            <div className="flex-1 space-y-6">
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <h3 className="text-sm font-black text-[#0f4c4c] mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> توصيات المدير:
                </h3>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="اكتب ملاحظاتك وتوجيهاتك للموظف هنا..."
                  className="w-full h-48 p-4 bg-white border border-slate-200 rounded-2xl outline-none text-sm font-bold resize-none focus:border-[#0f4c4c]"
                />
              </div>

              <div className="bg-[#0f4c4c] p-6 rounded-[2rem] text-white">
                <div className="flex items-center gap-3 mb-2">
                   <Calculator className="w-4 h-4 text-emerald-400" />
                   <p className="text-xs font-black uppercase">التصنيف التقديري:</p>
                </div>
                <p className={`text-2xl font-black ${grade.color}`}>
                   {grade.label}
                </p>
                <p className="text-[10px] font-bold opacity-60 mt-1">يتم التقييم بناءً على الأوزان النسبية لكل معيار وربطها بسلم الـ 5 نقاط.</p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#00a18e] text-white py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-[#008f7e] transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              اعتماد وحفظ التقييم
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;
