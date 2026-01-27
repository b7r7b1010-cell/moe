
import React, { useState, useEffect } from 'react';
import { Profile, Evaluation, UserRole } from '../types';
import { CRITERIA_MAP } from '../constants';
import { supabase } from '../supabase';
import { 
  X, Save, ExternalLink, 
  Award, Lightbulb, Info, Sparkles, FileText
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
          const score = data.scores[c.id] || 0;
          if (score > 0) {
            oldRatings[c.id] = Math.round((score / c.weight) * 5);
          }
        });
        setRatings(oldRatings);
        setComments(data.comments || '');
        setExistingEvalId(data.id);
      }
    };
    fetchOldEval();
  }, [staff.id, criteria]);

  const calculateScoreForCriterion = (id: number, rating: number) => {
    const criterion = criteria.find(c => c.id === id);
    if (!criterion) return 0;
    return (rating / 5) * criterion.weight;
  };

  const calculateTotal = () => {
    let total = 0;
    Object.entries(ratings).forEach(([id, rating]) => {
      total += calculateScoreForCriterion(Number(id), rating as number);
    });
    return Math.min(100, Math.round(total));
  };

  const getGradeInfo = (score: number) => {
    let points = 1;
    let label = 'غير مرضي';
    let color = 'text-red-600';

    if (score >= 90) { points = 5; label = 'ممتاز'; color = 'text-emerald-600'; }
    else if (score >= 80) { points = 4; label = 'جيد جداً'; color = 'text-blue-600'; }
    else if (score >= 70) { points = 3; label = 'جيد'; color = 'text-amber-600'; }
    else if (score >= 60) { points = 2; label = 'مرضي'; color = 'text-orange-600'; }

    return { label, points, color };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(ratings).length < criteria.length) {
      alert('الرجاء تعبئة كافة بنود التقييم');
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const scores: Record<number, number> = {};
    Object.entries(ratings).forEach(([id, rating]) => {
      scores[Number(id)] = calculateScoreForCriterion(Number(id), rating as number);
    });

    const payload: any = {
      staff_id: staff.id,
      evaluator_id: user?.id,
      scores,
      total_score: calculateTotal(),
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

  const totalScore = calculateTotal();
  const grade = getGradeInfo(totalScore);

  return (
    <div className="fixed inset-0 bg-[#0f4c4c]/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[1300px] h-[92vh] rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl">
        
        <div className="bg-[#0f4c4c] p-8 text-white flex justify-between items-center border-b-4 border-[#00a18e]">
          <div className="flex items-center gap-8">
            <button onClick={onClose} className="p-4 bg-white/10 hover:bg-red-500 rounded-3xl transition-all">
              <X className="w-6 h-6" />
            </button>
            <div>
              <h2 className="text-2xl font-black">تقييم أداء: {staff.full_name}</h2>
              <p className="text-xs opacity-70 font-bold uppercase tracking-widest">{staff.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* عرض روابط الشواهد بشكل واضح */}
            {staff.drive_link && (
              <a href={staff.drive_link} target="_blank" className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-black transition-all">
                <FileText className="w-4 h-4" /> المجلد الأساسي
              </a>
            )}
            {staff.drive_link_v2 && (
              <a href={staff.drive_link_v2} target="_blank" className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-emerald-700 transition-all ring-4 ring-emerald-500/20">
                <Sparkles className="w-4 h-4" /> مجلد التحسين (المُراجَع)
              </a>
            )}
            <div className="bg-white/10 px-8 py-2 rounded-2xl border border-white/20">
               <span className="text-4xl font-black">{grade.points}</span>
               <span className="text-xs font-bold mr-2 opacity-50">/ 5</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-8 bg-slate-50">
            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-200">
               <table className="w-full text-right">
                 <thead>
                   <tr className="bg-[#1a3a3a] text-white">
                     <th className="px-8 py-5 text-sm font-black">المعيار الوظيفي</th>
                     <th className="px-8 py-5 text-sm font-black text-center w-32">الوزن</th>
                     <th className="px-8 py-5 text-sm font-black text-center w-80">الدرجة (1-5)</th>
                   </tr>
                 </thead>
                 <tbody>
                   {criteria.map((c, idx) => (
                     <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                       <td className="px-8 py-5 font-bold text-slate-700">{idx + 1}. {c.text}</td>
                       <td className="px-8 py-5 text-center font-black text-[#0f4c4c]">{c.weight}</td>
                       <td className="px-8 py-5">
                         <div className="flex justify-center gap-2" dir="ltr">
                           {[1, 2, 3, 4, 5].map((n) => (
                             <button key={n} type="button" onClick={() => setRatings({ ...ratings, [c.id]: n })} className={`w-10 h-10 rounded-xl font-black text-xs transition-all border-2 ${ratings[c.id] === n ? 'bg-[#0f4c4c] text-white border-[#0f4c4c] scale-110' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>
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

          <div className="w-[400px] bg-white border-r border-slate-200 p-10 flex flex-col gap-8 shadow-inner">
             <div className="text-center p-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100">
                <p className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">مؤشر النتيجة النهائية</p>
                <div className="text-7xl font-black text-[#0f4c4c] mb-2">{totalScore} <span className="text-xl opacity-30">%</span></div>
                <div className={`text-2xl font-black ${grade.color}`}>{grade.label}</div>
                <div className="mt-4 bg-[#0f4c4c] text-white inline-block px-6 py-1 rounded-full text-xs font-black">
                   النقاط: {grade.points} من 5
                </div>
             </div>

             <div className="space-y-4">
                <label className="font-black text-slate-600 text-sm flex items-center gap-2">
                   <Lightbulb className="w-5 h-5 text-emerald-500" /> التوصيات المهنية (تظهر للمعلم)
                </label>
                <textarea className="w-full p-6 rounded-[2rem] border-2 border-slate-100 focus:border-[#0f4c4c] outline-none h-48 resize-none bg-slate-50 text-sm font-bold shadow-inner" placeholder="اكتب ملاحظاتك التطويرية هنا..." value={comments} onChange={(e) => setComments(e.target.value)} />
             </div>

             <button onClick={handleSubmit} disabled={submitting} className="mt-auto w-full bg-[#0f4c4c] text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4">
                {submitting ? 'جاري الاعتماد...' : 'اعتماد وحفظ النتيجة'} <Save className="w-6 h-6" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;
