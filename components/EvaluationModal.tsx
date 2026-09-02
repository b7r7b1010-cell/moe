import React, { useState, useEffect } from 'react';
import { Profile, Evaluation, UserRole, EvaluationPeriod } from '../types';
import { CRITERIA_MAP } from '../constants';
import { supabase } from '../supabase';
import { 
  X, Save, ExternalLink, 
  Award, Lightbulb, Info, Sparkles, FileText, Calculator, Folder, 
  CheckCircle2, Loader2, Clock, Target, HelpCircle, Check
} from 'lucide-react';

interface Props {
  staff: Profile;
  initialPeriod?: EvaluationPeriod;
  onClose: () => void;
}

const EvaluationModal: React.FC<Props> = ({ staff, initialPeriod = 'midterm', onClose }) => {
  const [period, setPeriod] = useState<EvaluationPeriod>(initialPeriod);
  const criteria = CRITERIA_MAP[staff.role] || CRITERIA_MAP[UserRole.TEACHER] || [];
  
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [comments, setComments] = useState('');
  const [idpNotes, setIdpNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingEvalId, setExistingEvalId] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  useEffect(() => {
    fetchEvaluationForPeriod(period);
  }, [staff.id, period]);

  const fetchEvaluationForPeriod = async (targetPeriod: EvaluationPeriod) => {
    // Reset state for selected period
    setRatings({});
    setComments('');
    setIdpNotes('');
    setExistingEvalId(null);

    const { data } = await supabase
      .from('evaluations')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('period', targetPeriod)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      if (data.scores) {
        const cleanScores: Record<number, number> = {};
        Object.entries(data.scores).forEach(([id, val]) => {
          const numVal = Number(val);
          cleanScores[Number(id)] = numVal > 5 ? 5 : numVal;
        });
        setRatings(cleanScores);
      }
      setComments(data.comments || '');
      setIdpNotes(data.idp_notes || '');
      setExistingEvalId(data.id);
    } else if (targetPeriod === 'midterm') {
      // Fallback: check if there's an evaluation without period field
      const { data: fallbackData } = await supabase
        .from('evaluations')
        .select('*')
        .eq('staff_id', staff.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackData && !fallbackData.period) {
        if (fallbackData.scores) {
          const cleanScores: Record<number, number> = {};
          Object.entries(fallbackData.scores).forEach(([id, val]) => {
            cleanScores[Number(id)] = Number(val);
          });
          setRatings(cleanScores);
        }
        setComments(fallbackData.comments || '');
        setExistingEvalId(fallbackData.id);
      }
    }
  };

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
    if (percentage >= 90) return { label: 'مثالي', color: 'text-emerald-600', points: 5 };
    if (percentage >= 80) return { label: 'تخطى التوقعات', color: 'text-blue-600', points: 4 };
    if (percentage >= 70) return { label: 'وافق التوقعات', color: 'text-amber-600', points: 3 };
    if (percentage >= 60) return { label: 'بحاجة إلى تطوير', color: 'text-orange-600', points: 2 };
    return { label: 'غير مرضي', color: 'text-red-600', points: 1 };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(ratings).length < criteria.length) {
      alert('الرجاء تعبئة كافة بنود التقييم (' + criteria.length + ' عناصر) قبل الحفظ');
      return;
    }
    
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const totalFrom5 = calculateTotalFrom5();
    const finalPercentage = calculatePercentage(totalFrom5);

    const payload: any = {
      staff_id: staff.id,
      evaluator_id: user?.id || 'principal',
      period: period,
      scores: ratings,
      total_score: finalPercentage,
      comments: comments.trim(),
      idp_notes: idpNotes.trim()
    };

    if (existingEvalId) payload.id = existingEvalId;

    const { error } = await supabase.from('evaluations').upsert(payload);

    if (error) {
      alert('خطأ أثناء الحفظ: ' + error.message);
    } else {
      alert(`✅ تم اعتماد وحفظ ${period === 'midterm' ? 'المراجعة النصف سنوية' : 'التقييم النهائي'} بنجاح!`);
      onClose();
    }
    setSubmitting(false);
  };

  const totalFrom5 = calculateTotalFrom5();
  const percentage = calculatePercentage(totalFrom5);
  const grade = getGradeInfo(percentage);

  // Identify any gap criteria (rating < 3)
  const gapCriteria = criteria.filter(c => (ratings[c.id] || 0) > 0 && (ratings[c.id] || 0) < 3);

  return (
    <div className="fixed inset-0 bg-[#0f4c4c]/90 backdrop-blur-md z-[100] flex items-center justify-center p-3 md:p-6 font-cairo text-right" dir="rtl">
      <div className="bg-white w-full max-w-[1350px] h-[95vh] rounded-[3rem] overflow-hidden flex flex-col shadow-2xl border-2 border-white/20">
        
        {/* الترويسة الرئيسية للنافذة */}
        <div className="bg-[#0f4c4c] p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-[#00a18e]">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="p-3.5 bg-white/10 hover:bg-red-500 rounded-2xl transition-all group"
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black">رصد الأداء الوظيفي</h2>
                <span className="bg-emerald-500 text-white text-[11px] font-black px-3 py-0.5 rounded-full">
                  {staff.role}
                </span>
              </div>
              <p className="text-emerald-300 font-bold text-xs mt-1">
                الموظف: {staff.full_name} {staff.subject ? `• تخصص: ${staff.subject}` : ''} | جوال: {staff.mobile}
              </p>
            </div>
          </div>

          {/* تبديل الفترة ومؤشرات الدرجة */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex bg-black/30 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setPeriod('midterm')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  period === 'midterm' ? 'bg-emerald-500 text-white shadow-md' : 'text-white/70 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                المراجعة نصف السنوية
              </button>
              <button
                type="button"
                onClick={() => setPeriod('final')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  period === 'final' ? 'bg-[#00a18e] text-white shadow-md' : 'text-white/70 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                التقييم النهائي
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-black/30 px-5 py-2.5 rounded-2xl border border-white/10 text-center">
                <p className="text-[9px] font-black opacity-60 uppercase">الدرجة الموزونة</p>
                <span className="text-2xl font-black font-sans text-white">{totalFrom5.toFixed(2)} <span className="text-xs opacity-60">/ 5</span></span>
              </div>
              <div className="bg-emerald-600 px-5 py-2.5 rounded-2xl text-center shadow-lg">
                <p className="text-[9px] font-black text-emerald-200 uppercase">النسبة</p>
                <span className="text-2xl font-black font-sans text-white">{percentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* جسم النافذة الرئيسي */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* جدول المعايير وسلالم التقدير */}
          <div className="flex-1 overflow-auto p-6 md:p-8 bg-slate-50">
            
            {/* بطاقات روابط الشواهد */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {staff.drive_link ? (
                <a 
                  href={staff.drive_link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-[#0f4c4c] hover:shadow-md transition-all group"
                >
                  <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl group-hover:bg-[#0f4c4c] group-hover:text-white transition-colors">
                    <Folder className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[10px] font-black text-slate-400">مجلد شواهد التقييم النصفي</p>
                    <p className="text-xs font-bold text-slate-700">فتح ملفات الموظف للمعاينة</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#0f4c4c]" />
                </a>
              ) : (
                <div className="flex items-center gap-3 bg-slate-100 p-4 rounded-2xl border border-slate-200 text-slate-400">
                  <Folder className="w-5 h-5 text-slate-400" />
                  <p className="text-xs font-bold">لم يتم إضافة رابط المجلد النصفي بعد</p>
                </div>
              )}

              {staff.drive_link_v2 ? (
                <a 
                  href={staff.drive_link_v2} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-300 shadow-sm hover:border-emerald-600 transition-all group"
                >
                  <div className="bg-emerald-600 text-white p-2.5 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-right">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-emerald-800">مجلد الشواهد النهائي (V2)</p>
                      <span className="bg-emerald-600 text-white text-[8px] px-2 py-0.5 rounded-full font-bold">محدث</span>
                    </div>
                    <p className="text-xs font-bold text-emerald-950">فتح مجلد التقييم النهائي</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                </a>
              ) : (
                <div className="flex items-center gap-3 bg-slate-100 p-4 rounded-2xl border border-slate-200 text-slate-400">
                  <Sparkles className="w-5 h-5 text-slate-400" />
                  <p className="text-xs font-bold">لم يرفع ملف الشواهد النهائي بعد</p>
                </div>
              )}
            </div>

            {/* جدول رصد المعايير */}
            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-slate-200">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-[#0f4c4c] text-white text-xs font-black">
                    <th className="px-6 py-4 w-12 text-center">م</th>
                    <th className="px-6 py-4">عنصر ومعيار التقييم</th>
                    <th className="px-4 py-4 text-center w-28">الوزن النسبي</th>
                    <th className="px-6 py-4 text-center w-72">سلم التقدير (1 إلى 5)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {criteria.map((c, idx) => {
                    const currentRating = ratings[c.id];
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center font-black text-slate-400">{idx + 1}</td>
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800 text-sm">{c.text}</p>
                          {c.explanation && (
                            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">{c.explanation}</p>
                          )}
                          {/* عرض الوصف السلوكي للمستوى المحدد حالياً */}
                          {currentRating && c.levels?.[currentRating] && (
                            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] text-emerald-900 font-bold flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>مستوى {currentRating}: {c.levels[currentRating]}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center font-black text-[#0f4c4c] bg-[#0f4c4c]/5 font-sans text-sm">
                          {(c.weight * 100).toFixed(0)}%
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2" dir="ltr">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setRatings(prev => ({ ...prev, [c.id]: val }))}
                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center ${
                                  ratings[c.id] === val
                                    ? 'bg-[#0f4c4c] text-white scale-110 shadow-lg ring-2 ring-emerald-400'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                                title={c.levels?.[val] || `المستوى ${val}`}
                              >
                                {val}
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
          </div>

          {/* اللوحة الجانبية: التوصيات، خطة التطوير (IDP)، والحفظ */}
          <div className="w-full lg:w-[420px] border-r border-slate-200 p-6 md:p-8 bg-white flex flex-col justify-between gap-6 overflow-y-auto">
            <div className="space-y-6">
              
              {/* بطاقة التقدير المحسوب */}
              <div className="bg-[#0f4c4c] p-6 rounded-3xl text-white shadow-md">
                <div className="flex items-center gap-2 mb-2 text-emerald-400">
                  <Calculator className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">التقدير العام لأداء الموظف</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-black">{grade.label}</span>
                  <span className="text-lg font-sans font-bold opacity-80">{percentage}%</span>
                </div>
                <p className="text-[10px] text-white/70 font-medium mt-2 leading-relaxed">
                  احتساب إلكتروني فوري بضرب تقدير كل عنصر في وزنه النسبي المعتمد بالدليل.
                </p>
              </div>

              {/* توصيات المدير */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <label className="text-xs font-black text-slate-800 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  توصيات وملاحظات مدير المدرسة:
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="اكتب التوجيهات والتوصيات للموظف لتعزيز جوانب القوة ودعم الأداء..."
                  className="w-full h-28 p-3 bg-white border border-slate-200 rounded-xl outline-none text-xs font-bold resize-none focus:border-[#0f4c4c]"
                />
              </div>

              {/* خطة التطوير الفردية وسد الفجوات (IDP) */}
              {period === 'midterm' && (
                <div className="bg-amber-50/70 p-5 rounded-2xl border border-amber-200">
                  <label className="text-xs font-black text-amber-900 mb-1 flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-700" />
                    خطة سد الفجوات والتطوير الفردي (IDP):
                  </label>
                  <p className="text-[10px] text-amber-800 font-medium mb-2">
                    {gapCriteria.length > 0 
                      ? `تم رصد (${gapCriteria.length}) معايير أقل من 3، يرجى كتابة التوجيهات الإجرائية.` 
                      : 'توجيهات التطوير المستمر المهني وفق منهجية 10-20-70.'}
                  </p>
                  <textarea
                    value={idpNotes}
                    onChange={(e) => setIdpNotes(e.target.value)}
                    placeholder="حدد الخطوات الإجرائية، برامج التطوير المهني، أو التدريب على رأس العمل المطلوب..."
                    className="w-full h-24 p-3 bg-white border border-amber-200 rounded-xl outline-none text-xs font-bold resize-none focus:border-amber-600"
                  />
                </div>
              )}

            </div>

            {/* زر الحفظ والاعتماد */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#00a18e] hover:bg-[#008f7e] text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              اعتماد {period === 'midterm' ? 'المراجعة النصف سنوية' : 'التقييم النهائي'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;
