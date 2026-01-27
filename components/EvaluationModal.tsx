
import React, { useState, useEffect } from 'react';
import { Profile, Evaluation, UserRole } from '../types';
import { CRITERIA_MAP } from '../constants';
import { supabase } from '../supabase';
import { 
  X, Save, ExternalLink, 
  Award, Lightbulb, Info
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
    return Math.min(100, Math.round(total * 10) / 10);
  };

  const getGradeInfo = (score: number) => {
    const ratingFromFive = (score / 20).toFixed(1);
    if (score >= 90) return { label: 'ممتاز', rating: `${ratingFromFive}/5`, color: 'text-emerald-600', bg: 'bg-emerald-600', desc: 'أداء يفوق التوقعات بشكل استثنائي.' };
    if (score >= 80) return { label: 'جيد جداً', rating: `${ratingFromFive}/5`, color: 'text-blue-600', bg: 'bg-blue-600', desc: 'أداء يتجاوز التوقعات في معظم الأحيان.' };
    if (score >= 70) return { label: 'جيد', rating: `${ratingFromFive}/5`, color: 'text-amber-600', bg: 'bg-amber-600', desc: 'أداء يلبي التوقعات المطلوبة.' };
    if (score >= 60) return { label: 'مرضي', rating: `${ratingFromFive}/5`, color: 'text-orange-600', bg: 'bg-orange-600', desc: 'أداء أقل من التوقعات، يحتاج إلى تحسين.' };
    return { label: 'غير مرضي', rating: `${ratingFromFive}/5`, color: 'text-red-600', bg: 'bg-red-600', desc: 'أداء ضعيف جداً ولا يلبي المعايير الدنيا.' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(ratings).length < criteria.length) {
      alert('الرجاء تعبئة كافة بنود التقييم قبل الحفظ');
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
    <div className="fixed inset-0 bg-[#0f4c4c]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[1300px] max-h-[92vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl">
        
        <div className="bg-[#0f4c4c] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
              <X className="w-6 h-6" />
            </button>
            <div className="text-right">
              <h2 className="text-xl font-black">نموذج تقييم أداء {staff.role}</h2>
              <p className="text-xs opacity-70 font-bold">{staff.full_name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {staff.drive_link && (
              <a href={staff.drive_link} target="_blank" className="bg-[#00a18e] text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:scale-105 transition-all">
                <ExternalLink className="w-4 h-4" /> فحص الشواهد
              </a>
            )}
            <div className="bg-white/10 px-6 py-2 rounded-2xl border border-white/20">
               <span className="text-xs font-bold ml-2">إجمالي الأداء:</span>
               <span className="text-xl font-black">{totalScore}%</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className="flex-1 overflow-auto bg-slate-50">
            <table className="w-full text-right border-collapse">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-[#1a3a3a] text-white">
                  <th className="px-6 py-4 text-sm font-black border-l border-white/10">عناصر التقييم</th>
                  <th className="px-6 py-4 text-sm font-black border-l border-white/10 w-32 text-center">الوزن النسبي</th>
                  <th className="px-6 py-4 text-sm font-black w-72 text-center">سلم التقدير (1-5)</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c, idx) => {
                  const isLightRow = idx < 3 || (staff.role === UserRole.TEACHER && idx < 3);
                  const rowBg = isLightRow ? 'bg-[#e0f2f1]' : 'bg-white';
                  const rating = ratings[c.id];

                  return (
                    <tr key={c.id} className={`${rowBg} border-b border-slate-100 transition-colors hover:bg-slate-100/50`}>
                      <td className="px-6 py-5 font-bold text-slate-700 text-sm leading-snug">
                        {idx + 1}. {c.text}
                      </td>
                      <td className="px-6 py-5 text-center font-black text-[#0f4c4c] text-sm">
                        %{c.weight}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2" dir="ltr">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setRatings({ ...ratings, [c.id]: num })}
                              className={`w-10 h-10 rounded-xl font-black text-xs transition-all border-2 flex items-center justify-center
                                ${rating === num 
                                  ? 'bg-[#0f4c4c] text-white border-[#0f4c4c] scale-110 shadow-lg shadow-teal-900/20' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-[#0f4c4c] hover:text-[#0f4c4c]'}`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="w-full md:w-96 bg-white border-r border-slate-100 p-8 flex flex-col gap-6 shadow-inner overflow-auto">
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-[#0f4c4c]">
                 <Award className="w-6 h-6" />
                 <h3 className="font-black text-lg">التقدير العام للأداء</h3>
              </div>
              
              <div className={`p-6 rounded-[2rem] bg-slate-50 border-2 border-slate-100 flex flex-col items-center gap-4 text-center`}>
                <div className="relative w-24 h-24 flex items-center justify-center">
                   <svg className="w-full h-full -rotate-90">
                      <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                      <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * totalScore) / 100} className={`${grade.color.replace('text-', 'stroke-')} transition-all duration-1000`} strokeLinecap="round" />
                   </svg>
                   <span className={`absolute inset-0 flex flex-col items-center justify-center text-[#0f4c4c]`}>
                      <span className="text-2xl font-black">{totalScore}</span>
                      <span className="text-[10px] font-bold opacity-40">%</span>
                   </span>
                </div>
                <div>
                   <h4 className={`text-xl font-black ${grade.color}`}>{grade.label}</h4>
                   <p className="text-slate-400 text-[10px] font-bold mt-1 tracking-widest uppercase">{grade.rating}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 leading-relaxed italic">
                   "{grade.desc}"
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <label className="flex items-center gap-3 font-black text-slate-600 text-sm">
                  <Lightbulb className="w-5 h-5 text-[#0f4c4c]" /> التوجيهات والتوصيات
               </label>
               <textarea
                 className="w-full px-6 py-4 rounded-2xl border border-slate-200 focus:border-[#0f4c4c] outline-none h-44 resize-none bg-slate-50 text-xs shadow-inner transition-all font-bold"
                 placeholder="اكتب توجيهاتك الفنية للموظف..."
                 value={comments}
                 onChange={(e) => setComments(e.target.value)}
               ></textarea>
            </div>

            <div className="bg-[#0f4c4c]/5 p-4 rounded-2xl border border-[#0f4c4c]/10 flex items-start gap-3">
               <Info className="w-4 h-4 text-[#0f4c4c] mt-0.5" />
               <p className="text-[9px] text-[#0f4c4c] font-black leading-relaxed">
                  سيتم عرض التقدير والوصف الوظيفي للمعلم في لوحته الرقمية فور الاعتماد.
               </p>
            </div>
          </div>
        </div>

        <div className="p-8 border-t bg-white flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full md:w-auto bg-[#0f4c4c] text-white px-20 py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-[#0d3d3d] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
          >
            {submitting ? 'جاري الاعتماد...' : 'اعتماد التقييم النهائي'}
            {!submitting && <Save className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;
