
import React, { useState, useEffect } from 'react';
import { Profile, Evaluation } from '../types';
import { CRITERIA_MAP } from '../constants';
import { supabase } from '../supabase';
import { 
  X, Save, AlertCircle, ExternalLink, 
  FileText, Star, ClipboardCheck, LayoutList,
  CheckCircle2, Info
} from 'lucide-react';

interface Props {
  staff: Profile;
  onClose: () => void;
}

const EvaluationModal: React.FC<Props> = ({ staff, onClose }) => {
  const criteria = CRITERIA_MAP[staff.role] || [];
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // جلب التقييم القديم إن وجد للتعديل
  useEffect(() => {
    const fetchOldEval = async () => {
      const { data } = await supabase
        .from('evaluations')
        .select('*')
        .eq('staff_id', staff.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setScores(data.scores);
        setComments(data.comments || '');
      }
    };
    fetchOldEval();
  }, [staff.id]);

  const calculateTotal = () => {
    const weightedSum = criteria.reduce((sum, c) => {
      const score = scores[c.id] || 0;
      return sum + (score * (c.weight / 100));
    }, 0);
    return Math.round(weightedSum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(scores).length < criteria.length) {
      alert('الرجاء تعبئة درجات جميع المعايير قبل الاعتماد');
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // استخدام upsert بدلاً من insert لتمكين تحديث التقييم
    const { error } = await supabase.from('evaluations').upsert({
      staff_id: staff.id,
      evaluator_id: user?.id,
      scores,
      total_score: calculateTotal(),
      comments
    }, { onConflict: 'staff_id' });

    if (error) alert(error.message);
    else {
      alert('تم رصد واعتماد التقييم بنجاح');
      onClose();
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-[#0f4c4c]/40 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-[3.5rem] overflow-hidden flex flex-col shadow-[0_50px_100px_-20px_rgba(15,76,76,0.3)] border border-white/20">
        
        {/* Header with Unified Controls */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-6">
          <div className="text-right flex items-center gap-5">
             <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-slate-100">
                <Star className="w-8 h-8 text-[#0f4c4c]" />
             </div>
             <div>
                <h2 className="text-2xl font-black text-slate-800">تقييم أداء: {staff.full_name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="bg-[#0f4c4c] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">{staff.role}</span>
                  <span className="text-slate-400 text-[10px] font-bold">معايير الدليل الإجرائي المعتمد</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {staff.drive_link ? (
              <a 
                href={staff.drive_link} 
                target="_blank" 
                className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl shadow-emerald-900/10 hover:bg-emerald-700 hover:scale-105 transition-all"
              >
                <ExternalLink className="w-5 h-5" /> فحص ملفات الشواهد
              </a>
            ) : (
              <div className="flex-1 md:flex-none flex items-center gap-3 bg-amber-50 text-amber-700 px-6 py-4 rounded-2xl border border-amber-200 text-[10px] font-black">
                <AlertCircle className="w-5 h-5 animate-pulse" /> الموظف لم يرفع شواهده الرقمية
              </div>
            )}
            <button onClick={onClose} className="p-4 bg-white text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-slate-200">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-10 bg-slate-50/30">
          <div className="max-w-5xl mx-auto space-y-10">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criteria.map((c, idx) => (
                <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-[#0f4c4c]/30 hover:shadow-lg transition-all group flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="bg-slate-100 text-slate-500 w-10 h-10 flex items-center justify-center rounded-2xl text-[10px] font-black shrink-0 group-hover:bg-[#0f4c4c] group-hover:text-white transition-colors">
                      {idx + 1}
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-700 font-bold text-xs leading-relaxed">{c.text}</p>
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-black text-slate-300 uppercase">الوزن النسبي: {c.weight}%</span>
                         <div className="h-1 w-1 bg-slate-200 rounded-full"></div>
                         <span className="text-[9px] font-black text-emerald-500">الحد الأقصى: 100</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 group-focus-within:border-[#0f4c4c]/20 transition-all">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="رصد الدرجة..."
                      className="w-full px-5 py-3 text-center font-black text-lg text-[#0f4c4c] bg-transparent outline-none font-sans"
                      value={scores[c.id] || ''}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setScores({ ...scores, [c.id]: val });
                      }}
                    />
                    <div className="pr-4 border-r border-slate-200">
                       <ClipboardCheck className={`w-6 h-6 ${scores[c.id] ? 'text-emerald-500' : 'text-slate-300'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 font-black text-slate-600 text-xs px-4">
                <FileText className="w-5 h-5 text-[#0f4c4c]" /> مرئيات القيادة المدرسية والتوصيات التربوية:
              </label>
              <textarea
                className="w-full px-8 py-6 rounded-[2.5rem] border border-slate-200 focus:border-[#0f4c4c] outline-none h-44 resize-none bg-white text-sm shadow-inner transition-all leading-relaxed font-bold"
                placeholder="يرجى كتابة ملاحظاتك حول نقاط القوة وفرص التحسين للموظف..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Footer Score Summary */}
        <div className="p-8 border-t bg-white flex flex-col md:flex-row justify-between items-center gap-8 no-print">
          <div className="flex items-center gap-6">
             <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90">
                   <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                   <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={220} strokeDashoffset={220 - (220 * calculateTotal()) / 100} className="text-[#0f4c4c] transition-all duration-1000" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-[#0f4c4c] font-sans">
                   {calculateTotal()}
                </div>
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي درجة الأداء الحالية</p>
                <div className="flex items-center gap-3">
                   <h4 className="text-2xl font-black text-slate-800">
                     {calculateTotal() >= 90 ? 'ممتاز جداً' : calculateTotal() >= 80 ? 'جيد جداً' : calculateTotal() >= 70 ? 'جيد' : 'مرضي'}
                   </h4>
                   <div className="p-1 bg-emerald-50 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
                </div>
             </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full md:w-auto bg-[#0f4c4c] text-white px-16 py-5 rounded-[2rem] font-black text-base shadow-[0_20px_40px_-10px_rgba(15,76,76,0.3)] hover:bg-[#0d3d3d] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
          >
            {submitting ? 'جاري الاعتماد...' : 'اعتماد التقييم النهائي وحفظ البيانات'}
            {!submitting && <Save className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluationModal;
