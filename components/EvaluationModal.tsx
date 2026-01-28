
import React, { useState, useEffect } from 'react';
import { Profile, Evaluation, UserRole } from '../types';
import { CRITERIA_MAP } from '../constants';
import { supabase } from '../supabase';
import { 
  X, Save, ExternalLink, 
  Award, Lightbulb, Info, Sparkles, FileText, Calculator
} from 'lucide-react';

interface Props {
  staff: Profile;
  onClose: () => void;
}

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
        const oldRatings: Record<number, number> = {};
        criteria.forEach(c => {
          const weightedScore = data.scores[c.id] || 0;
          if (weightedScore > 0) {
            // التقدير الخماسي = التقدير الموزون / الوزن النسبي العشري
            oldRatings[c.id] = Math.round(weightedScore / (c.weight * 5));
          }
        });
        setRatings(oldRatings);
        setComments(data.comments || '');
        setExistingEvalId(data.id);
      }
    };
    fetchOldEval();
  }, [staff.id, criteria]);

  // الخطوة 1: ضرب (التقييم × الوزن النسبي)
  const calculateScoreForCriterion = (id: number, rating: number) => {
    const criterion = criteria.find(c => c.id === id);
    if (!criterion) return 0;
    return rating * criterion.weight;
  };

  // الخطوة 2: جمع النتائج للحصول على الدرجة النهائية من 5
  const calculateTotalFrom5 = () => {
    let total = 0;
    Object.entries(ratings).forEach(([id, rating]) => {
      total += calculateScoreForCriterion(Number(id), rating as number);
    });
    return Number(total.toFixed(2));
  };

  // الخطوة 3: التحويل لنسبة مئوية (الدرجة ÷ 5 × 100)
  const calculatePercentage = (totalFrom5: number) => {
    return Math.round((totalFrom5 / 5) * 100);
  };

  const getGradeInfo = (percentage: number) => {
    let label = 'غير مرضي';
    let color = 'text-red-600';
    if (percentage >= 90) { label = 'مثالي'; color = 'text-emerald-600'; }
    else if (percentage >= 80) { label = 'تخطى التوقعات'; color = 'text-blue-600'; }
    else if (percentage >= 70) { label = 'وافق التوقعات'; color = 'text-amber-600'; }
    else if (percentage >= 60) { label = 'بحاجة إلى تطوير'; color = 'text-orange-600'; }
    return { label, color };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(ratings).length < criteria.length) {
      alert('الرجاء تعبئة كافة بنود التقييم');
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const totalFrom5 = calculateTotalFrom5();
    const finalPercentage = calculatePercentage(totalFrom5);

    // نخزن الدرجة النهائية كنسبة مئوية في قاعدة البيانات للتوافق مع التقارير
    const payload: any = {
      staff_id: staff.id,
      evaluator_id: user?.id,
      scores: ratings, // نخزن التقديرات الخام (1-5)
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
        
        {/* هيدر التقييم */}
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
          {/* جدول العناصر */}
          <div className="flex-1 overflow-auto p-10 bg-slate-50/50">
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
                     <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                       <td className="px-10 py-6">
                         <div className="flex items-center gap-4">
                            <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-400">{idx + 1}</span>
                            <span className="font-bold text-slate-700">{c.text}</span>
                         </div>
                       </td>
                       <td className="px-10 py-6 text-center">
                          <span className="bg-[#0f4c4c]/5 text-[#0f4c4c] px-4 py-1.5 rounded-full font-black text-sm font-sans">
                            {(c.weight * 100).toFixed(0)}%
                          </span>
                       </td>
                       <td className="px-10 py-6">
                         <div className="flex justify-center gap-2" dir="ltr">
                           {[1, 2, 3, 4, 5].map((n) => (
                             <button key={n} type="button" onClick={() => setRatings({ ...ratings, [c.id]: n })} className={`w-12 h-12 rounded-2xl font-black text-lg transition-all border-2 ${ratings[c.id] === n ? 'bg-[#0f4c4c] text-white border-[#0f4c4c] scale-110 shadow-lg' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>
                               {n}
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

          {/* عمود الملاحظات والحفظ */}
          <div className="w-[450px] bg-white border-r border-slate-100 p-12 flex flex-col gap-10 shadow-2xl">
             <div className={`text-center p-10 rounded-[3.5rem] border-4 transition-colors ${percentage >= 60 ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                <Calculator className={`w-12 h-12 mx-auto mb-4 ${grade.color}`} />
                <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">التقدير العام للأداء</p>
                <div className={`text-4xl font-black mb-2 ${grade.color}`}>{grade.label}</div>
                <p className="text-[10px] font-bold text-slate-400 italic">بناءً على جمع النتائج الموزونة</p>
             </div>

             <div className="space-y-4">
                <label className="font-black text-slate-600 text-sm flex items-center gap-2">
                   <Lightbulb className="w-6 h-6 text-amber-500" /> التوصيات والملاحظات
                </label>
                <textarea className="w-full p-8 rounded-[2.5rem] border-2 border-slate-100 focus:border-[#0f4c4c] outline-none h-56 resize-none bg-slate-50/50 text-sm font-bold shadow-inner" placeholder="اكتب توصياتك المهنية للموظف..." value={comments} onChange={(e) => setComments(e.target.value)} />
             </div>

             <button onClick={handleSubmit} disabled={submitting} className="mt-auto w-full bg-[#0f4c4c] text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4 active:scale-95">
                {submitting ? 'جاري الاعتماد...' : 'حفظ واعتـماد التقييم'} <Save className="w-8 h-8" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;
