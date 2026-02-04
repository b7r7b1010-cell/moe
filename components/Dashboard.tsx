import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Profile, Evaluation } from '../types';
import { 
  LogOut, ExternalLink, ShieldAlert, 
  Link as LinkIcon, CheckCircle2, 
  Lock, ShieldCheck, Info, Sparkles, Send, Lightbulb,
  FileSpreadsheet, FileText, LayoutDashboard, SendHorizontal, Unlock,
  MessageSquare, UserCircle, Palette, PhoneCall, Laptop // تم إضافة Laptop هنا
} from 'lucide-react';

const Dashboard: React.FC<{ userProfile: Profile, onLogout: () => void }> = ({ userProfile, onLogout }) => {
  const [driveLink, setDriveLink] = useState(userProfile.drive_link || '');
  const [driveLinkV2, setDriveLinkV2] = useState(userProfile.drive_link_v2 || '');
  const [saving, setSaving] = useState(false);
  const [lastEval, setLastEval] = useState<Evaluation | null>(null);
  const [isReady, setIsReady] = useState(userProfile.is_ready_for_eval || false);

  useEffect(() => {
    fetchLatestEvaluation();
  }, []);

  const fetchLatestEvaluation = async () => {
    const { data: evalData } = await supabase
      .from('evaluations')
      .select('*')
      .eq('staff_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (evalData) setLastEval(evalData);
  };

  const getGradeInfo = (score: number) => {
    if (score >= 90) return { label: 'مثالي', points: 5, color: 'text-emerald-600' };
    if (score >= 80) return { label: 'تخطى التوقعات', points: 4, color: 'text-blue-600' };
    if (score >= 70) return { label: 'وافق التوقعات', points: 3, color: 'text-amber-600' };
    if (score >= 60) return { label: 'بحاجة إلى تطوير', points: 2, color: 'text-orange-600' };
    return { label: 'غير مرضي', points: 1, color: 'text-red-600' };
  };

  const handleUpdateLink = async (isV2: boolean) => {
    setSaving(true);
    const updateData = isV2 ? { drive_link_v2: driveLinkV2 } : { drive_link: driveLink };
    const { error } = await supabase.from('profiles').update(updateData).eq('id', userProfile.id);
    if (error) alert(error.message);
    else {
      alert('✅ تم تحديث الرابط بنجاح');
      fetchLatestEvaluation();
    }
    setSaving(false);
  };

  const handleFinalSubmit = async () => {
    if (!driveLink) {
      alert('الرجاء إضافة رابط المجلد أولاً قبل الإرسال');
      return;
    }
    if (!confirm('هل أنت متأكد من اكتمال ملف الشواهد؟ سيتم إرسال تنبيه فوري للمدير بجاهزية ملفك للتقييم.')) return;
    
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ is_ready_for_eval: true }).eq('id', userProfile.id);
    if (error) {
      alert('حدث خطأ أثناء الإرسال: ' + error.message);
    } else {
      setIsReady(true);
      alert('✅ تم الإرسال بنجاح! تم إشعار مدير المدرسة بجاهزية ملفك.');
    }
    setSaving(false);
  };

  const grade = lastEval ? getGradeInfo(lastEval.total_score) : null;
  const isEvaluated = !!lastEval;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10 font-cairo text-right" dir="rtl">
      <header className="bg-[#0f4c4c] text-white pt-8 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
           <div className="text-right space-y-0.5 order-2 md:order-1 flex-1">
              <p className="text-[10px] md:text-xs font-bold opacity-90">المملكة العربية السعودية</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">وزارة التعليم</p>
              <p className="text-[10px] md:text-xs font-bold opacity-90">الإدارة العامة للتعليم بمحافظة جدة</p>
              <p className="text-sm md:text-lg font-black mt-2 text-[#00a18e] border-r-4 border-[#00a18e] pr-3">ثانوية الأمير عبدالمجيد الأولى</p>
           </div>
           <div className="order-1 md:order-2 flex-shrink-0">
              <img src="https://up6.cc/2026/01/176840436497671.png" className="h-24 md:h-32 object-contain drop-shadow-2xl" alt="Logo" />
           </div>
           <div className="flex flex-col items-center md:items-end gap-2 order-3 flex-1">
              <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-center md:text-right">
                <p className="text-[10px] opacity-70 font-bold">مرحباً بك،</p>
                <p className="text-sm font-black">{userProfile.full_name}</p>
              </div>
              <button onClick={onLogout} className="text-red-300 hover:text-red-100 text-[10px] font-bold flex items-center gap-1 transition-colors group">
                <LogOut className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> تسجيل الخروج
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 -mt-10 space-y-6 relative z-20">
        
        {/* المنصة الخارجية والتعليمات */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
             <a href="dapper-sprinkles-8afd3c.netlify.app" target="_blank" rel="noreferrer" 
                className="group h-full bg-[#00a18e] hover:bg-[#008f7e] rounded-[2.5rem] p-8 shadow-xl transition-all flex flex-col items-center justify-center text-center text-white border-4 border-white">
                <div className="bg-white p-4 rounded-2xl mb-4 group-hover:rotate-12 transition-transform shadow-lg">
                   <LayoutDashboard className="w-8 h-8 text-[#00a18e]" />
                </div>
                <h3 className="text-xl font-black mb-1">المنصة الخارجية</h3>
                <p className="text-xs font-bold opacity-80 mb-4">لإعداد تقاريرك المهنية بسهولة</p>
                <div className="bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2">دخول المنصة <ExternalLink className="w-3 h-3" /></div>
             </a>
          </div>
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 flex flex-col justify-center">
             <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
               <Info className="w-5 h-5 text-[#0f4c4c]" /> آلية العمل الصحيحة:
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {[
                 { t: 'تعبئة البيانات بالمنصة الخارجية.', i: FileText },
                 { t: 'حفظ التقرير بصيغة PDF.', i: FileSpreadsheet },
                 { t: 'رفعه لمجلد Google Drive الخاص بك.', i: LinkIcon }
               ].map((s, idx) => (
                 <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                   <span className="w-7 h-7 bg-[#0f4c4c] text-white rounded-full flex items-center justify-center text-xs font-black">{idx + 1}</span>
                   <p className="text-xs font-bold text-slate-600 leading-tight">{s.t}</p>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* 1. التقييم (أولاً) */}
        {lastEval && (
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border-2 border-[#0f4c4c]/5 flex flex-col md:flex-row items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full -rotate-90">
                   <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                   <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * lastEval.total_score) / 100} className={`${grade?.color.replace('text-', 'stroke-')} transition-all duration-1000`} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                   <span className="text-2xl font-black text-[#0f4c4c]">{(lastEval.total_score / 20).toFixed(2)}</span>
                   <span className="text-[8px] font-bold text-slate-400">من 5</span>
                </div>
             </div>
             <div className="flex-1 text-center md:text-right">
                <div className="flex items-center gap-3 mb-1 justify-center md:justify-start">
                   <h2 className={`text-xl font-black ${grade?.color}`}>مستوى الأداء: {grade?.label} ({grade?.points} من 5)</h2>
                   <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500">{lastEval.total_score}%</span>
                </div>
                <p className="text-xs text-slate-500 font-bold">تم اعتماد تقييم أدائكم الوظيفي بناءً على الشواهد المرفقة والممارسات المهنية.</p>
             </div>
             <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 text-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-[10px] font-black text-emerald-800">الاعتماد: نهائي</p>
             </div>
          </div>
        )}

        {/* 2. توصيات المدير (ثانياً - تحت التقييم مباشرة) */}
        {lastEval && (
          <div className="bg-[#0f4c4c] p-6 rounded-[2.5rem] text-white shadow-xl flex items-center gap-5 border-4 border-white/5 animate-in zoom-in-95 duration-500">
             <div className="bg-white/10 p-3 rounded-2xl flex-shrink-0">
                <Lightbulb className="w-6 h-6 text-emerald-400" />
             </div>
             <div className="flex-1">
                <p className="text-[10px] font-bold opacity-60 mb-1 tracking-widest uppercase">توصيات مدير المدرسة:</p>
                <p className="text-sm font-black italic">"{lastEval.comments || 'نثمن جهودكم المهنية المتميزة، وننصح بالاستمرار على هذا النهج التطويري.'}"</p>
             </div>
          </div>
        )}

        {/* 3. المجلدات (ثالثاً) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`bg-white p-6 rounded-[2.5rem] shadow-lg border border-slate-200 transition-all ${isEvaluated ? 'ring-4 ring-slate-100' : 'hover:shadow-xl'}`}>
             <div className="flex justify-between items-center mb-4">
                <div className={`p-2 rounded-xl ${isEvaluated ? 'bg-red-50 text-red-400' : 'bg-emerald-50 text-emerald-600'}`}>
                  {isEvaluated ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">المجلد الأساسي</span>
                  {isEvaluated && <span className="text-[8px] font-bold text-red-500 mt-1">مقفل (تم التقييم)</span>}
                </div>
             </div>
             <input type="url" disabled={isEvaluated} value={driveLink} onChange={(e) => setDriveLink(e.target.value)} placeholder="رابط Google Drive..." className={`w-full p-4 border rounded-2xl outline-none font-sans text-xs dir-ltr mb-4 transition-all ${isEvaluated ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:border-[#0f4c4c]'}`} />
             {!isEvaluated && (
               <button onClick={() => handleUpdateLink(false)} disabled={saving} className="w-full bg-[#0f4c4c] text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                 <Send className="w-4 h-4" /> حفظ وتحديث الرابط
               </button>
             )}
          </div>
          <div className={`bg-white p-6 rounded-[2.5rem] shadow-xl border-2 border-emerald-500 relative overflow-hidden ${!isEvaluated ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
             <div className="flex justify-between items-center mb-4">
                <div className="bg-emerald-50 p-2 rounded-xl"><Sparkles className="text-emerald-500 w-5 h-5" /></div>
                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase tracking-tighter">تحسين الأداء</span>
             </div>
             <input type="url" value={driveLinkV2} onChange={(e) => setDriveLinkV2(e.target.value)} placeholder="رابط المجلد الجديد (بعد التحسين)..." className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-2xl outline-none font-sans text-xs dir-ltr mb-4" />
             <button onClick={() => handleUpdateLink(true)} disabled={saving} className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
               تحديث نسخة المراجعة <CheckCircle2 className="w-4 h-4" />
             </button>
          </div>
        </div>

        {/* 4. الإرسال النهائي (رابعاً - أسفل المجلدات) */}
        {!isEvaluated && (
          <div className={`bg-white p-8 rounded-[3rem] shadow-2xl border-2 transition-all flex flex-col items-center text-center gap-6 ${isReady ? 'border-emerald-500 bg-emerald-50/20' : 'border-amber-200 ring-8 ring-amber-50'}`}>
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-lg transition-all ${isReady ? 'bg-emerald-500 text-white animate-bounce' : 'bg-amber-100 text-amber-600'}`}>
              {isReady ? <CheckCircle2 className="w-10 h-10" /> : <SendHorizontal className="w-10 h-10" />}
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800">{isReady ? 'رائع! تم إشعار المدير بنجاح' : 'هل انتهيت من تجهيز شواهدك؟'}</h3>
              <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">
                {isReady 
                  ? 'ملفك الآن تحت مراجعة الإدارة، ستصلك رسالة عبر الواتساب فور رصد التقييم.' 
                  : 'بمجرد الضغط على زر الإرسال، سيتم تغيير حالتك في لوحة تحكم المدير ليبدأ بمراجعة ملفك.'}
              </p>
            </div>
            {!isReady ? (
              <button onClick={handleFinalSubmit} disabled={saving} className="bg-[#00a18e] hover:bg-[#008f7e] text-white px-12 py-5 rounded-[2rem] font-black shadow-xl transition-all flex items-center gap-3 active:scale-95 text-lg group">
                إرسال نهائي للمدير <SendHorizontal className="w-6 h-6 group-hover:translate-x-[-4px] transition-transform" />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-100 px-8 py-4 rounded-2xl font-black shadow-sm">
                <CheckCircle2 className="w-5 h-5" /> تم إرسال ملفك للاعتماد بنجاح
              </div>
            )}
          </div>
        )}

        {/* فوتر الدعم الفني وتوقيع المصمم */}
        <footer className="pt-10 pb-6 space-y-12">
           <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">تحتاج مساعدة؟</p>
              <a href="https://wa.me/966559945045?text=السلام عليكم، أحتاج مساعدة في المنصة"
                 target="_blank" 
                 rel="noreferrer" 
                 className="flex items-center gap-4 bg-[#25D366] text-white px-10 py-5 rounded-[2.5rem] font-black shadow-xl hover:bg-[#128C7E] transition-all active:scale-95 group ring-8 ring-[#25D366]/10">
                 <div className="bg-white/20 p-2 rounded-xl">
                    <PhoneCall className="w-6 h-6" />
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] opacity-80 leading-none">تواصل مباشر</p>
                    <p className="text-lg">الدعم الفني </p>
                 </div>
              </a>
           </div>

           <div className="flex flex-col items-center justify-center gap-4 pt-8 border-t border-slate-200">
              <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-full shadow-xl border border-slate-100 group hover:shadow-2xl transition-all">
                 <Palette className="w-6 h-6 text-amber-500 group-hover:rotate-12 transition-transform" />
                 <div className="text-right">
                   <p className="text-[10px] font-bold text-slate-400 leading-none mb-1 uppercase">تصميم </p>
                   <p className="text-base font-black text-slate-700">
                     الأستاذ: <span className="text-[#0f4c4c] relative">عبدالله الشهري <span className="absolute bottom-0 left-0 w-full h-1 bg-[#00a18e]/20 -rotate-1"></span></span>
                   </p>
                 </div>
                 {/* تم تغيير أيقونة القلب إلى لابتوب هنا وتغيير لونه للكهرماني */}
                 <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-amber-500">
                    <Laptop className="w-5 h-5" />
                 </div>
              </div>
              <div className="flex items-center gap-2 opacity-30">
                 <div className="h-px w-8 bg-slate-400"></div>
                 <p className="text-[8px] font-black text-slate-400 tracking-[0.3em] uppercase">ثانوية الأمير عبدالمجيد الأولى 2026</p>
                 <div className="h-px w-8 bg-slate-400"></div>
              </div>
           </div>
        </footer>

      </main>
    </div>
  );
};

export default Dashboard;
